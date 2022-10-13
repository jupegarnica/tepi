import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { globsToFiles } from "./http.ts";
// import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
// Deno.env.get('NO_LOG') && stub(console, 'info')

Deno.test("[globsToFiles] find one file", async () => {
    const files = await globsToFiles(`test-data/test1.http`);
    assertEquals(files.length, 1);
})


Deno.test("[globsToFiles] find more file", async () => {
    const files = await globsToFiles(`**/test1.http */test2.http`);
    assertEquals(files.length, 2);
})

Deno.test("[globsToFiles] find more file with a glob pattern", async () => {
    const files = await globsToFiles(`../*/test-data/test*.http`);
    assertEquals(files.length, 2);
})

Deno.test("[globsToFiles] find more file with a glob pattern", async () => {
    const files = await globsToFiles(`**/test*.http`);
    assertEquals(files.length, 2);
})