export type RunSummaryProps = {
  successCount: number;
  failCount: number;
  ignoreCount: number;
  startTime: number;
  endTime?: number;
  actualThreadsUsed: number;
  exitCode?: number;
};
