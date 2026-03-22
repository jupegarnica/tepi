import * as fmt from "@std/fmt/colors";
import type { FailureContext } from "../../failureContext.ts";
import type { BlockState } from "../store/store.ts";

type FailureBlock = Pick<
  BlockState,
  | "filePath"
  | "blockLink"
  | "error"
  | "sourceText"
  | "sourceStartLine"
  | "failureContext"
>;

type Options = {
  indent?: string;
  sourceRadius?: number;
};

const DEFAULT_INDENT = "\t   ";

function formatMessageBlock(message: string, indent: string): string[] {
  const [headline, ...rest] = message.split("\n");
  const lines = [headline?.trim() || message.trim()];

  if (rest.length > 0) {
    lines.push(...rest.map((line) => `${indent}${line}`));
  }

  return lines;
}

function splitSourceLines(text: string): string[] {
  const lines = text.replaceAll("\r", "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function getFallbackLine(block: FailureBlock): number | undefined {
  const raw = block.blockLink.split(":").pop()?.trim();
  if (!raw) return undefined;
  const line = Number(raw);
  return Number.isNaN(line) ? undefined : line;
}

function getFailureLine(block: FailureBlock): number | undefined {
  return block.failureContext?.highlightLine ?? getFallbackLine(block);
}

function formatSourceExcerpt(
  sourceText: string,
  sourceStartLine: number,
  highlightLine: number,
  indent: string,
  radius: number,
): string {
  const lines = splitSourceLines(sourceText);
  if (!lines.length) return "";

  const localHighlight = Math.max(
    0,
    Math.min(lines.length - 1, highlightLine - sourceStartLine),
  );
  const start = Math.max(0, localHighlight - radius);
  const end = Math.min(lines.length - 1, localHighlight + radius);
  const lineNumberWidth = String(sourceStartLine + end).length;

  return lines
    .slice(start, end + 1)
    .map((line, index) => {
      const lineNumber = sourceStartLine + start + index;
      const isHighlighted = lineNumber === highlightLine;
      const marker = isHighlighted ? fmt.red(">") : fmt.dim(" ");
      const numberedLine = `${String(lineNumber).padStart(lineNumberWidth)} | ${line}`;
      return `${indent}${marker} ${isHighlighted ? fmt.bold(numberedLine) : fmt.dim(numberedLine)}`;
    })
    .join("\n");
}

function formatComparison(
  context: FailureContext | undefined,
  indent: string,
): string[] {
  if (!context?.comparison) return [];

  return [
    `${indent}${fmt.dim(`${context.comparison.label} expected:`)} ${fmt.green(context.comparison.expected ?? "undefined")}`,
    `${indent}${fmt.dim(`${context.comparison.label} received:`)} ${fmt.red(context.comparison.actual ?? "undefined")}`,
  ];
}

export function formatFailureDetailsText(
  block: FailureBlock,
  options: Options = {},
): string {
  if (!block.error) return "";

  const indent = options.indent ?? DEFAULT_INDENT;
  const sourceRadius = options.sourceRadius ?? 2;
  const locationLine = getFailureLine(block);
  const messageLines = formatMessageBlock(block.error.message, indent);
  const [headline, ...messageBody] = messageLines;
  const lines = [`${indent}${fmt.red(block.error.name)}: ${headline}`];

  if (messageBody.length > 0) {
    lines.push(...messageBody);
  }

  if (locationLine !== undefined) {
    lines.push(`${indent}${fmt.dim("at:")} ${fmt.cyan(`${block.filePath}:${locationLine}`)}`);
  }

  if (
    block.sourceText &&
    locationLine !== undefined &&
    block.sourceStartLine !== undefined
  ) {
    lines.push(`${indent}${fmt.dim("source:")}`);
    lines.push(
      formatSourceExcerpt(
        block.sourceText,
        block.sourceStartLine,
        locationLine,
        indent,
        sourceRadius,
      ),
    );
  }

  lines.push(...formatComparison(block.failureContext, indent));

  if (block.error.cause) {
    lines.push(`${indent}${fmt.dim("cause:")} ${fmt.dim(block.error.cause)}`);
  }

  return lines.filter(Boolean).join("\n");
}
