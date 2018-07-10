"use strict";

// @ts-ignore
const { getStringWidth } = require("../common/util");
const { concat, fill, cursor } = require("./doc-builders");

/** @type {{[id: string]: docPrinter.PrintMode}} */
let groupModeMap;

const MODE_BREAK = 1;
const MODE_FLAT = 2;

/** @return {docPrinter.Indentation} */
function rootIndent() {
  return { value: "", length: 0, queue: [] };
}

/**
  @param {docPrinter.Indentation} ind
  @param {docPrinter.PrintOptions} options
*/
function makeIndent(ind, options) {
  return generateInd(ind, { type: "indent" }, options);
}

/**
  @param {docPrinter.Indentation} ind
  @param {doc.Alignment} n
  @param {docPrinter.PrintOptions} options
*/
function makeAlign(ind, n, options) {
  if (typeof n === "string") {
    return generateInd(ind, { type: "stringAlign", n }, options);
  }

  if (typeof n === "number") {
    return n === -Infinity
      ? ind.root || rootIndent()
      : n < 0
        ? generateInd(ind, { type: "dedent" }, options)
        : n > 0
          ? generateInd(ind, { type: "numberAlign", n }, options)
          : ind;
  }

  if (n.type === "root") {
    return Object.assign({}, ind, { root: ind });
  }
}

/**
  @param {docPrinter.Indentation} ind
  @param {docPrinter.Alignment} newPart
  @param {docPrinter.PrintOptions} options
*/
function generateInd(ind, newPart, options) {
  const queue =
    newPart.type === "dedent"
      ? ind.queue.slice(0, -1)
      : ind.queue.concat(newPart);

  let value = "";
  let length = 0;
  let lastTabs = 0;
  let lastSpaces = 0;

  for (const part of queue) {
    switch (part.type) {
      case "indent":
        flush();
        if (options.useTabs) {
          addTabs(1);
        } else {
          addSpaces(options.tabWidth);
        }
        break;
      case "stringAlign":
        flush();
        value += part.n;
        length += part.n.length;
        break;
      case "numberAlign":
        lastTabs += 1;
        lastSpaces += part.n;
        break;
      /* istanbul ignore next */
      default:
        throw new Error(`Unexpected type '${part.type}'`);
    }
  }

  flushSpaces();

  return Object.assign({}, ind, { value, length, queue });

  /** @param {number} count */
  function addTabs(count) {
    value += "\t".repeat(count);
    length += options.tabWidth * count;
  }

  /** @param {number} count */
  function addSpaces(count) {
    value += " ".repeat(count);
    length += count;
  }

  function flush() {
    if (options.useTabs) {
      flushTabs();
    } else {
      flushSpaces();
    }
  }

  function flushTabs() {
    if (lastTabs > 0) {
      addTabs(lastTabs);
    }
    resetLast();
  }

  function flushSpaces() {
    if (lastSpaces > 0) {
      addSpaces(lastSpaces);
    }
    resetLast();
  }

  function resetLast() {
    lastTabs = 0;
    lastSpaces = 0;
  }
}

/**
  @param {docPrinter.Command} next
  @param {docPrinter.Command[]} restCommands
  @param {number} width
  @param {docPrinter.PrintOptions} options
  @param {boolean} [mustBeFlat]
*/
function fits(next, restCommands, width, options, mustBeFlat) {
  let restIdx = restCommands.length;
  const cmds = [next];
  while (width >= 0) {
    if (cmds.length === 0) {
      if (restIdx === 0) {
        return true;
      }
      cmds.push(restCommands[restIdx - 1]);

      restIdx--;

      continue;
    }

    const x = cmds.pop();
    const ind = x[0];
    const mode = x[1];
    const doc = x[2];

    if (typeof doc === "string") {
      width -= getStringWidth(doc);
    } else {
      switch (doc.type) {
        case "concat":
          for (let i = doc.parts.length - 1; i >= 0; i--) {
            cmds.push([ind, mode, doc.parts[i]]);
          }

          break;
        case "indent":
          cmds.push([makeIndent(ind, options), mode, doc.contents]);

          break;
        case "align":
          cmds.push([makeAlign(ind, doc.n, options), mode, doc.contents]);

          break;
        case "group":
          if (mustBeFlat && doc.break) {
            return false;
          }
          cmds.push([ind, doc.break ? MODE_BREAK : mode, doc.contents]);

          if (doc.id) {
            groupModeMap[doc.id] = cmds[cmds.length - 1][1];
          }
          break;
        case "fill":
          for (let i = doc.parts.length - 1; i >= 0; i--) {
            cmds.push([ind, mode, doc.parts[i]]);
          }

          break;
        case "if-break": {
          const groupMode = doc.groupId ? groupModeMap[doc.groupId] : mode;
          if (groupMode === MODE_BREAK) {
            if (doc.breakContents) {
              cmds.push([ind, mode, doc.breakContents]);
            }
          }
          if (groupMode === MODE_FLAT) {
            if (doc.flatContents) {
              cmds.push([ind, mode, doc.flatContents]);
            }
          }

          break;
        }
        case "line":
          switch (mode) {
            // fallthrough
            case MODE_FLAT:
              if (!doc.hard) {
                if (!doc.soft) {
                  width -= 1;
                }

                break;
              }
              return true;

            case MODE_BREAK:
              return true;
          }
          break;
      }
    }
  }
  return false;
}

/**
  @param {doc.Doc} doc
  @param {docPrinter.PrintOptions} options
*/
function printDocToString(doc, options) {
  groupModeMap = {};

  const width = options.printWidth;
  const newLine = options.newLine || "\n";
  let pos = 0;
  // cmds is basically a stack. We've turned a recursive call into a
  // while loop which is much faster. The while loop below adds new
  // cmds to the array instead of recursively calling `print`.
  /** @type docPrinter.Command[] */
  const cmds = [[rootIndent(), MODE_BREAK, doc]];
  /** @type {(string | Symbol)[]} */
  const out = [];
  let shouldRemeasure = false;
  let lineSuffix = [];

  while (cmds.length !== 0) {
    const x = cmds.pop();
    const ind = x[0];
    const mode = x[1];
    const doc = x[2];

    if (typeof doc === "string") {
      out.push(doc);

      pos += getStringWidth(doc);
    } else {
      switch (doc.type) {
        case "cursor":
          out.push(cursor.placeholder);

          break;
        case "concat":
          for (let i = doc.parts.length - 1; i >= 0; i--) {
            cmds.push([ind, mode, doc.parts[i]]);
          }

          break;
        case "indent":
          cmds.push([makeIndent(ind, options), mode, doc.contents]);

          break;
        case "align":
          cmds.push([makeAlign(ind, doc.n, options), mode, doc.contents]);

          break;
        case "group":
          switch (mode) {
            case MODE_FLAT:
              if (!shouldRemeasure) {
                cmds.push([
                  ind,
                  doc.break ? MODE_BREAK : MODE_FLAT,
                  doc.contents
                ]);

                break;
              }
            // fallthrough

            case MODE_BREAK: {
              shouldRemeasure = false;

              /** @type docPrinter.Command */
              const next = [ind, MODE_FLAT, doc.contents];
              const rem = width - pos;

              if (!doc.break && fits(next, cmds, rem, options)) {
                cmds.push(next);
              } else {
                // Expanded states are a rare case where a document
                // can manually provide multiple representations of
                // itself. It provides an array of documents
                // going from the least expanded (most flattened)
                // representation first to the most expanded. If a
                // group has these, we need to manually go through
                // these states and find the first one that fits.
                if (doc.expandedStates) {
                  const mostExpanded =
                    doc.expandedStates[doc.expandedStates.length - 1];

                  if (doc.break) {
                    cmds.push([ind, MODE_BREAK, mostExpanded]);

                    break;
                  } else {
                    for (let i = 1; i < doc.expandedStates.length + 1; i++) {
                      if (i >= doc.expandedStates.length) {
                        cmds.push([ind, MODE_BREAK, mostExpanded]);

                        break;
                      } else {
                        const state = doc.expandedStates[i];
                        /** @type docPrinter.Command */
                        const cmd = [ind, MODE_FLAT, state];

                        if (fits(cmd, cmds, rem, options)) {
                          cmds.push(cmd);

                          break;
                        }
                      }
                    }
                  }
                } else {
                  cmds.push([ind, MODE_BREAK, doc.contents]);
                }
              }

              break;
            }
          }

          if (doc.id) {
            groupModeMap[doc.id] = cmds[cmds.length - 1][1];
          }
          break;
        // Fills each line with as much code as possible before moving to a new
        // line with the same indentation.
        //
        // Expects doc.parts to be an array of alternating content and
        // whitespace. The whitespace contains the linebreaks.
        //
        // For example:
        //   ["I", line, "love", line, "monkeys"]
        // or
        //   [{ type: group, ... }, softline, { type: group, ... }]
        //
        // It uses this parts structure to handle three main layout cases:
        // * The first two content items fit on the same line without
        //   breaking
        //   -> output the first content item and the whitespace "flat".
        // * Only the first content item fits on the line without breaking
        //   -> output the first content item "flat" and the whitespace with
        //   "break".
        // * Neither content item fits on the line without breaking
        //   -> output the first content item and the whitespace with "break".
        case "fill": {
          const rem = width - pos;

          const parts = doc.parts;
          if (parts.length === 0) {
            break;
          }

          const content = parts[0];
          /** @type docPrinter.Command */
          const contentFlatCmd = [ind, MODE_FLAT, content];
          /** @type docPrinter.Command */
          const contentBreakCmd = [ind, MODE_BREAK, content];
          const contentFits = fits(contentFlatCmd, [], rem, options, true);

          if (parts.length === 1) {
            if (contentFits) {
              cmds.push(contentFlatCmd);
            } else {
              cmds.push(contentBreakCmd);
            }
            break;
          }

          const whitespace = parts[1];
          /** @type docPrinter.Command */
          const whitespaceFlatCmd = [ind, MODE_FLAT, whitespace];
          /** @type docPrinter.Command */
          const whitespaceBreakCmd = [ind, MODE_BREAK, whitespace];

          if (parts.length === 2) {
            if (contentFits) {
              cmds.push(whitespaceFlatCmd);
              cmds.push(contentFlatCmd);
            } else {
              cmds.push(whitespaceBreakCmd);
              cmds.push(contentBreakCmd);
            }
            break;
          }

          // At this point we've handled the first pair (context, separator)
          // and will create a new fill doc for the rest of the content.
          // Ideally we wouldn't mutate the array here but coping all the
          // elements to a new array would make this algorithm quadratic,
          // which is unusable for large arrays (e.g. large texts in JSX).
          parts.splice(0, 2);
          /** @type docPrinter.Command */
          const remainingCmd = [ind, mode, fill(parts)];

          const secondContent = parts[0];

          /** @type docPrinter.Command */
          const firstAndSecondContentFlatCmd = [
            ind,
            MODE_FLAT,
            concat([content, whitespace, secondContent])
          ];
          const firstAndSecondContentFits = fits(
            firstAndSecondContentFlatCmd,
            [],
            rem,
            options,
            true
          );

          if (firstAndSecondContentFits) {
            cmds.push(remainingCmd);
            cmds.push(whitespaceFlatCmd);
            cmds.push(contentFlatCmd);
          } else if (contentFits) {
            cmds.push(remainingCmd);
            cmds.push(whitespaceBreakCmd);
            cmds.push(contentFlatCmd);
          } else {
            cmds.push(remainingCmd);
            cmds.push(whitespaceBreakCmd);
            cmds.push(contentBreakCmd);
          }
          break;
        }
        case "if-break": {
          const groupMode = doc.groupId ? groupModeMap[doc.groupId] : mode;
          if (groupMode === MODE_BREAK) {
            if (doc.breakContents) {
              cmds.push([ind, mode, doc.breakContents]);
            }
          }
          if (groupMode === MODE_FLAT) {
            if (doc.flatContents) {
              cmds.push([ind, mode, doc.flatContents]);
            }
          }

          break;
        }
        case "line-suffix":
          lineSuffix.push([ind, mode, doc.contents]);
          break;
        case "line-suffix-boundary":
          if (lineSuffix.length > 0) {
            cmds.push([ind, mode, { type: "line", hard: true }]);
          }
          break;
        case "line":
          switch (mode) {
            case MODE_FLAT:
              if (!doc.hard) {
                if (!doc.soft) {
                  out.push(" ");

                  pos += 1;
                }

                break;
              } else {
                // This line was forced into the output even if we
                // were in flattened mode, so we need to tell the next
                // group that no matter what, it needs to remeasure
                // because the previous measurement didn't accurately
                // capture the entire expression (this is necessary
                // for nested groups)
                shouldRemeasure = true;
              }
            // fallthrough

            case MODE_BREAK:
              if (lineSuffix.length) {
                cmds.push([ind, mode, doc]);
                [].push.apply(cmds, lineSuffix.reverse());
                lineSuffix = [];
                break;
              }

              if (doc.literal) {
                if (ind.root) {
                  out.push(newLine, ind.root.value);
                  pos = ind.root.length;
                } else {
                  out.push(newLine);
                  pos = 0;
                }
              } else {
                if (out.length > 0) {
                  // Trim whitespace at the end of line
                  while (out.length > 0) {
                    const part = out[out.length - 1];
                    if (typeof part === "string" && part.match(/^[^\S\n]*$/)) {
                      out.pop();
                    } else {
                      break;
                    }
                  }

                  if (out.length) {
                    const part = out[out.length - 1];
                    if (typeof part === "string") {
                      out[out.length - 1] = part.replace(/[^\S\n]*$/, "");
                    }
                  }
                }

                out.push(newLine + ind.value);
                pos = ind.length;
              }
              break;
          }
          break;
        default:
      }
    }
  }

  const cursorPlaceholderIndex = out.indexOf(cursor.placeholder);
  if (cursorPlaceholderIndex !== -1) {
    const otherCursorPlaceholderIndex = out.indexOf(
      cursor.placeholder,
      cursorPlaceholderIndex + 1
    );
    const beforeCursor = out.slice(0, cursorPlaceholderIndex).join("");
    const aroundCursor = out
      .slice(cursorPlaceholderIndex + 1, otherCursorPlaceholderIndex)
      .join("");
    const afterCursor = out.slice(otherCursorPlaceholderIndex + 1).join("");

    return {
      formatted: beforeCursor + aroundCursor + afterCursor,
      cursorNodeStart: beforeCursor.length,
      cursorNodeText: aroundCursor
    };
  }

  return { formatted: out.join("") };
}

module.exports = { printDocToString };
