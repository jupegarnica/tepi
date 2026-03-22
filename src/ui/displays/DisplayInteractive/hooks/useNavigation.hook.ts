import { useEffect } from "react";
import type { BlockState, FileState } from "../../../store/store.ts";
import type { NavItem } from "../DisplayInteractive.types.ts";
import { useExpandState } from "./useExpandState.hook.ts";
import { useNavItems } from "./useNavItems.hook.ts";
import { useKeyboardNav } from "./useKeyboardNav.hook.ts";

type UseNavigationProps = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  phase: string;
  onExit: () => void;
};

type UseNavigationResult = {
  selectedIndex: number;
  expandedFiles: Set<string>;
  expandedBlocks: Set<string>;
  navItems: NavItem[];
};

export function useNavigation({
  fileOrder,
  files,
  blocks,
  phase,
  onExit,
}: UseNavigationProps): UseNavigationResult {
  const expandState = useExpandState();

  // Reset expand state when a new run starts
  useEffect(() => {
    if (phase !== "done") expandState.resetAll();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const navItems = useNavItems({
    fileOrder,
    files,
    blocks,
    expandedFiles: expandState.expandedFiles,
    expandedBlocks: expandState.expandedBlocks,
  });

  const { selectedIndex } = useKeyboardNav({
    navItems,
    files,
    blocks,
    phase,
    onExit,
    expandState,
  });

  return {
    selectedIndex,
    expandedFiles: expandState.expandedFiles,
    expandedBlocks: expandState.expandedBlocks,
    navItems,
  };
}
