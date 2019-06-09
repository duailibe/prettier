import "codemirror-graphql/mode";

import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import AnimatedLogo from "@sandhose/prettier-animated-logo";

import Playground from "./Playground2";
import VersionLink from "./VersionLink";
import worker from "./worker";

function App() {
  const [loaded, setLoaded] = useState(false);
  const [props, setProps] = useState();

  useEffect(() => {
    worker.getMetadata().then(({ supportInfo, version }) => {
      setProps({
        worker,
        availableOptions: getOptionsByName(supportInfo.options),
        version: fixPrettierVersion(version)
      });
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="loading-wrapper">
        <AnimatedLogo version="wide" />
      </div>
    );
  }

  return (
    <React.Fragment>
      <VersionLink version={props.version} />
      <Playground {...props} />
    </React.Fragment>
  );
}

function fixPrettierVersion(version) {
  const match = version.match(/^\d+\.\d+\.\d+-pr.(\d+)$/);
  if (match) {
    return `pr-${match[1]}`;
  }
  return version;
}

function getOptionsByName(options) {
  const results = {};

  for (const option of options) {
    if (option.type === "path") {
      continue;
    }

    if (option.type === "boolean" && option.default === true) {
      option.inverted = true;
    }

    option.cliName =
      "--" +
      (option.inverted ? "no-" : "") +
      option.name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

    results[option.name] = option;
  }

  return results;
}

ReactDOM.render(<App />, document.getElementById("root"));
