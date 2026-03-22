import { useCallback, useState } from "react";

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

export function useExpandState(): UseExpandStateResult {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const toggleFile = useCallback((id: string) => {
    setExpandedFiles((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandFile = useCallback((id: string) => {
    setExpandedFiles((s) => new Set(s).add(id));
  }, []);

  const collapseFile = useCallback((id: string) => {
    setExpandedFiles((s) => { const n = new Set(s); n.delete(id); return n; });
  }, []);

  const toggleBlock = useCallback((id: string) => {
    setExpandedBlocks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandBlock = useCallback((id: string) => {
    setExpandedBlocks((s) => new Set(s).add(id));
  }, []);

  const collapseBlock = useCallback((id: string) => {
    setExpandedBlocks((s) => { const n = new Set(s); n.delete(id); return n; });
  }, []);

  const resetAll = useCallback(() => {
    setExpandedFiles(new Set());
    setExpandedBlocks(new Set());
  }, []);

  return {
    expandedFiles,
    expandedBlocks,
    toggleFile,
    expandFile,
    collapseFile,
    toggleBlock,
    expandBlock,
    collapseBlock,
    resetAll,
  };
}
