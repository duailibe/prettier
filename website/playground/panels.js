import React from "react";

import Editor from "./Editor";

export function InputPanel(props) {
  return (
    <Editor
      lineNumbers={true}
      keyMap="sublime"
      autoCloseBrackets={true}
      matchBrackets={true}
      showCursorWhenSelecting={true}
      tabSize={4}
      rulerColor="#eeeeee"
      {...props}
    />
  );
}

export function OutputPanel(props) {
  return (
    <Editor
      readOnly={true}
      lineNumbers={true}
      rulerColor="#444444"
      {...props}
    />
  );
}

export function DebugPanel({ value }) {
  return (
    <Editor readOnly={true} lineNumbers={false} mode="jsx" value={value} />
  );
}
