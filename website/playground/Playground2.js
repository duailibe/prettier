import React, { useState, useMemo } from "react";
import groupBy from "lodash.groupby";

import { Button, ClipboardButton, LinkButton } from "./buttons";
import { DebugPanel, InputPanel, OutputPanel } from "./panels";
import { Sidebar, SidebarCategory } from "./sidebar/components";
import Option from "./sidebar/options";
import { Checkbox } from "./sidebar/inputs";
import usePrettierFormat from "./PrettierFormat";
import usePrettierState from "./PrettierState";
import { getCodeMirrorMode } from "./util";

const AUTOMATIC_OPTIONS = [
  "parser",
  "printWidth",
  "tabWidth",
  "useTabs",
  "semi",
  "singleQuote",
  "bracketSpacing",
  "jsxSingleQuote",
  "jsxBracketSameLine",
  "arrowParens",
  "trailingComma",
  "proseWrap",
  "htmlWhitespaceSensitivity",
  "insertPragma",
  "requirePragma"
];

const CATEGORIES = [
  "Global",
  "Common",
  "JavaScript",
  "Markdown",
  "HTML",
  "Special"
];

export default function Playground({ availableOptions }) {
  const [{ content, options }, setContent, setOption] = usePrettierState(
    availableOptions,
    AUTOMATIC_OPTIONS
  );
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const optionsByCategory = useMemo(
    () => groupBy(availableOptions, "category"),
    ["availableOptions"]
  );

  const { formatted } = usePrettierFormat(
    content,
    options,
    false,
    false,
    false
  );

  return (
    <React.Fragment>
      <div className="editors-container">
        <Sidebar visible={sidebarVisible}>
          {CATEGORIES.map(
            category =>
              optionsByCategory[category] ? (
                <SidebarCategory key={category} title={category}>
                  {optionsByCategory[category].map(
                    option =>
                      AUTOMATIC_OPTIONS.includes(option.name) ? (
                        <Option
                          key={option.name}
                          option={option}
                          value={options[option.name]}
                          onChange={setOption}
                        />
                      ) : null
                  )}
                </SidebarCategory>
              ) : null
          )}
          <SidebarCategory title="Range">
            <label>
              The selected range will be highlighted in yellow in the input
              editor
            </label>
            <Option
              option={availableOptions.rangeStart}
              value={options.rangeStart}
              onChange={setOption}
            />
            <Option
              option={availableOptions.rangeEnd}
              value={options.rangeEnd}
              onChange={setOption}
            />
          </SidebarCategory>
          <SidebarCategory title="Debug">
            <Checkbox label="show AST" checked={false} onChange={() => {}} />
            <Checkbox label="show doc" checked={false} onChange={() => {}} />
            <Checkbox
              label="show second format"
              checked={false}
              onChange={() => {}}
            />
          </SidebarCategory>
          <div className="sub-options">
            <Button onClick={() => {}}>Reset to defaults</Button>
          </div>
        </Sidebar>
        <div className="editors">
          <div className="editor">
            <InputPanel
              mode={getCodeMirrorMode(options.parser)}
              ruler={options.printWidth}
              value={content}
              codeSample="foo"
              onChange={setContent}
            />
          </div>
          <div className="editor">
            <OutputPanel
              mode={getCodeMirrorMode(options.parser)}
              ruler={options.printWidth}
              value={formatted}
            />
          </div>
        </div>
      </div>
      <div className="bottom-bar">
        <div className="bottom-bar-buttons">
          <Button onClick={() => setSidebarVisible(!sidebarVisible)}>
            {sidebarVisible ? "Hide" : "Show"} options
          </Button>
          <Button onClick={() => setContent("")}>Clear</Button>
          <ClipboardButton copy={() => JSON.stringify(options, null, 2)}>
            Copy config JSON
          </ClipboardButton>
        </div>
        <div className="bottom-bar-buttons bottom-bar-buttons-right">
          <ClipboardButton copy={window.location.href}>
            Copy link
          </ClipboardButton>
        </div>
      </div>
    </React.Fragment>
  );
}
