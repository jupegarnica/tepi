import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";

export type NavItem =
  | { type: "file"; id: string }
  | { type: "block"; id: string; fileId: string };

export type InteractiveProps = CommonDisplayProps & {
  onExit: () => void;
};
