import React from "react";
import { DisplayLayout } from "../../shared/DisplayLayout/index.ts";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";
import { DISPLAY_INDEX_TRUNCATE } from "../../utils/formatters.ts";

export function DisplayTruncate(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      fileSectionConfig={{
        showHeader: true,
        showIgnored: false,
        globalDisplayIndex: DISPLAY_INDEX_TRUNCATE,
        blockDetail: { truncateBody: true, truncateHeaders: true, showErrorDetail: false },
      }}
      errorSummaryStyle="expanded"
    />
  );
}
