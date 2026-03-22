import React from "react";
import { Box } from "ink";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import type { InteractiveProps } from "./DisplayInteractive.types.ts";
import { useNavigation } from "./hooks/useNavigation.hook.ts";
import { RunningView } from "./components/RunningView/RunningView.tsx";
import { DoneView } from "./components/DoneView/DoneView.tsx";

export function DisplayInteractive(props: InteractiveProps) {
  const {
    files,
    fileOrder,
    blocks,
    phase,
    messages,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    noAnimation,
    onExit,
  } = props;

  const { selectedIndex, expandedFiles, navItems } = useNavigation({
    fileOrder,
    files,
    blocks,
    phase,
    onExit,
  });

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />

      {phase !== "done" && (
        <RunningView
          fileOrder={fileOrder}
          files={files}
          blocks={blocks}
          noAnimation={noAnimation}
        />
      )}

      {phase === "done" && (
        <DoneView
          navItems={navItems}
          selectedIndex={selectedIndex}
          expandedFiles={expandedFiles}
          files={files}
          blocks={blocks}
          fileOrder={fileOrder}
          startTime={startTime}
          endTime={endTime}
          actualThreadsUsed={actualThreadsUsed}
          exitCode={exitCode}
        />
      )}

      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </Box>
  );
}
