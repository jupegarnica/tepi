import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, Transform, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import * as fmt from "@std/fmt/colors";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import type { BlockState, FileState } from "../store.ts";
import { MessagesPanel } from "../MessagesPanel.tsx";
import { WatchStatus } from "../WatchStatus.tsx";
import { BlockLine } from "../BlockLine.tsx";
import {
  headersToText,
  metaToText,
  ms,
  printTitle,
  requestToText,
  responseToText,
  truncateRows,
} from "../formatters.ts";
import { formatFailureDetailsText } from "../failureDetails.ts";
import {
  computeFileStats,
  VitestSummary,
} from "./DisplayDefault.tsx";

type NavItem =
  | { type: "file"; id: string }
  | { type: "block"; id: string; fileId: string };

type InteractiveProps = CommonDisplayProps & {
  onExit: () => void;
};

const ORANGE = 0xFF8C00;
function selector(isSelected: boolean): string {
  return isSelected ? fmt.rgb24("·", ORANGE) : " ";
}

// ── String formatters for the done-state nav list ─────────────────────────────
// These produce ANSI strings (like the React components they replace) so they
// can be pre-rendered into a flat line array and sliced for the viewport.

const MAX_BODY_LINES = 40;

function formatFileLineText(
  file: FileState,
  blocks: Record<string, BlockState>,
  isSelected: boolean,
  isExpanded: boolean,
): string {
  const colors = fmt.getColorEnabled();
  const sel = selector(isSelected);
  const expandIcon = isExpanded ? "▼" : " ";
  const stats = computeFileStats(file, blocks);
  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;
  const statusIcon = hasFailures
    ? (colors ? fmt.red("✗") : "✗")
    : (colors ? fmt.green("✓") : "✓");
  return `${sel} ${expandIcon} ${statusIcon} ${file.relativePath} ${fmt.dim(`(${countStr})`)}${elapsedStr}`;
}

function formatBlockLineText(block: BlockState, isSelected: boolean): string {
  const sel = selector(isSelected);
  const elapsed = ` ${fmt.gray(ms(block.elapsedTime))}`;
  const differentFile = block.neededFrom ? fmt.dim(` needed -> ${block.neededFrom}`) : "";
  const httpStatus = block.httpStatus ? ` ${block.httpStatus}` : "";
  const desc = fmt.white(block.description);
  const link = fmt.dim(block.blockLink);

  let inner = "";
  if (block.status === "passed") {
    inner = `${fmt.green("✓")} ${link} ${desc}${fmt.bold(httpStatus)}${elapsed}${differentFile}`;
  } else if (block.status === "failed") {
    const statusText = block.httpStatus ? ` ${block.httpStatus}` : " ERR";
    inner = `${fmt.red("✘")} ${link} ${desc}${fmt.bold(statusText)}${elapsed}${differentFile}`;
  } else if (block.status === "ignored") {
    inner = `${fmt.yellow("-")} ${link} ${desc}   ${elapsed}${differentFile}`;
  } else {
    inner = `${fmt.dim("·")} ${link} ${fmt.dim(block.description)}   ${elapsed}${differentFile}`;
  }

  // 4-space indent to mirror the marginLeft={4} in running-phase rendering
  return `    ${sel} ${inner}`;
}

function formatBlockDetailText(block: BlockState): string {
  const truncate = (str: string) => truncateRows(str, MAX_BODY_LINES);
  const filePath = block.filePath;
  const startLine = block.blockLink.split(":").pop()?.trim();
  const pathInfo = `${fmt.dim("Data from:")} ${fmt.cyan(`${filePath}:${startLine}`)}`;

  let result = "\n" + pathInfo + "\n";

  if (block.meta && Object.keys(block.meta).length > 0) {
    result += printTitle("⬇   Meta    ⬇") + "\n";
    result += metaToText(block.meta);
  }

  if (block.request) {
    result += "\n" + printTitle("⬇   Request    ⬇") + "\n";
    result += requestToText(block.request) + "\n";
    result += headersToText(block.request.headers, true);
    if (block.request.body) result += truncate(block.request.body);
    result += "\n";
  }

  if (block.actualResponse) {
    result += printTitle("⬇   Response   ⬇") + "\n";
    result += responseToText(block.actualResponse) + "\n";
    result += headersToText(block.actualResponse.headers, true);
    if (block.actualResponse.body) result += truncate(block.actualResponse.body);
    result += "\n";
  }

  if (block.expectedResponse) {
    result += printTitle("⬇   Expected Response   ⬇") + "\n";
    result += responseToText(block.expectedResponse) + "\n";
    result += headersToText(block.expectedResponse.headers, true);
    if (block.expectedResponse.body) result += truncate(block.expectedResponse.body);
    result += "\n";
  }

  if (block.error) {
    result += printTitle("⬇   Error    ⬇") + "\n";
    if (block.description) result += fmt.brightRed(block.description) + "\n";
    result += formatFailureDetailsText(block, { indent: "" }) + "\n";
  }

  return result;
}

// ── InteractiveFileLine — only used during the run phase ──────────────────────

function InteractiveFileLine({
  file,
  blocks,
  isSelected,
  isExpanded,
  noAnimation,
}: {
  file: FileState;
  blocks: Record<string, BlockState>;
  isSelected: boolean;
  isExpanded: boolean;
  noAnimation?: boolean;
}) {
  const colors = fmt.getColorEnabled();
  const sel = selector(isSelected);
  const expandIcon = isExpanded ? "▼" : " ";

  if (file.status !== "done") {
    return (
      <Text>
        {`${sel} ${expandIcon} `}
        {noAnimation
          ? <Text color={colors ? "blue" : undefined}>{"…"}</Text>
          : <Text color={colors ? "blue" : undefined}><Spinner type="dots4" /></Text>}
        {` ${file.relativePath}`}
      </Text>
    );
  }

  const stats = computeFileStats(file, blocks);
  const { failed, total, elapsed, hasFailures } = stats;
  const elapsedStr = elapsed > 0 ? fmt.dim(` ${ms(elapsed)}`) : "";
  let countStr = `${total} test${total !== 1 ? "s" : ""}`;
  if (hasFailures) countStr += ` | ${failed} failed`;

  if (hasFailures) {
    return (
      <Text>
        {`${sel} ${expandIcon} `}
        <Text color={colors ? "red" : undefined}>{"✗"}</Text>
        {` ${file.relativePath} `}
        <Text dimColor>{`(${countStr})`}</Text>
        {elapsedStr}
      </Text>
    );
  }

  return (
    <Text>
      {`${sel} ${expandIcon} `}
      <Text color={colors ? "green" : undefined}>{"✓"}</Text>
      {` ${file.relativePath} `}
      <Text dimColor>{`(${countStr})`}</Text>
      {elapsedStr}
    </Text>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DisplayInteractive(props: InteractiveProps) {
  const {
    files,
    fileOrder,
    blocks,
    phase,
    messages,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    noAnimation,
    onExit,
  } = props;

  const { stdout } = useStdout();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  // Reset navigation state when a new run starts
  useEffect(() => {
    if (phase !== "done") {
      setSelectedIndex(0);
      setExpandedFiles(new Set());
      setExpandedBlocks(new Set());
    }
  }, [phase]);

  // Flat list of navigable items (drives keyboard index)
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    for (const fileId of fileOrder) {
      const file = files[fileId];
      if (!file) continue;
      items.push({ type: "file", id: fileId });
      if (expandedFiles.has(fileId)) {
        for (const blockId of file.blockIds) {
          const block = blocks[blockId];
          if (!block || block.isFirstBlock) continue;
          items.push({ type: "block", id: blockId, fileId });
        }
      }
    }
    return items;
  }, [fileOrder, files, blocks, expandedFiles]);

  // Clamp selectedIndex when nav list shrinks
  useEffect(() => {
    if (navItems.length > 0 && selectedIndex >= navItems.length) {
      setSelectedIndex(navItems.length - 1);
    }
  }, [navItems.length, selectedIndex]);

  // Pre-render all nav items to a flat string-line array.
  // Tracks which output line the selected item starts on so the viewport
  // can be centered on it regardless of how tall expanded items are.
  const { allLines, selectedLineStart } = useMemo(() => {
    const lines: string[] = [];
    let selLine = 0;

    for (let idx = 0; idx < navItems.length; idx++) {
      const item = navItems[idx];
      if (!item) continue;
      const isItemSelected = idx === selectedIndex;

      if (idx === selectedIndex) selLine = lines.length;

      if (item.type === "file") {
        const file = files[item.id];
        if (!file) continue;
        lines.push(formatFileLineText(file, blocks, isItemSelected, expandedFiles.has(item.id)));
      } else {
        const block = blocks[item.id];
        if (!block) continue;
        lines.push(formatBlockLineText(block, isItemSelected));
        if (expandedBlocks.has(item.id)) {
          const detail = formatBlockDetailText(block);
          for (const l of detail.split("\n")) {
            lines.push(`        ${l}`); // extra indent for detail
          }
        }
      }
    }

    return { allLines: lines, selectedLineStart: selLine };
  }, [navItems, selectedIndex, expandedFiles, expandedBlocks, files, blocks]);

  // Line-based viewport: always keep selected line centered
  const terminalRows = stdout?.rows ?? 24;
  const viewportHeight = Math.max(5, terminalRows - 8);
  const viewportStart = Math.max(
    0,
    Math.min(
      selectedLineStart - Math.floor(viewportHeight / 2),
      Math.max(0, allLines.length - viewportHeight),
    ),
  );
  const visibleLines = allLines.slice(viewportStart, viewportStart + viewportHeight);
  const aboveCount = viewportStart;
  const belowCount = Math.max(0, allLines.length - viewportStart - viewportHeight);

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onExit();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(navItems.length - 1, i + 1));
        return;
      }
      if (key.return || input === " ") {
        // Enter/Space: toggle expand/collapse in place
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          if (expandedFiles.has(item.id)) {
            setExpandedFiles((s) => { const n = new Set(s); n.delete(item.id); return n; });
          } else {
            setExpandedFiles((s) => new Set(s).add(item.id));
          }
        } else {
          if (expandedBlocks.has(item.id)) {
            setExpandedBlocks((s) => { const n = new Set(s); n.delete(item.id); return n; });
          } else {
            setExpandedBlocks((s) => new Set(s).add(item.id));
          }
        }
        return;
      }
      if (key.rightArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          // Expand and move focus to first child block
          setExpandedFiles((s) => new Set(s).add(item.id));
          const file = files[item.id];
          const hasChildren = file?.blockIds.some((bid) => {
            const b = blocks[bid];
            return b && !b.isFirstBlock;
          }) ?? false;
          if (hasChildren) {
            setSelectedIndex(selectedIndex + 1);
          }
        } else {
          // Expand block detail
          setExpandedBlocks((s) => new Set(s).add(item.id));
        }
        return;
      }
      if (key.leftArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          // Collapse file
          setExpandedFiles((s) => {
            const next = new Set(s);
            next.delete(item.id);
            return next;
          });
        } else {
          // Collapse block detail and move focus back to parent file
          setExpandedBlocks((s) => {
            const next = new Set(s);
            next.delete(item.id);
            return next;
          });
          for (let i = selectedIndex - 1; i >= 0; i--) {
            const n = navItems[i];
            if (n && n.type === "file" && n.id === item.fileId) {
              setSelectedIndex(i);
              break;
            }
          }
        }
        return;
      }
    },
    { isActive: phase === "done" },
  );

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />

      {/* During run: React-component rendering (same as default display) */}
      {phase !== "done" && fileOrder.map((id) => {
        const file = files[id];
        if (!file) return null;

        if (file.status === "done") {
          return (
            <InteractiveFileLine
              key={id}
              file={file}
              blocks={blocks}
              isSelected={false}
              isExpanded={false}
              noAnimation={noAnimation}
            />
          );
        }

        if (noAnimation) return null;

        if (file.status === "running") {
          return (
            <Box key={id} flexDirection="column">
              <InteractiveFileLine
                file={file}
                blocks={blocks}
                isSelected={false}
                isExpanded={false}
                noAnimation={noAnimation}
              />
              <Box flexDirection="column" marginLeft={6}>
                {file.blockIds
                  .map((bid) => blocks[bid])
                  .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                  .map((b) => (
                    <BlockLine key={b.id} block={b} noAnimation={false} />
                  ))}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={id} flexDirection="column">
            <Text dimColor>{`  · ${file.relativePath}`}</Text>
            <Box flexDirection="column" marginLeft={6}>
              {file.blockIds
                .map((bid) => blocks[bid])
                .filter((b): b is BlockState => !!b && !b.isFirstBlock)
                .map((b) => (
                  <BlockLine key={b.id} block={b} noAnimation={false} />
                ))}
            </Box>
          </Box>
        );
      })}

      {/* After done: line-based viewport via pre-rendered strings + Transform */}
      {phase === "done" && (
        <>
          {aboveCount > 0 && (
            <Text dimColor>{`  ↑ ${aboveCount} more`}</Text>
          )}
          <Transform transform={(line) => line}>
            <Text>{visibleLines.join("\n")}</Text>
          </Transform>
          {belowCount > 0 && (
            <Text dimColor>{`  ↓ ${belowCount} more`}</Text>
          )}
        </>
      )}

      {phase === "done" && (
        <>
          <VitestSummary
            fileOrder={fileOrder}
            files={files}
            blocks={blocks}
            startTime={startTime}
            endTime={endTime}
            actualThreadsUsed={actualThreadsUsed}
            exitCode={exitCode}
          />
          <Text dimColor>{"  ↑↓ navigate  → open/focus child  ← close/back to parent  Enter/Space toggle  q/Esc exit"}</Text>
        </>
      )}

      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </Box>
  );
}
