import React from "react";
import { DisplayLayout } from "../shared/DisplayLayout.tsx";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import { DISPLAY_INDEX_TRUNCATE } from "../formatters.ts";

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
