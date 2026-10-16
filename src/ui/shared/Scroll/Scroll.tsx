import type { ScrollProps } from "./Scroll.types.ts";
import { useScroll } from "./hooks/useScroll.hook.ts";

export function Scroll({ height, children }: ScrollProps): string {
  const { displayLines } = useScroll({ children, height });

  if (displayLines.length === 0) {
    return "";
  }

  return displayLines.join("\n");
}
