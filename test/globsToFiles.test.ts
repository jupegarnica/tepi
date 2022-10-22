import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { globsToFilePaths } from "../src/globsToFilePaths.ts";
// import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
// Deno.env.get('NO_LOG') && stub(console, 'info')

Deno.test("[globsToFilePaths] find one file", async () => {
  const files = await globsToFilePaths([`test/data/test1.http`]);
  assertEquals(files.length, 1);
});

Deno.test("[globsToFilePaths] find more file", async () => {
  const files = await globsToFilePaths([`**/test1.http`, `test/*/test2.http`]);
  assertEquals(files.length, 2);
});

Deno.test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`../*/test/data/test*.http`]);
  assertEquals(files.length, 2);
});

Deno.test("[globsToFilePaths] find more file with a glob pattern", async () => {
  const files = await globsToFilePaths([`**/test*.http`]);
  assertEquals(files.length, 2);
});
