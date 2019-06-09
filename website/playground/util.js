export function getDefaults(availableOptions, optionNames) {
  const defaults = {};
  for (const name of optionNames) {
    defaults[name] =
      name === "parser" ? "babel" : availableOptions[name].default;
  }
  return defaults;
}

export function buildCliArgs(availableOptions, options) {
  const args = [];
  for (const option of availableOptions) {
    const value = options[option.name];

    if (typeof value === "undefined") {
      continue;
    }

    if (option.type === "boolean") {
      if ((value && !option.inverted) || (!value && option.inverted)) {
        args.push([option.cliName, true]);
      }
    } else if (value !== option.default || option.name === "rangeStart") {
      args.push([option.cliName, value]);
    }
  }
  return args;
}

export function getCodeMirrorMode(parser) {
  switch (parser) {
    case "css":
    case "less":
    case "scss":
      return "css";
    case "graphql":
      return "graphql";
    case "markdown":
      return "markdown";
    default:
      return "jsx";
  }
}

export function getIndexPosition(text, indexes) {
  indexes = indexes.slice();
  let line = 0;
  let count = 0;
  let lineStart = 0;
  const result = [];

  while (indexes.length) {
    const index = indexes.shift();

    while (count < index && count < text.length) {
      if (text[count] === "\n") {
        line++;
        lineStart = count;
      }
      count++;
    }

    result.push({ line, pos: count - lineStart });
  }

  return result;
}
