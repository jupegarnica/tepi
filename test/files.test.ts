import { filePathsToFiles } from "../src/files.ts";
import { Block } from "../src/types.ts";

import { fileTextToBlocks } from "../src/files.ts";
import { test, vi, beforeAll } from "vitest";

import { assertEquals } from "@std/assert";
import { globsToFilePaths } from "../src/files.ts";

beforeAll(() => {
  if (process.env.NO_LOG) {
    vi.spyOn(console, "info").mockImplementation(() => {});
  }
});

test("[filePathsToFiles] must not have request", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(files?.[0].blocks?.[0]?.request, undefined);
});

test("[filePathsToFiles] must have a basic block", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(
    files?.[0].blocks?.[1],
    new Block({
      meta: {
        _startLine: 4,
        _endLine: 7,
        _filePath: "./http/test1.http",
        only: false,
      },
      text: "\nGET /html\n\n###\n",
    }),
  );
});

test("[globsToFilePaths] find one file", async () => {
  const files = await globsToFilePaths([`http/test1.http`]);
  assertEquals(files.length, 1);
});

test("[globsToFilePaths] find more file", async () => {
  const files = await globsToFilePaths([`**/test1.http`, `*/test2.http`]);
  assertEquals(files.length, 2);
});

test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`../*/http/test*.http`]);
  assertEquals(files.length, 2);
});

test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`**/test*.http`]);
  assertEquals(files.length, 2);
});

test("[globsToFilePaths] not found", async () => {
  const files = await globsToFilePaths([`notFound.http`]);
  assertEquals(files.length, 0);
});

// const http = String.raw
test(
  "[fileTextToBlocks]",
  () => {
    const blocks = fileTextToBlocks(
      `
GET http://faker.deno.dev
###
GET http://faker.deno.dev
    `,
      "test.http",
    );
    assertEquals(blocks.length, 2);
    assertEquals(blocks[0].meta._startLine, 0);
    assertEquals(blocks[0].meta._endLine, 2);
    assertEquals(blocks[1].meta._startLine, 3);
    assertEquals(blocks[1].meta._endLine, 4);
  },
);

test("[fileTextToBlocks]", () => {
  const blocks = fileTextToBlocks(`###`, "test.http");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].meta._startLine, 0);
  assertEquals(blocks[0].meta._endLine, 0);
});

test("[fileTextToBlocks] implicit split on consecutive method lines", () => {
  const blocks = fileTextToBlocks(
    `GET http://example.com/1\nGET http://example.com/2\nGET http://example.com/3`,
    "test.http",
  );
  assertEquals(blocks.length, 3);
  assertEquals(blocks[0].meta._startLine, 0);
  assertEquals(blocks[0].meta._endLine, 0);
  assertEquals(blocks[1].meta._startLine, 1);
  assertEquals(blocks[1].meta._endLine, 1);
  assertEquals(blocks[2].meta._startLine, 2);
  assertEquals(blocks[2].meta._endLine, 2);
});

test("[fileTextToBlocks] global meta block stays separate from bare requests", () => {
  const txt = `---\nhost: example.com\n---\n\nGET /url1\nGET /url2\n`;
  const blocks = fileTextToBlocks(txt, "test.http");
  assertEquals(blocks.length, 3);
  // Block 0: global meta (frontmatter, no request)
  assertEquals(blocks[0].text.includes("host: example.com"), true);
  assertEquals(blocks[0].text.includes("GET"), false);
  // Block 1: first GET
  assertEquals(blocks[1].text.trim(), "GET /url1");
  // Block 2: second GET
  assertEquals(blocks[2].text.trim(), "GET /url2");
});

test("[fileTextToBlocks] frontmatter attaches to following request when splitting", () => {
  const txt = `GET /url1\n\n---\nid: second\n---\nGET /url2\n`;
  const blocks = fileTextToBlocks(txt, "test.http");
  assertEquals(blocks.length, 2);
  assertEquals(blocks[0].text.trim(), "GET /url1");
  assertEquals(blocks[1].text.includes("id: second"), true);
  assertEquals(blocks[1].text.includes("GET /url2"), true);
});

test("[fileTextToBlocks] Eta conditional GET lines do not trigger implicit split", () => {
  const txt = [
    "---",
    "id: conditional",
    "---",
    "<% if (true) { %>",
    "GET /url1",
    "<% } else { %>",
    "GET /url2",
    "<% } %>",
    "",
  ].join("\n");
  const blocks = fileTextToBlocks(txt, "test.http");
  // All lines belong to one block — no implicit split inside Eta conditionals
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].text.includes("GET /url1"), true);
  assertEquals(blocks[0].text.includes("GET /url2"), true);
});
