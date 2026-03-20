import React from "react";
import { Text } from "ink";
import type { BlockState } from "./store.ts";
import {
  DISPLAY_INDEX_FULL,
  DISPLAY_INDEX_VERBOSE,
  getDisplayIndex,
  headersToText,
  metaToText,
  printTitle,
  requestToText,
  responseToText,
  truncateRows,
} from "./formatters.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";

const MAX_BODY_LINES = 40;

type Props = {
  block: BlockState;
  globalDisplayMode: string;
};

export function BlockDetail({ block, globalDisplayMode }: Props) {
  const displayMode = block.displayMode ?? globalDisplayMode;
  const displayIndex = getDisplayIndex(displayMode);

  const showBody = displayIndex >= DISPLAY_INDEX_FULL;
  const truncate = showBody
    ? (str: string) => str
    : (str: string) => truncateRows(str, MAX_BODY_LINES);

  const filePath = block.filePath;
  const startLine = block.blockLink.split(":").pop()?.trim();
  const pathInfo = `\n${fmt.dim("Data from:")} ${fmt.cyan(`${filePath}:${startLine}`)}`;

  return (
    <Text>
      {"\n"}
      {pathInfo}
      {"\n"}
      {block.meta && Object.keys(block.meta).length > 0 && (
        <>
          {printTitle("⬇   Meta    ⬇")}
          {"\n"}
          {metaToText(block.meta)}
        </>
      )}
      {block.request && (
        <>
          {"\n"}
          {printTitle("⬇   Request    ⬇")}
          {"\n"}
          {requestToText(block.request)}
          {"\n"}
          {headersToText(block.request.headers, displayIndex)}
          {block.request.body && truncate(block.request.body)}
          {"\n"}
        </>
      )}
      {block.actualResponse && (
        <>
          {printTitle("⬇   Response   ⬇")}
          {"\n"}
          {responseToText(block.actualResponse)}
          {"\n"}
          {headersToText(block.actualResponse.headers, displayIndex)}
          {block.actualResponse.body && truncate(block.actualResponse.body)}
          {"\n"}
        </>
      )}
      {block.expectedResponse && (
        <>
          {printTitle("⬇   Expected Response   ⬇")}
          {"\n"}
          {responseToText(block.expectedResponse)}
          {"\n"}
          {headersToText(block.expectedResponse.headers, displayIndex)}
          {block.expectedResponse.body && truncate(block.expectedResponse.body)}
          {"\n"}
        </>
      )}
      {block.error && displayIndex >= DISPLAY_INDEX_VERBOSE && (
        <>
          {printTitle("⬇   Error    ⬇")}
          {"\n"}
          {block.description && fmt.brightRed(block.description)}
          {"\n"}
          {fmt.dim("At:\n")} {fmt.cyan(`${filePath}:${startLine}`)}
          {"\n"}
          {fmt.dim("Message:\n")} {fmt.bold(block.error.name)}: {fmt.white(block.error.message)}
          {block.error.cause && `\n${fmt.dim("Cause:\n")} ${fmt.dim(block.error.cause)}`}
          {"\n"}
        </>
      )}
    </Text>
  );
}
