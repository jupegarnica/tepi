import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import type { Navigation } from "./hooks/useNavigation.hook.ts";

export type NavItem =
  | { type: "file"; id: string }
  | { type: "block"; id: string; fileId: string }
  | { type: "detail"; blockId: string; fileId: string; lineIndex: number; text: string };

export type InteractiveProps = CommonDisplayProps & {
  onExit: () => void;
  /** Stateful keyboard navigation owned by the app layer; tests omit it. */
  nav?: Navigation;
};
