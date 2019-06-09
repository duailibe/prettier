import { useEffect, useState } from "react";

import worker from "./worker";

export default function usePrettierFormat(code, options, ast, doc, reformat) {
  const [state, setState] = useState({ formatted: "", debug: {} });

  useEffect(
    () => {
      worker.format(code, options, { ast, doc, reformat }).then(setState);
    },
    [code, options, ast, doc, reformat]
  );

  return state;
}
