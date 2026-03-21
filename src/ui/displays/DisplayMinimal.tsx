import React from "react";
import { DisplayLayout } from "../shared/DisplayLayout.tsx";
import type { CommonDisplayProps } from "../shared/DisplayLayout.tsx";

export function DisplayMinimal(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      errorSummaryStyle="compact"
    />
  );
}
