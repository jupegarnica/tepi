import React from "react";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import * as fmt from "@std/fmt/colors";
import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { Scroll, SCROLL_ANCHOR_SENTINEL } from "../src/ui/shared/Scroll/index.ts";
import { DisplayInteractive } from "../src/ui/displays/DisplayInteractive/DisplayInteractive.tsx";
import type { InteractiveProps } from "../src/ui/displays/DisplayInteractive/DisplayInteractive.types.ts";
import type { FileState } from "../src/ui/store/store.ts";

function stripOutput(text: string | undefined): string {
  return fmt.stripAnsiCode(text ?? "");
}

async function renderFrame(node: React.ReactElement) {
  const app = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const frame = stripOutput(app.lastFrame());
  app.unmount();
  return frame;
}

async function renderRawFrame(node: React.ReactElement) {
  const app = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const frame = app.lastFrame() ?? "";
  app.unmount();
  return frame;
}

test("[scroll] renders arbitrary ReactNode content without markers when it fits", async () => {
  const frame = await renderFrame(
    React.createElement(
      Scroll,
      {
        height: 5,
        children: React.createElement(Box, { flexDirection: "column" }, [
          React.createElement(Text, { key: "alpha" }, "alpha"),
          React.createElement(Text, { key: "beta" }, "beta"),
        ]),
      },
    ),
  );

  assertEquals(frame, "alpha\nbeta");
});

function CustomLine({ text, anchor = false }: { text: string; anchor?: boolean }) {
  return React.createElement(Text, null, `${anchor ? SCROLL_ANCHOR_SENTINEL : ""}${text}`);
}

test("[scroll] serializes pure function components inside the tree", async () => {
  const frame = await renderFrame(
    React.createElement(
      Scroll,
      {
        height: 3,
        children: React.createElement(Box, { flexDirection: "column" }, [
          React.createElement(CustomLine, { key: "one", text: "one" }),
          React.createElement(CustomLine, { key: "two", text: "· two", anchor: true }),
          React.createElement(CustomLine, { key: "three", text: "three" }),
        ]),
      },
    ),
  );

  assertEquals(frame, "one\n· two\nthree");
});

test("[scroll] preserves Ink Text colors while serializing component trees", async () => {
  const previousColors = fmt.getColorEnabled();
  fmt.setColorEnabled(true);

  try {
    const frame = await renderRawFrame(
      React.createElement(
        Scroll,
        {
          height: 2,
          children: React.createElement(Box, { flexDirection: "column" }, [
            React.createElement(Text, { key: "green", color: "green" }, "green line"),
            React.createElement(Text, { key: "dim", dimColor: true }, "dim line"),
          ]),
        },
      ),
    );

    assertStringIncludes(frame, "\u001b[");
    assertEquals(stripOutput(frame), "green line\ndim line");
  } finally {
    fmt.setColorEnabled(previousColors);
  }
});

test("[scroll] centers the anchor line and shows both overflow markers", async () => {
  const lines = [
    "one",
    "two",
    `${SCROLL_ANCHOR_SENTINEL}· three`,
    "four",
    "five",
  ].join("\n");

  const frame = await renderFrame(
    React.createElement(
      Scroll,
      { height: 3, children: React.createElement(Text, null, lines) },
    ),
  );

  assertEquals(frame, "  ↑ 2 more\n· three\n  ↓ 2 more");
});

test("[scroll] collapses both counts into one marker line when height is two", async () => {
  const lines = [
    "one",
    "two",
    `${SCROLL_ANCHOR_SENTINEL}· three`,
    "four",
    "five",
  ].join("\n");

  const frame = await renderFrame(
    React.createElement(
      Scroll,
      { height: 2, children: React.createElement(Text, null, lines) },
    ),
  );

  assertEquals(frame, "  ↑ 2 more | ↓ 2 more\n· three");
});

function createInteractiveProps(fileCount: number): InteractiveProps {
  const files: Record<string, FileState> = {};
  const fileOrder: string[] = [];

  for (let index = 0; index < fileCount; index++) {
    const id = `http/file-${index + 1}.http`;
    fileOrder.push(id);
    files[id] = {
      path: id,
      relativePath: id,
      status: "done",
      blockIds: [],
    };
  }

  return {
    files,
    fileOrder,
    blocks: {},
    phase: "done",
    messages: [],
    successCount: 0,
    failCount: 0,
    ignoreCount: 0,
    startTime: 0,
    endTime: 1,
    actualThreadsUsed: 1,
    exitCode: 0,
    isWatchMode: false,
    watchPaths: [],
    watchTriggerPaths: [],
    noAnimation: true,
    onExit: () => {},
  };
}

test("[interactive] done phase uses Scroll to show overflow counts", async () => {
  const frame = await renderFrame(
    React.createElement(DisplayInteractive, createInteractiveProps(20)),
  );

  assertStringIncludes(frame, "  ↓ 5 more");
  assertStringIncludes(frame, "http/file-1.http");
  assertStringIncludes(frame, "↑↓ navigate");
  assert(!frame.includes("__TEPI_SCROLL_ANCHOR__"));
});