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
