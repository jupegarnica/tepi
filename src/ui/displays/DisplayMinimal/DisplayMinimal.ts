import { DisplayLayout } from "../../shared/DisplayLayout/index.ts";
import type { CommonDisplayProps } from "../../shared/DisplayLayout/index.ts";

export function DisplayMinimal(props: CommonDisplayProps): string {
  return DisplayLayout({
    ...props,
    errorSummaryStyle: "compact",
  });
}
