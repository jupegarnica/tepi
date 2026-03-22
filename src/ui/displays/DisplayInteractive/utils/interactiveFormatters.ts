import * as fmt from "@std/fmt/colors";
import type { BlockState } from "../../../store/store.ts";
import {
  headersToText,
  metaToText,
  ms,
  printTitle,
  requestToText,
  responseToText,
  truncateRows,
} from "../../../utils/formatters.ts";
import { formatFailureDetailsText } from "../../../utils/failureDetails.ts";
const ORANGE = 0xFF8C00;
const MAX_BODY_LINES = 40;

export function selector(isSelected: boolean): string {
  return isSelected ? fmt.rgb24("·", ORANGE) : " ";
}

export function getBlockDetailLines(block: BlockState): string[] {
  return formatBlockDetailText(block).split("\n");
}

export function formatBlockDetailText(block: BlockState): string {
  const truncate = (str: string) => truncateRows(str, MAX_BODY_LINES);
  const filePath = block.filePath;
  const startLine = block.blockLink.split(":").pop()?.trim();
  const pathInfo = `${fmt.dim("Data from:")} ${fmt.cyan(`${filePath}:${startLine}`)}`;

  let result = "\n" + pathInfo + "\n";

  if (block.meta && Object.keys(block.meta).length > 0) {
    result += printTitle("⬇   Meta    ⬇", "magenta") + "\n";
    result += metaToText(block.meta);
  }

  if (block.request) {
    result += "\n" + printTitle("⬇   Request    ⬇", "magenta") + "\n";
    result += requestToText(block.request) + "\n";
    result += headersToText(block.request.headers, true);
    if (block.request.body) result += truncate(block.request.body);
    result += "\n";
  }

  if (block.actualResponse) {
    result += printTitle("⬇   Response   ⬇", "magenta") + "\n";
    result += responseToText(block.actualResponse) + "\n";
    result += headersToText(block.actualResponse.headers, true);
    if (block.actualResponse.body) result += truncate(block.actualResponse.body);
    result += "\n";
  }

  if (block.expectedResponse) {
    result += printTitle("⬇   Expected Response   ⬇", "magenta") + "\n";
    result += responseToText(block.expectedResponse) + "\n";
    result += headersToText(block.expectedResponse.headers, true);
    if (block.expectedResponse.body) result += truncate(block.expectedResponse.body);
    result += "\n";
  }

  if (block.error) {
    result += printTitle("⬇   Error    ⬇", "magenta") + "\n";
    if (block.description) result += fmt.brightRed(block.description) + "\n";
    result += formatFailureDetailsText(block, { indent: "" }) + "\n";
  }

  return result;
}
