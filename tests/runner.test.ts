import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../main.ts";



Deno.test("[runner] find one file", async () => {
   const files =  await runner({ _: ['tests/data/test1.http'] });
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 5);
});
