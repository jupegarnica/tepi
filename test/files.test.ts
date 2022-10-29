import { filePathsToFiles } from "../src/files.ts";
import { Block } from "../src/types.ts";

import { fileTextToBlocks } from "../src/files.ts";
import { stub } from "https://deno.land/std@0.160.0/testing/mock.ts";

import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { globsToFilePaths } from "../src/files.ts";
// import { stub } from "https://deno.land/std@0.160.0/testing/mock.ts";


Deno.env.get("NO_LOG") && stub(console, "info");

Deno.test("[filePathsToFiles] must not have request", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(files?.[0].blocks?.[0]?.request, undefined);
});

Deno.test("[filePathsToFiles] must have a basic block", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(
    files?.[0].blocks?.[1],
    new Block({
      meta: {
        _startLine: 4,
        _endLine: 7,
        _filePath: "./http/test1.http",
      },
      text: "\nGET /html\n\n###\n",
    }),
  );
});

Deno.test("[globsToFilePaths] find one file", async () => {
  const files = await globsToFilePaths([`http/test1.http`]);
  assertEquals(files.length, 1);
});

Deno.test("[globsToFilePaths] find more file", async () => {
  const files = await globsToFilePaths([`**/test1.http`, `*/test2.http`]);
  assertEquals(files.length, 2);
});

Deno.test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`../*/http/test*.http`]);
  assertEquals(files.length, 2);
});

Deno.test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`**/test*.http`]);
  assertEquals(files.length, 2);
});

Deno.test("[globsToFilePaths] not found", async () => {
  const files = await globsToFilePaths([`notFound.http`]);
  assertEquals(files.length, 0);
});

// const http = String.raw
Deno.test(
  "[fileTextToBlocks]", // { only: true },
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

Deno.test("[fileTextToBlocks]", () => {
  const blocks = fileTextToBlocks(`###`, "test.http");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].meta._startLine, 0);
  assertEquals(blocks[0].meta._endLine, 0);
});
