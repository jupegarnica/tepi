import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
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
import { computeFileStats } from "../../DisplayDefault/index.ts";

const ORANGE = 0xFF8C00;
const MAX_BODY_LINES = 40;

export function selector(isSelected: boolean): string {
  return isSelected ? fmt.rgb24("·", ORANGE) : " ";
}

export function formatFileLineText(
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

export function formatBlockLineText(block: BlockState, isSelected: boolean): string {
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

export function formatBlockDetailText(block: BlockState): string {
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
