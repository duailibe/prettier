import { useReducer, useCallback, useEffect } from "react";

import { getDefaults } from "./util";
import * as urlHash from "./urlHash";

function reducer({ content, options }, action) {
  switch (action.type) {
    case "content":
      return { content: action.content, options };
    case "option":
      options = Object.assign({}, options);

      if (action.option.type === "int" && isNaN(action.value)) {
        delete options[action.option.name];
      } else {
        options[action.option.name] = action.value;
      }

      return { content, options };
  }
}

export default function usePrettierState(availableOptions, enabledOptions) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    let { content, options } = urlHash.read();

    if (!content) {
      content = "";
    }

    options = Object.assign(
      getDefaults(availableOptions, enabledOptions),
      options
    );

    return { content, options };
  });

  const setOption = useCallback((option, value) => {
    dispatch({ type: "option", option, value });
  }, []);

  const setContent = useCallback(content => {
    dispatch({ type: "content", content });
  }, []);

  useEffect(
    () => {
      urlHash.replace(state);
    },
    [state]
  );

  return [state, setContent, setOption];
}
