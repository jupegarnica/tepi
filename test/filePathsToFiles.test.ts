import { assertEquals } from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { filePathsToFiles } from "../src/files.ts";
import { Block } from "../src/types.ts";
Deno.test("[filePathsToFiles] must not have request", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(files?.[0].blocks?.[0]?.request, undefined);
});

Deno.test("[filePathsToFiles] must have a basic block", async () => {
  const files = await filePathsToFiles([`./http/test1.http`]);
  assertEquals(files?.[0].blocks?.[1], new Block({
    meta: {
      _startLine: 4,
      _endLine: 7,
      _filePath: "./http/test1.http",
    },
    text: "\nGET /html\n\n###\n",
  }));
});
