type Doc = doc.Doc;

declare namespace doc {
  type Doc =
    | string
    | { type: "align"; contents: Doc; n: Alignment }
    | { type: "indent"; contents: Doc }
    | Group
    | { type: "concat" | "fill"; parts: Doc[] }
    | {
        type: "if-break";
        breakContents: Doc;
        flatContents: Doc;
        groupId: GroupId;
      }
    | { type: "line-suffix" | "indent"; contents: Doc }
    | { type: "line"; soft?: boolean; hard?: boolean; literal?: boolean }
    | { type: "break-parent" | "line-suffix-boundary" }
    | { type: "cursor"; placeholder: Symbol };

  type Alignment = string | number | { type: "root" };

  type GroupId = string;
  type GroupOpts = {
    id?: GroupId;
    shouldBreak?: boolean;
    expandedStates?: Doc[];
  };
  type Group = {
    type: "group";
    id: GroupId;
    contents: Doc;
    break: boolean;
    expandedStates: Doc[];
  };
}

declare namespace docPrinter {
  type Alignment =
    | { type: "indent" | "dedent" }
    | { type: "root"; root: Indentation }
    | { type: "numberAlign"; n: number }
    | { type: "stringAlign"; n: string };

  type Indentation = {
    value: string;
    length: number;
    queue: Alignment[];
    root?: Indentation;
  };

  type PrintOptions = {
    useTabs?: boolean;
    tabWidth: number;
    printWidth: number;
    newLine?: string;
  };

  type PrintMode = 1 | 2;

  type Command = [Indentation, PrintMode, doc.Doc];
}
