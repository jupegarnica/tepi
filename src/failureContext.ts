import { inspect } from "node:util";
import { isRequestStartLine } from "./parser.ts";
import type { Block } from "./types.ts";

export type FailureKind =
  | "status"
  | "statusText"
  | "header"
  | "body"
  | "parseRequest"
  | "parseResponse"
  | "request"
  | "response"
  | "other";

export type FailureComparison = {
  label: string;
  expected?: string;
  actual?: string;
};

export type FailureContext = {
  kind: FailureKind;
  highlightLine: number;
  comparison?: FailureComparison;
};

function splitSourceLines(text: string): string[] {
  const lines = text.replaceAll("\r", "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function isHeaderLine(line: string): boolean {
  return /^[^:]+:\s*.+$/.test(line.trim());
}

function toAbsoluteLine(block: Block, localIndex: number): number {
  return (block.meta._startLine ?? 0) + localIndex + 1;
}

function firstNonEmptyLine(lines: string[]): number {
  const index = lines.findIndex((line) => line.trim().length > 0);
  return index === -1 ? 0 : index;
}

function findRequestStartLine(lines: string[]): number {
  const index = lines.findIndex(isRequestStartLine);
  return index === -1 ? firstNonEmptyLine(lines) : index;
}

function findResponseStartLine(lines: string[]): number {
  const index = lines.findIndex((line) => line.trim().startsWith("HTTP/"));
  return index === -1 ? firstNonEmptyLine(lines) : index;
}

function findFirstTemplateLine(lines: string[], startIndex = 0): number | undefined {
  for (let index = startIndex; index < lines.length; index++) {
    if (lines[index].includes("<%")) {
      return index;
    }
  }
  return undefined;
}

function findResponseBodyLine(lines: string[], responseStartLine: number): number {
  let inHeaders = true;
  for (let index = responseStartLine + 1; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("###")) {
      break;
    }
    if (inHeaders && isHeaderLine(lines[index])) {
      continue;
    }
    if (inHeaders && trimmed === "") {
      inHeaders = false;
      continue;
    }
    if (!inHeaders && trimmed !== "") {
      return index;
    }
  }
  return responseStartLine;
}

function findHeaderLine(
  lines: string[],
  responseStartLine: number,
  headerName: string,
): number {
  const normalizedHeader = `${headerName.toLowerCase()}:`;
  for (let index = responseStartLine + 1; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed === "") {
      break;
    }
    if (trimmed.toLowerCase().startsWith(normalizedHeader)) {
      return index;
    }
  }
  return responseStartLine;
}

function summarizeValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    const compact = value.replaceAll(/\s+/g, " ").trim();
    return JSON.stringify(compact.length > 120 ? `${compact.slice(0, 117)}...` : compact);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }

  try {
    const json = JSON.stringify(value);
    if (json) {
      return json.length > 120 ? `${json.slice(0, 117)}...` : json;
    }
  } catch {
    // Fall back to inspect below.
  }

  const inspected = inspect(value, { depth: 4, breakLength: Infinity, sorted: true });
  return inspected.length > 120 ? `${inspected.slice(0, 117)}...` : inspected;
}

function inferFailureKind(message: string): FailureKind {
  if (message.includes("Invalid URL:")) return "request";
  if (message.startsWith("Error while parsing request:")) return "parseRequest";
  if (message.startsWith("Error while parsing response:")) return "parseResponse";
  if (message.startsWith("Status code mismatch")) return "status";
  if (message.startsWith("Status text mismatch")) return "statusText";
  if (message.startsWith("Header mismatch")) return "header";
  if (message.startsWith("Body mismatch")) return "body";
  return "other";
}

function deriveHeaderComparison(block: Block): FailureComparison | undefined {
  if (!block.expectedResponse || !block.actualResponse) return undefined;

  for (const [key, value] of block.expectedResponse.headers.entries()) {
    const actualValue = block.actualResponse.headers.get(key)?.replace("; ", ";");
    if (actualValue !== value) {
      return {
        label: `Header ${key}`,
        expected: summarizeValue(value),
        actual: summarizeValue(actualValue),
      };
    }
  }

  return undefined;
}

function deriveBodyComparison(block: Block): FailureComparison | undefined {
  if (!block.expectedResponse || !block.actualResponse) return undefined;

  return {
    label: "Body",
    expected: summarizeValue(block.expectedResponse.bodyExtracted),
    actual: summarizeValue(block.actualResponse.bodyExtracted),
  };
}

export function deriveFailureContext(block: Block, error: Error): FailureContext {
  const lines = splitSourceLines(block.text);
  const requestStartLine = findRequestStartLine(lines);
  const responseStartLine = findResponseStartLine(lines);
  const inferredKind = inferFailureKind(error.message);
  const kind = inferredKind === "other" && block.request && !block.actualResponse
    ? "request"
    : inferredKind;

  if (kind === "status") {
    return {
      kind,
      highlightLine: toAbsoluteLine(block, responseStartLine),
      comparison: {
        label: "Status",
        expected: summarizeValue(block.expectedResponse?.status),
        actual: summarizeValue(block.actualResponse?.status),
      },
    };
  }

  if (kind === "statusText") {
    return {
      kind,
      highlightLine: toAbsoluteLine(block, responseStartLine),
      comparison: {
        label: "Status text",
        expected: summarizeValue(block.expectedResponse?.statusText),
        actual: summarizeValue(block.actualResponse?.statusText),
      },
    };
  }

  if (kind === "header") {
    const comparison = deriveHeaderComparison(block);
    const headerName = comparison?.label.replace(/^Header\s+/, "");
    const headerLine = headerName
      ? findHeaderLine(lines, responseStartLine, headerName)
      : responseStartLine;

    return {
      kind,
      highlightLine: toAbsoluteLine(block, headerLine),
      comparison,
    };
  }

  if (kind === "body") {
    const templateLine = findFirstTemplateLine(lines, responseStartLine);
    const bodyLine = templateLine ?? findResponseBodyLine(lines, responseStartLine);
    return {
      kind,
      highlightLine: toAbsoluteLine(block, bodyLine),
      comparison: deriveBodyComparison(block),
    };
  }

  if (kind === "parseRequest") {
    const templateLine = findFirstTemplateLine(lines, requestStartLine);
    return {
      kind,
      highlightLine: toAbsoluteLine(block, templateLine ?? requestStartLine),
    };
  }

  if (kind === "parseResponse") {
    const templateLine = findFirstTemplateLine(lines, responseStartLine);
    return {
      kind,
      highlightLine: toAbsoluteLine(block, templateLine ?? responseStartLine),
    };
  }

  if (kind === "request") {
    return {
      kind,
      highlightLine: toAbsoluteLine(block, requestStartLine),
    };
  }

  return {
    kind,
    highlightLine: toAbsoluteLine(block, firstNonEmptyLine(lines)),
  };
}