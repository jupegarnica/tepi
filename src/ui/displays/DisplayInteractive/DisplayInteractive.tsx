import React from "react";
import { Box } from "ink";
import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import type { InteractiveProps } from "./DisplayInteractive.types.ts";
import { useNavigation } from "./hooks/useNavigation.hook.ts";
import { DoneView } from "./components/DoneView/DoneView.tsx";

export function DisplayInteractive(props: InteractiveProps) {
  const {
    files,
    fileOrder,
    blocks,
    messages,
    startTime,
    endTime,
    actualThreadsUsed,
    exitCode,
    isWatchMode,
    watchPaths,
    watchTriggerPaths,
    onExit,
  } = props;

  const { selectedIndex, expandedFiles, navItems } = useNavigation({
    fileOrder,
    files,
    blocks,
    onExit,
  });

  return (
    <Box flexDirection="column">
      <MessagesPanel messages={messages} />

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

      {isWatchMode && (
        <WatchStatus watchPaths={watchPaths} watchTriggerPaths={watchTriggerPaths} />
      )}
    </Box>
  );
}
