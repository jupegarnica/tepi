import type { Navigation } from "../displays/DisplayInteractive/DisplayInteractive.types.ts";
import type { CommonDisplayProps } from "../shared/DisplayLayout/index.ts";
import { DisplayNone } from "../displays/DisplayNone/index.ts";
import { DisplayMinimal } from "../displays/DisplayMinimal/index.ts";
import { DisplayDefault } from "../displays/DisplayDefault/index.ts";
import { DisplayDots } from "../displays/DisplayDots/index.ts";
import { DisplayTruncate } from "../displays/DisplayTruncate/index.ts";
import { DisplayFull } from "../displays/DisplayFull/index.ts";
import { DisplayVerbose } from "../displays/DisplayVerbose/index.ts";
import { DisplayTap } from "../displays/DisplayTap/index.ts";
import { DisplayInteractive } from "../displays/DisplayInteractive/index.ts";
import type { TepiStore } from "../store/store.ts";

export function buildApp(store: TepiStore, nav?: Navigation): string {
  const s = store.getState();

  const commonProps: CommonDisplayProps = {
    files: s.files,
    fileOrder: s.fileOrder,
    blocks: s.blocks,
    phase: s.phase,
    messages: s.messages,
    successCount: s.successCount,
    failCount: s.failCount,
    ignoreCount: s.ignoreCount,
    startTime: s.startTime,
    endTime: s.endTime,
    actualThreadsUsed: s.maxRunningBlockCount,
    exitCode: s.exitCode,
    isWatchMode: s.isWatchMode,
    watchPaths: s.watchPaths,
    watchTriggerPaths: s.watchTriggerPaths,
    noAnimation: s.noAnimation,
  };

  switch (s.displayMode) {
    case "none":
      return DisplayNone();
    case "minimal":
      return DisplayMinimal(commonProps);
    case "default":
      return DisplayDefault(commonProps);
    case "truncate":
      return DisplayTruncate(commonProps);
    case "full":
      return DisplayFull(commonProps);
    case "verbose":
      return DisplayVerbose(commonProps);
    case "tap":
      return DisplayTap(commonProps);
    case "dots":
      return DisplayDots(commonProps);
    case "interactive":
      return DisplayInteractive({
        ...commonProps,
        onExit: () => store.getState().requestExit(),
        nav,
      });
    default:
      return DisplayDefault(commonProps);
  }
}
