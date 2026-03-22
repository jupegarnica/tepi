import type { ReactNode } from "react";

export const SCROLL_ANCHOR_SENTINEL = "__TEPI_SCROLL_ANCHOR__";

export type ScrollProps = {
  height: number;
  children: ReactNode;
};

export type UseScrollArgs = {
  children: ReactNode;
  height: number;
  columns: number;
};

export type UseScrollResult = {
  aboveCount: number;
  belowCount: number;
  displayLines: string[];
};