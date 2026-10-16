import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import * as fmt from "@std/fmt/colors";
import { test } from "vitest";
import { TermDOM } from "@b9g/termdom";
import { Scroll, SCROLL_ANCHOR_SENTINEL } from "../src/ui/shared/Scroll/index.ts";
import { ansiToHtml } from "../src/ui/utils/ansi.ts";
import { DisplayInteractive } from "../src/ui/displays/DisplayInteractive/DisplayInteractive.tsx";
import type { InteractiveProps } from "../src/ui/displays/DisplayInteractive/DisplayInteractive.types.ts";
import type { FileState } from "../src/ui/store/store.ts";

function stripOutput(text: string | undefined): string {
  return fmt.stripAnsiCode(text ?? "");
}

type MockTransport = {
  writes: string[];
  close(): void;
};

function createMockTransport(): {
  transport: unknown;
  writes: string[];
} {
  const writes: string[] = [];
  const transport = {
    cols: 150,
    rows: 24,
    sharesScreen: true,
    interactive: false,
    ready: Promise.resolve(),
    closed: new Promise(() => {}),
    readable: new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    writable: new WritableStream({
      write(chunk) {
        writes.push(String(chunk));
      },
    }),
    resizes: new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    close() {},
  };

  return { transport, writes };
}

/**
 * termdom-based render harness: takes a view string (the same "lines joined
 * with \n" representation the production term layer renders), paints it on a
 * termdom document and returns the ANSI frame as ink-testing-library would.
 */
async function renderFrame(view: string): Promise<string> {
  const { transport } = createMockTransport();
  const term = new TermDOM({ transport: transport as never });
  const bodyHtml = view.length
    ? (view.split("\n") as string[]).map((line) => `<div style="white-space:pre">${ansiToHtml(line)}</div>`).join("")
    : "";
  term.document.body.innerHTML = bodyHtml;
  const frame = term.renderANSI();
  await term.dispose();

  // renderANSI guarantees a trailing newline; ink frames ended without one.
  return stripOutput(frame).replace(/\n$/, "");
}

async function renderRawFrame(view: string): Promise<string> {
  const { transport } = createMockTransport();
  const term = new TermDOM({ transport: transport as never });
  const bodyHtml = view.length
    ? (view.split("\n") as string[]).map((line) => `<div style="white-space:pre">${ansiToHtml(line)}</div>`).join("")
    : "";
  term.document.body.innerHTML = bodyHtml;
  const frame = term.renderANSI();
  await term.dispose();
  return frame;
}

test("[scroll] renders arbitrary ReactNode content without markers when it fits", async () => {
  const frame = await renderFrame(
    renderScroll({ height: 5, children: ["alpha", "beta"] }),
  );

  assertEquals(frame, "alpha\nbeta");
});

function CustomLine({ text, anchor = false }: { text: string; anchor?: boolean }) {
  return `${anchor ? SCROLL_ANCHOR_SENTINEL : ""}${text}`;
}

test("[scroll] serializes pure function components inside the tree", async () => {
  const frame = await renderFrame(
    renderScroll({
      height: 3,
      children: [CustomLine({ text: "one" }), CustomLine({ text: "· two", anchor: true }), CustomLine({ text: "three" })],
    }),
  );

  assertEquals(frame, "one\n· two\nthree");
});

test("[scroll] preserves Ink Text colors while serializing component trees", async () => {
  const previousColors = fmt.getColorEnabled();
  fmt.setColorEnabled(true);

  try {
    const raw = await renderRawFrame(
      renderScroll({
        height: 2,
        children: [fmt.green("green line"), fmt.dim("dim line")],
      }),
    );
    // raw frame keeps the SGR codes; strip them and the single trailing
    // newline that termdom's renderANSI guarantees (ink frames had none).
    const frame = stripOutput(raw).replace(/\n$/, "");

    assertStringIncludes(raw, "\u001b[");
    assertEquals(frame, "green line\ndim line");
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
    renderScroll({ height: 3, children: [lines] }),
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
    renderScroll({ height: 2, children: [lines] }),
  );

  assertEquals(frame, "  ↑ 2 more | ↓ 2 more\n· three");
});

/**
 * Mirrors the ink <Scroll height={n}> children arrangement: the display lines
 * are passed to Scroll the same way ink rendered them, but with the termdom
 * view primitives (strings instead of React nodes).
 */
function renderScroll({ height, children }: { height: number; children: string[] }): string {
  return Scroll({ height, children: children.filter((c) => c.length).join("\n") });
}

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
  } as InteractiveProps;
}

test("[interactive] done phase uses Scroll to show overflow counts", async () => {
  const view = DisplayInteractive(createInteractiveProps(20));
  const frame = await renderFrame(view);

  assertStringIncludes(frame, "  ↓ 5 more");
  assertStringIncludes(frame, "http/file-1.http");
  assertStringIncludes(frame, "↑↓ navigate");
  assert(!frame.includes("__TEPI_SCROLL_ANCHOR__"));
});
