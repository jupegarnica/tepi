export type UseExpandStateResult = {
  expandedFiles: Set<string>;
  expandedBlocks: Set<string>;
  toggleFile: (id: string) => void;
  expandFile: (id: string) => void;
  collapseFile: (id: string) => void;
  toggleBlock: (id: string) => void;
  expandBlock: (id: string) => void;
  collapseBlock: (id: string) => void;
  resetAll: () => void;
};

export function createExpandState(): UseExpandStateResult {
  const expandedFiles = new Set<string>();
  const expandedBlocks = new Set<string>();

  return {
    expandedFiles,
    expandedBlocks,
    toggleFile(id: string) {
      if (expandedFiles.has(id)) expandedFiles.delete(id);
      else expandedFiles.add(id);
    },
    expandFile(id: string) {
      expandedFiles.add(id);
    },
    collapseFile(id: string) {
      expandedFiles.delete(id);
    },
    toggleBlock(id: string) {
      if (expandedBlocks.has(id)) expandedBlocks.delete(id);
      else expandedBlocks.add(id);
    },
    expandBlock(id: string) {
      expandedBlocks.add(id);
    },
    collapseBlock(id: string) {
      expandedBlocks.delete(id);
    },
    resetAll() {
      expandedFiles.clear();
      expandedBlocks.clear();
    },
  };
}
