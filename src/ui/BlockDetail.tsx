import React from "react";
import { Text } from "ink";
import type { BlockState } from "./store.ts";
import {
  headersToText,
  metaToText,
  printTitle,
  requestToText,
  responseToText,
  truncateRows,
} from "./formatters.ts";
import * as fmt from "@std/fmt/colors";
import { formatFailureDetailsText } from "./failureDetails.ts";

const MAX_BODY_LINES = 40;

type Props = {
  block: BlockState;
  truncateBody: boolean;
  truncateHeaders: boolean;
  showErrorDetail: boolean;
};

export function BlockDetail({ block, truncateBody, truncateHeaders, showErrorDetail }: Props) {
  const truncate = truncateBody
    ? (str: string) => truncateRows(str, MAX_BODY_LINES)
    : (str: string) => str;

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
          {headersToText(block.request.headers, truncateHeaders)}
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
          {headersToText(block.actualResponse.headers, truncateHeaders)}
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
          {headersToText(block.expectedResponse.headers, truncateHeaders)}
          {block.expectedResponse.body && truncate(block.expectedResponse.body)}
          {"\n"}
        </>
      )}
      {block.error && showErrorDetail && (
        <>
          {printTitle("⬇   Error    ⬇")}
          {"\n"}
          {block.description && fmt.brightRed(block.description)}
          {"\n"}
          {formatFailureDetailsText(block, { indent: "" })}
          {"\n"}
        </>
      )}
    </Text>
  );
}
