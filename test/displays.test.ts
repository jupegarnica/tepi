import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { test } from "vitest";
import { runner } from "../src/runner.ts";
import { createStore } from "../src/ui/store.ts";
import { formatTapOutput } from "../src/ui/displays/DisplayTap.tsx";
import { formatVitestOutput } from "../src/ui/displays/DisplayDefault.tsx";
import type { VitestFormatState } from "../src/ui/displays/DisplayDefault.tsx";

async function vitestOutput(filePaths: string[]) {
  const store = createStore();
  await runner(filePaths, { display: "none" }, false, store);
  const state = store.getState();
  return formatVitestOutput({
    fileOrder: state.fileOrder,
    files: state.files,
    blocks: state.blocks,
    phase: state.phase,
    startTime: state.startTime,
    endTime: state.endTime,
  } satisfies VitestFormatState);
}

async function tapOutput(filePaths: string[]): Promise<string[]> {
  const store = createStore();
  await runner(filePaths, { display: "none" }, false, store);
  const state = store.getState();
  return formatTapOutput({
    blockOrder: state.blockOrder,
    blocks: state.blocks,
    phase: state.phase,
  });
}

test("[tap] header is always TAP version 14", async () => {
  const lines = await tapOutput(["http/pass.http"]);
  assertEquals(lines[0], "TAP version 14");
});

test("[tap] passing test produces ok line", async () => {
  const lines = await tapOutput(["http/pass.http"]);
  assert(lines.some((l) => l.startsWith("ok ") && !l.includes("# SKIP")));
});

test("[tap] failing test produces not ok line with YAML diagnostic", async () => {
  // failFast.http has an ignored block and two failing blocks
  const lines = await tapOutput(["http/failFast.http"]);
  assert(lines.some((l) => l.startsWith("not ok ")));
  assertStringIncludes(lines.join("\n"), "---");
  assertStringIncludes(lines.join("\n"), "message:");
  assertStringIncludes(lines.join("\n"), "...");
});

test("[tap] ignored test produces # SKIP directive", async () => {
  // failFast.http has ignore: true on the first block
  const lines = await tapOutput(["http/failFast.http"]);
  assert(lines.some((l) => l.includes("# SKIP")));
});

test("[tap] plan line matches total non-first-block count", async () => {
  const store = createStore();
  await runner(["http/pass.http"], { display: "none" }, false, store);
  const state = store.getState();
  const lines = formatTapOutput({
    blockOrder: state.blockOrder,
    blocks: state.blocks,
    phase: state.phase,
  });
  const testCount = state.blockOrder
    .map((id) => state.blocks[id])
    .filter((b) => b && !b.isFirstBlock).length;
  assertEquals(lines[lines.length - 1], `1..${testCount}`);
});

test("[tap] isFirstBlock entries are excluded from test lines", async () => {
  const store = createStore();
  await runner(["http/pass.http"], { display: "none" }, false, store);
  const state = store.getState();
  const firstBlockIds = state.blockOrder.filter(
    (id) => state.blocks[id]?.isFirstBlock
  );
  const lines = formatTapOutput({
    blockOrder: state.blockOrder,
    blocks: state.blocks,
    phase: state.phase,
  });
  // None of the first-block descriptions should appear in ok/not ok lines
  for (const id of firstBlockIds) {
    const desc = state.blocks[id]?.description;
    const testLines = lines.filter((l) => l.startsWith("ok ") || l.startsWith("not ok "));
    assert(!testLines.some((l) => l.includes(desc)));
  }
});

test("[tap] plan line is absent when phase is not done", () => {
  const lines = formatTapOutput({
    blockOrder: [],
    blocks: {},
    phase: "running",
  });
  assertEquals(lines.length, 1); // only "TAP version 14"
  assert(!lines.some((l) => l.startsWith("1..")));
});

// --- vitest display format tests ---

test("[vitest] passing file shows zero failures", async () => {
  const result = await vitestOutput(["http/pass.http"]);
  assert(result.fileStats.length > 0);
  const file = result.fileStats[0];
  assertEquals(file.stats.failed, 0);
  assert(!file.stats.hasFailures);
});

test("[vitest] failing file shows failure count and hasFailures", async () => {
  const result = await vitestOutput(["http/failFast.http"]);
  const failedFile = result.fileStats.find((f) => f.stats.hasFailures);
  assert(failedFile !== undefined, "expected at least one failed file");
  assert(failedFile.stats.failed > 0);
});

test("[vitest] failures array contains error details for failed blocks", async () => {
  const result = await vitestOutput(["http/failFast.http"]);
  assert(result.failures.length > 0, "expected failures");
  for (const f of result.failures) {
    assert(f.description.length > 0);
    assert(f.error.message.length > 0);
  }
});

test("[vitest] summary counts are consistent", async () => {
  const result = await vitestOutput(["http/pass.http"]);
  const { testsPassed, testsFailed, testsIgnored, testsTotal } = result.summary;
  assertEquals(testsPassed + testsFailed + testsIgnored, testsTotal);
});

test("[vitest] isFirstBlock entries excluded from counts", async () => {
  const store = createStore();
  await runner(["http/pass.http"], { display: "none" }, false, store);
  const state = store.getState();
  const firstBlockCount = state.blockOrder.filter(
    (id) => state.blocks[id]?.isFirstBlock,
  ).length;
  const result = formatVitestOutput({
    fileOrder: state.fileOrder,
    files: state.files,
    blocks: state.blocks,
    phase: state.phase,
    startTime: state.startTime,
    endTime: state.endTime,
  });
  // If there are first-blocks, total should be less than total block count
  if (firstBlockCount > 0) {
    assert(result.summary.testsTotal < state.blockOrder.length);
  }
});

test("[vitest] file-level: any failed block marks file as failed", async () => {
  const result = await vitestOutput(["http/failFast.http"]);
  const { filesPassed, filesFailed, filesTotal } = result.summary;
  assertEquals(filesPassed + filesFailed, filesTotal);
  assert(filesFailed > 0);
});
