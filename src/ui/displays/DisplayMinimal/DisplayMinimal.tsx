import React from "react";
import { DisplayLayout } from "../../shared/DisplayLayout/index.ts";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";

export function DisplayMinimal(props: CommonDisplayProps) {
  return (
    <DisplayLayout
      {...props}
      errorSummaryStyle="compact"
    />
  );
}
