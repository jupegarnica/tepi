import React from "react";
import { DisplayLayout } from "../../shared/DisplayLayout/index.ts";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import { DISPLAY_INDEX_FULL } from "../../utils/formatters.ts";

export function DisplayFull(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      fileSectionConfig={{
        showHeader: true,
        showIgnored: false,
        globalDisplayIndex: DISPLAY_INDEX_FULL,
        blockDetail: { truncateBody: false, truncateHeaders: false, showErrorDetail: false },
      }}
      errorSummaryStyle="expanded"
    />
  );
}
