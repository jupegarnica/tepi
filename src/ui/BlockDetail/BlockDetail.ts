import type { BlockState } from "../store/store.ts";
import {
  headersToText,
  metaToText,
  printTitle,
  requestToText,
  responseToText,
  truncateRows,
} from "../utils/formatters.ts";
import * as fmt from "@std/fmt/colors";
import { formatFailureDetailsText } from "../utils/failureDetails.ts";

const MAX_BODY_LINES = 40;

type Props = {
  block: BlockState;
  truncateBody: boolean;
  truncateHeaders: boolean;
  showErrorDetail: boolean;
};

export function BlockDetail({ block, truncateBody, truncateHeaders, showErrorDetail }: Props): string {
  const truncate = truncateBody
    ? (str: string) => truncateRows(str, MAX_BODY_LINES)
    : (str: string) => str;

  const filePath = block.filePath;
  const startLine = block.blockLink.split(":").pop()?.trim();
  const pathInfo = `\n${fmt.dim("Data from:")} ${fmt.cyan(`${filePath}:${startLine}`)}`;

  const sections: string[] = [pathInfo, ""];

  if (block.meta && Object.keys(block.meta).length > 0) {
    sections.push(printTitle("⬇   Meta    ⬇"));
    sections.push(metaToText(block.meta));
  }
  if (block.request) {
    sections.push("");
    sections.push(printTitle("⬇   Request    ⬇"));
    sections.push(requestToText(block.request));
    sections.push(headersToText(block.request.headers, truncateHeaders));
    if (block.request.body) sections.push(truncate(block.request.body));
    sections.push("");
  }
  if (block.actualResponse) {
    sections.push(printTitle("⬇   Response   ⬇"));
    sections.push(responseToText(block.actualResponse));
    sections.push(headersToText(block.actualResponse.headers, truncateHeaders));
    if (block.actualResponse.body) sections.push(truncate(block.actualResponse.body));
    sections.push("");
  }
  if (block.expectedResponse) {
    sections.push(printTitle("⬇   Expected Response   ⬇"));
    sections.push(responseToText(block.expectedResponse));
    sections.push(headersToText(block.expectedResponse.headers, truncateHeaders));
    if (block.expectedResponse.body) sections.push(truncate(block.expectedResponse.body));
    sections.push("");
  }
  if (block.error && showErrorDetail) {
    sections.push(printTitle("⬇   Error    ⬇"));
    sections.push(block.description ? fmt.brightRed(block.description) : "");
    sections.push(formatFailureDetailsText(block, { indent: "" }));
    sections.push("");
  }

  return sections.join("\n");
}
