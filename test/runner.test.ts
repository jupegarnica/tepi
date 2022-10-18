import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/cli.ts";



Deno.test("[runner] find one file", async () => {
   const files =  await runner(['test/data/test1.http'], {verbose: false});
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 5);
});
