import type { BlockState, FileState } from "../../../store/store.ts";
import type { FileSectionConfig } from "../DisplayLayout.types.ts";
import { FileSection } from "../../FileSection/index.ts";
import * as fmt from "@std/fmt/colors";

export function renderFileNode(
  file: FileState,
  blocks: Record<string, BlockState>,
  noAnimation: boolean,
  fileSectionConfig: FileSectionConfig | undefined,
): string {
  if (fileSectionConfig == null) {
    if (file.status === "running") {
      return fmt.gray(`running ${file.relativePath} `);
    }
    return "";
  }
  return FileSection({
    file,
    blocks,
    showHeader: fileSectionConfig.showHeader,
    showIgnored: fileSectionConfig.showIgnored,
    noAnimation,
    globalDisplayIndex: fileSectionConfig.globalDisplayIndex,
    blockDetail: fileSectionConfig.blockDetail,
  });
}
