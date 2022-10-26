import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { fileTextToBlocks } from "../src/fileTextToBlocks.ts";
import { stub } from "https://deno.land/std@0.160.0/testing/mock.ts";
Deno.env.get("NO_LOG") && stub(console, "info");

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
