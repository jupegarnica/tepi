import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { filePathsToFiles } from "../src/filePathsToFiles.ts";
Deno.test("[filePathsToFiles] must not have request", async () => {
  const files = await filePathsToFiles([`./test/data/test1.http`]);
  assertEquals(files?.[0].blocks?.[0]?.request, undefined);
});

Deno.test("[filePathsToFiles] must have a basic block", async () => {
  const files = await filePathsToFiles([`./test/data/test1.http`]);
  assertEquals(files?.[0].blocks?.[1], {
    meta: {
      endLine: 5,
      startLine: 2,
      filePath: "./test/data/test1.http",
    },
    text: "\nGET /html\n\n###\n",
  });
});
