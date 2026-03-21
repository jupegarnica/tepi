import React, { useEffect, useState } from "react";
import type { StoreApi, TepiStore } from "./store.ts";
import type { CommonDisplayProps } from "./shared/DisplayLayout.tsx";
import { DisplayNone } from "./displays/DisplayNone.tsx";
import { DisplayMinimal } from "./displays/DisplayMinimal.tsx";
import { DisplayDefault } from "./displays/DisplayDefault.tsx";
import { DisplayDots } from "./displays/DisplayDots.tsx";
import { DisplayTruncate } from "./displays/DisplayTruncate.tsx";
import { DisplayFull } from "./displays/DisplayFull.tsx";
import { DisplayVerbose } from "./displays/DisplayVerbose.tsx";
import { DisplayTap } from "./displays/DisplayTap.tsx";
import { DisplayInteractive } from "./displays/DisplayInteractive.tsx";

type Props = {
  store: StoreApi;
};

function useStore<T>(store: StoreApi, selector: (state: TepiStore) => T): T {
  const [value, setValue] = useState(() => selector(store.getState()));
  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setValue(selector(state));
    });
    return unsub;
  }, [store]);
  return value;
}

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
