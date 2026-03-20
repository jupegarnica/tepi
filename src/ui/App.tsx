import React, { useEffect, useState } from "react";
import { Box, Static } from "ink";
import type { BlockState, FileState, StoreApi, TepiStore } from "./store.ts";
import { FileRunner } from "./FileRunner.tsx";
import { ErrorsSummary } from "./ErrorsSummary.tsx";
import { RunSummary } from "./RunSummary.tsx";
import { WatchStatus } from "./WatchStatus.tsx";
import { MessagesPanel } from "./MessagesPanel.tsx";
import { getDisplayIndex } from "./formatters.ts";

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

  const displayIndex = getDisplayIndex(displayMode);

  if (displayIndex <= 0) return null;

  // Separate completed files (for Static) from currently running
  const doneFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status === "done");

  const activeFiles = fileOrder
    .map((id) => files[id])
    .filter((f): f is FileState => !!f && f.status !== "done");

  const allBlocksList = Object.values(blocks) as BlockState[];

  return (
    <>
      <MessagesPanel messages={messages} />

      {/* Completed files scroll up into Static */}
      <Static items={doneFiles}>
        {(file) => (
          <Box key={file.relativePath} flexDirection="column">
            <FileRunner
              file={file}
              blocks={blocks}
              displayMode={displayMode}
              noAnimation={noAnimation}
            />
          </Box>
        )}
      </Static>

      {/* Currently running files stay dynamic */}
      {activeFiles.map((file) => (
        <FileRunner
          key={file.relativePath}
          file={file}
          blocks={blocks}
          displayMode={displayMode}
          noAnimation={noAnimation}
        />
      ))}

      {/* Final summary shown when done */}
      {phase === "done" && (
        <>
          <ErrorsSummary
            blocks={allBlocksList}
            globalDisplayMode={displayMode}
          />
          <RunSummary
            successCount={successCount}
            failCount={failCount}
            ignoreCount={ignoreCount}
            startTime={startTime}
            endTime={endTime}
            exitCode={exitCode}
          />
        </>
      )}

      {/* Watch mode footer */}
      {isWatchMode && (
        <WatchStatus
          watchPaths={watchPaths}
          watchTriggerPaths={watchTriggerPaths}
        />
      )}
    </>
  );
}
