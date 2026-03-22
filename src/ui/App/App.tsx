import React from "react";
import type { StoreApi } from "../store/store.ts";
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
import { useStore } from "./hooks/useStore.hook.ts";

type Props = {
  store: StoreApi;
};

export function App({ store }: Props) {
  const displayMode = useStore(store, (s) => s.displayMode);
  const noAnimation = useStore(store, (s) => s.noAnimation);
  const phase = useStore(store, (s) => s.phase);
  const fileOrder = useStore(store, (s) => s.fileOrder);
  const files = useStore(store, (s) => s.files);
  const blocks = useStore(store, (s) => s.blocks);
  const messages = useStore(store, (s) => s.messages);
  const successCount = useStore(store, (s) => s.successCount);
  const failCount = useStore(store, (s) => s.failCount);
  const ignoreCount = useStore(store, (s) => s.ignoreCount);
  const startTime = useStore(store, (s) => s.startTime);
  const endTime = useStore(store, (s) => s.endTime);
  const actualThreadsUsed = useStore(store, (s) => s.maxRunningBlockCount);
  const exitCode = useStore(store, (s) => s.exitCode);
  const isWatchMode = useStore(store, (s) => s.isWatchMode);
  const watchPaths = useStore(store, (s) => s.watchPaths);
  const watchTriggerPaths = useStore(store, (s) => s.watchTriggerPaths);

  const commonProps: CommonDisplayProps = {
    files,
    fileOrder,
    blocks,
    phase,
    messages,
    successCount,
    failCount,
    ignoreCount,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    noAnimation,
  };

  switch (displayMode) {
    case "none":
      return <DisplayNone />;
    case "minimal":
      return <DisplayMinimal {...commonProps} />;
    case "default":
      return <DisplayDefault {...commonProps} />;
    case "truncate":
      return <DisplayTruncate {...commonProps} />;
    case "full":
      return <DisplayFull {...commonProps} />;
    case "verbose":
      return <DisplayVerbose {...commonProps} />;
    case "tap":
      return <DisplayTap {...commonProps} />;
    case "dots":
      return <DisplayDots {...commonProps} />;
    case "interactive":
      return <DisplayInteractive {...commonProps} onExit={() => store.getState().requestExit()} />;
    default:
      return <DisplayDefault {...commonProps} />;
  }
}
