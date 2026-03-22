import * as fmt from "@std/fmt/colors";
import { format } from "@wilcosp/ms-relative";
import type {
  SerializedHeaders,
  SerializedRequest,
  SerializedResponse,
} from "../store/store.ts";

// Display mode constants
export const DISPLAYS = [
  "none", // 0
  "minimal", // 1
  "default", // 2
  "truncate", // 3
  "full", // 4
  "verbose", // 5
  "tap", // 6
  "dots", // 7
  "interactive", // 8
];

export const DISPLAY_INDEX_NONE = 0;
export const DISPLAY_INDEX_MINIMAL = 1;
export const DISPLAY_INDEX_DEFAULT = 2;
export const DISPLAY_INDEX_TRUNCATE = 3;
export const DISPLAY_INDEX_FULL = 4;
export const DISPLAY_INDEX_VERBOSE = 5;
export const DISPLAY_INDEX_TAP = 6;
export const DISPLAY_INDEX_DOTS = 7;
export const DISPLAY_INDEX_INTERACTIVE = 8;

export function getDisplayIndex(displayMode: string): number {
  const index = DISPLAYS.indexOf(displayMode);
  if (index === -1) return Infinity;
  return index;
}

export function ms(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  return format(milliseconds, { style: "long", locale: "en-US" });
}

export function consoleSize(): { rows: number; columns: number } {
  try {
    const columns = process.stdout.columns || 150;
    const rows = process.stdout.rows || 150;
    return { columns, rows };
  } catch {
    return { columns: 150, rows: 150 };
  }
}

export function truncateCols(str: string, maxLength: number): string {
  if (str.length > maxLength) {
    return `${str.slice(0, maxLength - 3)}...`;
  }
  return str;
}

export function truncateRows(str: string, maxLength: number): string {
  const lines = str.split("\n");
  if (lines.length > maxLength) {
    return lines.slice(0, maxLength - 3).join("\n") + fmt.bold("\n.\n.\n.");
  }
  return str;
}

export function requestToText(request: SerializedRequest): string {
  return `${fmt.brightWhite(`${fmt.yellow(request.method)} ${request.url}`)}`;
}

export function responseToText(response: SerializedResponse): string {
  const statusColor =
    response.status >= 200 && response.status < 300
      ? fmt.green
      : response.status >= 300 && response.status < 400
        ? fmt.yellow
        : response.status >= 400 && response.status < 500
          ? fmt.red
          : fmt.bgRed;

  const status = statusColor(String(response.status));
  const statusText = response.statusText;

  return `${fmt.dim(`HTTP/1.1`)} ${fmt.bold(`${status} ${statusText}`)}`;
}

export function headersToText(
  headers: SerializedHeaders,
  truncateHeaders: boolean,
): string {
  const halfWidth = -5 + consoleSize().columns / 2;
  let maxLengthKey = 0;
  const truncateAt = halfWidth;

  let result = "";
  let truncate = truncateCols;

  if (!truncateHeaders) {
    truncate = (str: string, _: number) => str;
  }

  for (const [key] of headers) {
    maxLengthKey = Math.max(maxLengthKey, truncate(key, truncateAt).length);
  }
  for (const [key, value] of headers) {
    result += `${fmt.gray(
      `${truncate(key, truncateAt)}:`.padEnd(maxLengthKey + 1),
    )} ${fmt.dim(truncate(value, truncateAt))}\n`;
  }

  return result;
}

export function metaToText(meta: Record<string, unknown>): string {
  let output = "";
  let maxLengthKey = 0;
  for (const key in meta) {
    if (key.length > maxLengthKey) {
      maxLengthKey = key.length;
    }
  }
  for (const key in meta) {
    const _key = key + ":";
    output += fmt.dim(`${_key.padEnd(maxLengthKey + 3)} ${meta[key]}\n`);
  }
  return output;
}

type FmtMethod = keyof typeof fmt;

export function printTitle(
  title: string,
  fmtMethod: FmtMethod = "gray",
): string {
  const consoleWidth = consoleSize().columns;
  // @ts-ignore - fmtMethod is a key of fmt
  const titleStr = fmt[fmtMethod](` ${title} `, undefined) as string;
  let padLength = 2 + Math.floor((consoleWidth - titleStr.length) / 2);
  padLength = padLength < 0 ? 0 : padLength;
  // @ts-ignore - fmtMethod is a key of fmt
  const separator = fmt[fmtMethod]("-", undefined) as string;
  return `${separator.repeat(5)} ${titleStr} ${separator.repeat(padLength)}`;
}
