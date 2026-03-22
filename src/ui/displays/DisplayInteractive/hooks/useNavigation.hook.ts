import { useEffect, useMemo, useState } from "react";
import { useInput } from "ink";
import type { BlockState, FileState } from "../../../store/store.ts";
import type { NavItem } from "../DisplayInteractive.types.ts";
import { getBlockDetailLines } from "../utils/interactiveFormatters.ts";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  // Reset navigation state when a new run starts
  useEffect(() => {
    if (phase !== "done") {
      setSelectedIndex(0);
      setExpandedFiles(new Set());
      setExpandedBlocks(new Set());
    }
  }, [phase]);

  // Flat list of navigable items (drives keyboard index)
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [];
    for (const fileId of fileOrder) {
      const file = files[fileId];
      if (!file) continue;
      items.push({ type: "file", id: fileId });
      if (expandedFiles.has(fileId)) {
        for (const blockId of file.blockIds) {
          const block = blocks[blockId];
          if (!block || block.isFirstBlock) continue;
          items.push({ type: "block", id: blockId, fileId });
          if (expandedBlocks.has(blockId)) {
            const detailLines = getBlockDetailLines(block);
            detailLines.forEach((text, lineIndex) => {
              items.push({ type: "detail", blockId, fileId, lineIndex, text });
            });
          }
        }
      }
    }
    return items;
  }, [fileOrder, files, blocks, expandedFiles, expandedBlocks]);

  // Clamp selectedIndex when nav list shrinks
  useEffect(() => {
    if (navItems.length > 0 && selectedIndex >= navItems.length) {
      setSelectedIndex(navItems.length - 1);
    }
  }, [navItems.length, selectedIndex]);

  useInput(
    (input, key) => {
      if (input === "q" || key.escape) {
        onExit();
        return;
      }
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(navItems.length - 1, i + 1));
        return;
      }
      if (key.return || input === " ") {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          if (expandedFiles.has(item.id)) {
            setExpandedFiles((s) => { const n = new Set(s); n.delete(item.id); return n; });
          } else {
            setExpandedFiles((s) => new Set(s).add(item.id));
          }
        } else if (item.type === "block") {
          if (expandedBlocks.has(item.id)) {
            setExpandedBlocks((s) => { const n = new Set(s); n.delete(item.id); return n; });
          } else {
            setExpandedBlocks((s) => new Set(s).add(item.id));
          }
        } else {
          // detail: collapse parent block and jump to parent block item
          setExpandedBlocks((s) => { const n = new Set(s); n.delete(item.blockId); return n; });
          for (let i = selectedIndex - 1; i >= 0; i--) {
            const n = navItems[i];
            if (n && n.type === "block" && n.id === item.blockId) {
              setSelectedIndex(i);
              break;
            }
          }
        }
        return;
      }
      if (key.rightArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          setExpandedFiles((s) => new Set(s).add(item.id));
          const file = files[item.id];
          const hasChildren = file?.blockIds.some((bid) => {
            const b = blocks[bid];
            return b && !b.isFirstBlock;
          }) ?? false;
          if (hasChildren) {
            setSelectedIndex(selectedIndex + 1);
          }
        } else if (item.type === "block") {
          setExpandedBlocks((s) => new Set(s).add(item.id));
        }
        // detail: no-op
        return;
      }
      if (key.leftArrow) {
        const item = navItems[selectedIndex];
        if (!item) return;
        if (item.type === "file") {
          setExpandedFiles((s) => {
            const next = new Set(s);
            next.delete(item.id);
            return next;
          });
        } else if (item.type === "block") {
          setExpandedBlocks((s) => {
            const next = new Set(s);
            next.delete(item.id);
            return next;
          });
          for (let i = selectedIndex - 1; i >= 0; i--) {
            const n = navItems[i];
            if (n && n.type === "file" && n.id === item.fileId) {
              setSelectedIndex(i);
              break;
            }
          }
        } else {
          // detail: collapse parent block and jump to parent block item
          setExpandedBlocks((s) => {
            const next = new Set(s);
            next.delete(item.blockId);
            return next;
          });
          for (let i = selectedIndex - 1; i >= 0; i--) {
            const n = navItems[i];
            if (n && n.type === "block" && n.id === item.blockId) {
              setSelectedIndex(i);
              break;
            }
          }
        }
        return;
      }
    },
    { isActive: phase === "done" },
  );

  return { selectedIndex, expandedFiles, expandedBlocks, navItems };
}
