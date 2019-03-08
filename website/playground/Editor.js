import CodeMirror from "codemirror";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { getIndexPosition } from "./util";

export default function CodeMirrorEditor(props) {
  const _textarea = useRef();
  const _codeMirror = useRef();

  useLayoutEffect(() => {
    const options = Object.assign({}, props);
    delete options.ruler;
    delete options.rulerColor;
    delete options.value;
    delete options.onChange;

    const cm = CodeMirror.fromTextArea(_textarea.current, options);
    cm.on("change", (doc, change) => {
      if (change.origin !== "setValue") {
        props.onChange(doc.getValue());
      }
    });
    cm.on("focus", () => {
      if (cm.getValue() === props.codeSample) {
        cm.execCommand("selectAll");
      }
    });

    _codeMirror.current = cm;

    return function() {
      cm.toTextArea();
    };
  }, []);

  useLayoutEffect(
    () => {
      if (props.value !== _codeMirror.current.getValue()) {
        _codeMirror.current.setValue(props.value);
      }
    },
    [props.value]
  );

  useEffect(
    () => {
      _codeMirror.current.setOption("mode", props.mode);
    },
    [props.mode]
  );

  useEffect(
    () => {
      _codeMirror.current.setOption("rulers", [
        { column: props.ruler, color: props.rulerColor }
      ]);
    },
    [props.ruler]
  );

  useLayoutEffect(
    () => {
      if (
        props.overlayStart != null &&
        props.overlayEnd != null &&
        props.overlayStart < props.overlayEnd
      ) {
        const [start, end] = getIndexPosition(props.value, [
          props.overlayStart,
          props.overlayEnd
        ]);
        const overlay = createOverlay(start, end);

        _codeMirror.current.addOverlay(overlay);
        return function() {
          _codeMirror.current.removeOverlay(overlay);
        };
      }
    },
    [props.value.substring(props.overlayStart || 0, props.overlayEnd || 0)]
  );

  return <textarea ref={_textarea} />;
}

function createOverlay(start, end) {
  return {
    token(stream) {
      const line = stream.lineOracle.line;

      if (line < start.line || line > end.line) {
        stream.skipToEnd();
      } else if (line === start.line && stream.pos < start.pos) {
        stream.pos = start.pos;
      } else if (line === end.line) {
        if (stream.pos < end.pos) {
          stream.pos = end.pos;
          return "searching";
        }
        stream.skipToEnd();
      } else {
        stream.skipToEnd();
        return "searching";
      }
    }
  };
}
