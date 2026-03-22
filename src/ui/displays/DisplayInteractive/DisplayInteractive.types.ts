import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";

export type NavItem =
  | { type: "file"; id: string }
  | { type: "block"; id: string; fileId: string }
  | { type: "detail"; blockId: string; fileId: string; lineIndex: number; text: string };

export type InteractiveProps = CommonDisplayProps & {
  onExit: () => void;
};
