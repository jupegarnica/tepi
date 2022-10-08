import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runHttpFiles } from "./http.ts";
// import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
// Deno.env.get('NO_LOG') && stub(console, 'info')

Deno.test("[runHttpFiles] find one file", async () => {
    const files = await runHttpFiles(`test-data/test1.http`);
    assertEquals(files.length, 1);
})


Deno.test("[runHttpFiles] find more file", async () => {
    const files = await runHttpFiles(`**/test1.http */test2.http`);
    assertEquals(files.length, 2);
})

Deno.test("[runHttpFiles] find more file with a glob pattern", async () => {
    const files = await runHttpFiles(`../*/test-data/test*.http`);
    assertEquals(files.length, 2);
})

Deno.test("[runHttpFiles] find more file with a glob pattern", async () => {
    const files = await runHttpFiles(`**/test*.http`);
    assertEquals(files.length, 2);
})