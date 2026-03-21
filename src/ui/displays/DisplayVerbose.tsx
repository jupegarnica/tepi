import React from "react";
import { DisplayLayout } from "../shared/DisplayLayout.tsx";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import { DISPLAY_INDEX_VERBOSE } from "../formatters.ts";

export function DisplayVerbose(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      fileSectionConfig={{
        showHeader: true,
        showIgnored: true,
        globalDisplayIndex: DISPLAY_INDEX_VERBOSE,
        blockDetail: { truncateBody: false, truncateHeaders: false, showErrorDetail: true },
      }}
      errorSummaryStyle="expanded"
    />
  );
}
