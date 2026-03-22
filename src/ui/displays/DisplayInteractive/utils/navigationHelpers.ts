import type { NavItem } from "../DisplayInteractive.types.ts";

/**
 * Scans backwards from `fromIndex` to find the first item of the given type and id.
 * Returns the found index, or `fromIndex` if not found.
 */
export function findParentIndex(
  navItems: NavItem[],
  fromIndex: number,
  parentType: "file" | "block",
  parentId: string,
): number {
  for (let i = fromIndex - 1; i >= 0; i--) {
    const n = navItems[i];
    if (n && n.type === parentType && n.id === parentId) return i;
  }
  return fromIndex;
}
