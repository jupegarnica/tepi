import { MessagesPanel } from "../../MessagesPanel/index.ts";
import { WatchStatus } from "../../WatchStatus/index.ts";
import type { InteractiveProps } from "./DisplayInteractive.types.ts";
import { getNavItems } from "./hooks/useNavItems.hook.ts";
import { createNavigation } from "./hooks/useNavigation.hook.ts";
import { DoneView } from "./components/DoneView/DoneView.tsx";
import type { Navigation } from "./hooks/useNavigation.hook.ts";

export { createNavigation } from "./hooks/useNavigation.hook.ts";

/**
 * Renders the interactive display. Without a navigation controller a fresh
 * default one (nothing expanded, selection at 0) is used — the stateful keys
 * live outside this render pass and mutate the controller passed by the app.
 */
export function DisplayInteractive(props: InteractiveProps): string {
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
  } = props;

  const nav: Navigation = props.nav ?? createNavigation();
  const selectedIndex = nav.getSelectedIndex();

  const navItems = getNavItems({
    fileOrder,
    files,
    blocks,
    expandedFiles: nav.expandState.expandedFiles,
    expandedBlocks: nav.expandState.expandedBlocks,
  });

  const parts: string[] = [];

  const messagesPart = MessagesPanel({ messages });
  if (messagesPart) parts.push(messagesPart);

  parts.push(
    DoneView({
      navItems,
      selectedIndex,
      expandedFiles: nav.expandState.expandedFiles,
      files,
      blocks,
      fileOrder,
      startTime,
      endTime,
      actualThreadsUsed,
      exitCode,
    }),
  );

  if (isWatchMode) {
    const watch = WatchStatus({ watchPaths, watchTriggerPaths });
    if (watch) parts.push(watch);
  }

  return parts.filter((s) => s !== "").join("\n");
}
