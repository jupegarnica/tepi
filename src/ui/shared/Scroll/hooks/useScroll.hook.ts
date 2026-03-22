import React, { useMemo } from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { UseScrollArgs, UseScrollResult } from "../Scroll.types.ts";
import { SCROLL_ANCHOR_SENTINEL } from "../Scroll.types.ts";

const SELECTED_LINE_PATTERN = /^\s*· /;

type RenderableElementProps = {
  children?: React.ReactNode;
  flexDirection?: string;
  color?: string;
  backgroundColor?: string;
  dimColor?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
};

type RenderableComponent = (props: RenderableElementProps) => React.ReactNode;

function normalizeLines(output: string): string[] {
  if (!output) return [];

  const lines = output.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}

function detectAnchorLine(lines: string[]): number {
  const sentinelIndex = lines.findIndex((line) => line.includes(SCROLL_ANCHOR_SENTINEL));
  if (sentinelIndex >= 0) return sentinelIndex;

  const selectedIndex = lines.findIndex((line) => {
    const text = fmt.stripAnsiCode(line);
    return SELECTED_LINE_PATTERN.test(text);
  });

  return selectedIndex >= 0 ? selectedIndex : 0;
}

function sanitizeLines(lines: string[]): string[] {
  return lines.map((line) => line.replaceAll(SCROLL_ANCHOR_SENTINEL, ""));
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

function applyNamedColor(text: string, color: string, isBackground: boolean): string {
  const name = isBackground ? `bg${capitalize(color)}` : color;
  const candidate = (fmt as unknown as Record<string, unknown>)[name];
  return typeof candidate === "function" ? (candidate as (value: string) => string)(text) : text;
}

function applyColor(text: string, color: string, isBackground: boolean): string {
  return applyNamedColor(text, color, isBackground);
}

function applyTextStyles(text: string, props: RenderableElementProps): string {
  if (text.length === 0) return text;

  let output = text;

  if (props.color) {
    output = applyColor(output, props.color, false);
  }

  if (props.backgroundColor) {
    output = applyColor(output, props.backgroundColor, true);
  }

  if (props.dimColor) output = fmt.dim(output);
  if (props.bold) output = fmt.bold(output);
  if (props.italic) output = fmt.italic(output);
  if (props.underline) output = fmt.underline(output);
  if (props.strikethrough) output = fmt.strikethrough(output);
  if (props.inverse) output = fmt.inverse(output);

  return output;
}

function renderNodeToString(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderNodeToString(child)).join("");
  }

  if (!React.isValidElement(node)) {
    return "";
  }

  const element = node as React.ReactElement<RenderableElementProps>;

  if (element.type === React.Fragment) {
    return renderNodeToString(element.props.children);
  }

  if (element.type === Text) {
    return applyTextStyles(renderNodeToString(element.props.children), element.props);
  }

  if (element.type === Box) {
    const children = React.Children.toArray(element.props.children);
    const renderedChildren = children
      .map((child) => renderNodeToString(child))
      .filter((child) => child.length > 0);

    if (element.props.flexDirection === "column" || element.props.flexDirection === "column-reverse") {
      const lines = element.props.flexDirection === "column-reverse"
        ? [...renderedChildren].reverse()
        : renderedChildren;
      return lines.join("\n");
    }

    return renderedChildren.join("");
  }

  if (typeof element.type === "function") {
    return renderNodeToString((element.type as RenderableComponent)(element.props));
  }

  return renderNodeToString(element.props.children);
}

function centerViewport(anchorLine: number, visibleLineCount: number, totalLineCount: number): number {
  if (visibleLineCount <= 0) return 0;

  return Math.max(
    0,
    Math.min(
      anchorLine - Math.floor(visibleLineCount / 2),
      Math.max(0, totalLineCount - visibleLineCount),
    ),
  );
}

function formatCombinedMarker(aboveCount: number, belowCount: number): string {
  if (aboveCount > 0 && belowCount > 0) {
    return fmt.dim(`  ↑ ${aboveCount} more | ↓ ${belowCount} more`);
  }

  if (aboveCount > 0) {
    return fmt.dim(`  ↑ ${aboveCount} more`);
  }

  return fmt.dim(`  ↓ ${belowCount} more`);
}

function computeDisplayLines(lines: string[], anchorLine: number, height: number): UseScrollResult {
  const safeHeight = Math.max(0, Math.floor(height));

  if (safeHeight === 0 || lines.length === 0) {
    return { aboveCount: 0, belowCount: 0, displayLines: [] };
  }

  if (safeHeight === 1) {
    const selectedLine = lines[Math.min(anchorLine, lines.length - 1)] ?? "";
    const aboveCount = Math.min(anchorLine, Math.max(0, lines.length - 1));
    const belowCount = Math.max(0, lines.length - anchorLine - 1);

    if (aboveCount > 0 || belowCount > 0) {
      return {
        aboveCount,
        belowCount,
        displayLines: [formatCombinedMarker(aboveCount, belowCount)],
      };
    }

    return { aboveCount: 0, belowCount: 0, displayLines: [selectedLine] };
  }

  if (lines.length <= safeHeight) {
    return { aboveCount: 0, belowCount: 0, displayLines: lines };
  }

  let markerRows = safeHeight >= 3 ? 2 : 1;
  let aboveCount = 0;
  let belowCount = 0;
  let visibleLines: string[] = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const visibleLineCount = Math.max(1, safeHeight - markerRows);
    const viewportStart = centerViewport(anchorLine, visibleLineCount, lines.length);
    const viewportEnd = viewportStart + visibleLineCount;

    aboveCount = viewportStart;
    belowCount = Math.max(0, lines.length - viewportEnd);
    visibleLines = lines.slice(viewportStart, viewportEnd);

    const nextMarkerRows = safeHeight >= 3
      ? Number(aboveCount > 0) + Number(belowCount > 0)
      : Number(aboveCount > 0 || belowCount > 0);

    if (nextMarkerRows === markerRows) break;
    markerRows = nextMarkerRows;
  }

  if (safeHeight === 2 && aboveCount > 0 && belowCount > 0) {
    return {
      aboveCount,
      belowCount,
      displayLines: [formatCombinedMarker(aboveCount, belowCount), ...visibleLines.slice(0, 1)],
    };
  }

  const displayLines: string[] = [];

  if (aboveCount > 0) {
    displayLines.push(fmt.dim(`  ↑ ${aboveCount} more`));
  }

  displayLines.push(...visibleLines);

  if (belowCount > 0) {
    displayLines.push(fmt.dim(`  ↓ ${belowCount} more`));
  }

  return {
    aboveCount,
    belowCount,
    displayLines: displayLines.slice(0, safeHeight),
  };
}

export function useScroll({ children, height, columns }: UseScrollArgs): UseScrollResult {
  return useMemo(() => {
    const renderedOutput = renderNodeToString(children);
    const rawLines = normalizeLines(renderedOutput);
    const anchorLine = detectAnchorLine(rawLines);
    const sanitizedLines = sanitizeLines(rawLines);

    return computeDisplayLines(sanitizedLines, anchorLine, height);
  }, [children, columns, height]);
}