"use strict";

const uniqBy = require("lodash.uniqby");
const path = require("path");
const resolve = require("resolve");
const findFiles = require("../utils/find-files");
const isDirectory = require("../utils/is-dir");
const thirdParty = require("./third-party");
const internalPlugins = require("./internal-plugins");
const partition = require("../utils/partition");

function loadPlugins(plugins, pluginSearchDirs) {
  if (!plugins) {
    plugins = [];
  }

  if (!pluginSearchDirs) {
    pluginSearchDirs = [];
  }
  // unless pluginSearchDirs are provided, auto-load plugins from node_modules that are parent to Prettier
  if (!pluginSearchDirs.length) {
    const autoLoadDir = thirdParty.findParentDir(__dirname, "node_modules");
    if (autoLoadDir) {
      pluginSearchDirs = [autoLoadDir];
    }
  }

  const [externalPluginNames, externalPluginInstances] = partition(
    plugins,
    plugin => typeof plugin === "string"
  );

  const externalManualLoadPluginInfos = externalPluginNames.map(pluginName => {
    let requirePath;
    try {
      // try local files
      requirePath = resolve.sync(path.resolve(process.cwd(), pluginName));
    } catch (e) {
      // try node modules
      requirePath = resolve.sync(pluginName, { basedir: process.cwd() });
    }
    return {
      name: pluginName,
      requirePath
    };
  });

  const externalAutoLoadPluginInfos = pluginSearchDirs
    .map(pluginSearchDir => {
      const resolvedPluginSearchDir = path.resolve(
        process.cwd(),
        pluginSearchDir
      );

      const nodeModulesDir = path.resolve(
        resolvedPluginSearchDir,
        "node_modules"
      );

      if (!isDirectory(nodeModulesDir)) {
        return [];
      }

      return findPluginsInNodeModules(nodeModulesDir).map(pluginName => ({
        name: pluginName,
        requirePath: resolve.sync(pluginName, {
          basedir: resolvedPluginSearchDir
        })
      }));
    })
    .reduce((a, b) => a.concat(b), []);

  const externalPlugins = uniqBy(
    externalManualLoadPluginInfos.concat(externalAutoLoadPluginInfos),
    "requirePath"
  )
    .map(externalPluginInfo =>
      Object.assign(
        { name: externalPluginInfo.name },
        eval("require")(externalPluginInfo.requirePath)
      )
    )
    .concat(externalPluginInstances);

  return internalPlugins.concat(externalPlugins);
}

function findPluginsInNodeModules(nodeModulesDir) {
  const pluginPackageJsonPaths = Array.from(
    findFiles(
      [
        "prettier-plugin-*/package.json",
        "@*/prettier-plugin-*/package.json",
        "@prettier/plugin-*/package.json"
      ],
      { cwd: nodeModulesDir }
    )
  ).map(filepath => path.relative(nodeModulesDir, filepath));
  return pluginPackageJsonPaths.map(path.dirname);
}

module.exports = loadPlugins;
