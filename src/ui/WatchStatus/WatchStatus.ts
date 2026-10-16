import * as fmt from "@std/fmt/colors";

type Props = {
  watchPaths: string[];
  watchTriggerPaths: string[];
};

export function WatchStatus({ watchPaths, watchTriggerPaths }: Props): string {
  const out: string[] = [];
  out.push(fmt.dim("\nWatching and running tests from:"));
  out.push(...watchPaths.map((p) => fmt.cyan(`  ${p}`)));
  if (watchTriggerPaths.length > 0) {
    out.push(fmt.dim("\nRerun when changes from:"));
    out.push(...watchTriggerPaths.map((p) => fmt.cyan(`  ${p}`)));
  }
  return out.join("\n");
}
