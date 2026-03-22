import React from "react";
import { DisplayLayout } from "../../shared/DisplayLayout/index.ts";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import { DISPLAY_INDEX_VERBOSE } from "../../utils/formatters.ts";

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
