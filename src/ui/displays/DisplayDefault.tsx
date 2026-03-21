import React from "react";
import { DisplayLayout } from "../shared/DisplayLayout.tsx";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";
import { DISPLAY_INDEX_DEFAULT } from "../formatters.ts";

export function DisplayDefault(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      fileSectionConfig={{
        showHeader: true,
        showIgnored: false,
        globalDisplayIndex: DISPLAY_INDEX_DEFAULT,
      }}
      errorSummaryStyle="expanded"
    />
  );
}
