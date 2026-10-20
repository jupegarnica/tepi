export const SCROLL_ANCHOR_SENTINEL = "__TEPI_SCROLL_ANCHOR__";

export type ScrollProps = {
  height: number;
  /** Pre-rendered view (lines joined with "\n"), possibly carrying ANSI styles. */
  children: string;
};

export type UseScrollArgs = {
  children: string;
  height: number;
  columns?: number;
};

export type UseScrollResult = {
  aboveCount: number;
  belowCount: number;
  displayLines: string[];
};
