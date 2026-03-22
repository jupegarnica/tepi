import React from "react";
import { Box, Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { BlockState, FileState } from "../../../store/store.ts";
import type { FileSectionConfig } from "../DisplayLayout.types.ts";
import { FileSection } from "../../FileSection/index.ts";

export function renderFileNode(
  file: FileState,
  blocks: Record<string, BlockState>,
  noAnimation: boolean,
  fileSectionConfig: FileSectionConfig | undefined,
): React.ReactNode {
  if (fileSectionConfig == null) {
    if (file.status === "running") {
      return <Text>{fmt.gray(`running ${file.relativePath} `)}</Text>;
    }
    return null;
  }
  return (
    <FileSection
      file={file}
      blocks={blocks}
      showHeader={fileSectionConfig.showHeader}
      showIgnored={fileSectionConfig.showIgnored}
      noAnimation={noAnimation}
      globalDisplayIndex={fileSectionConfig.globalDisplayIndex}
      blockDetail={fileSectionConfig.blockDetail}
    />
  );
}
