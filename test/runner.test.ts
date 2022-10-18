import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/cli.ts";



Deno.test("[runner] find one file", async () => {
    const files = await runner(['test/data/test1.http'], { verbose: false });
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 5);
});




Deno.test("[runner] must have found request, expected response, meta and actualResponse",
    { only: true },
    async () => {
        const files = await runner(['test/data/test2.http'], { verbose: false });
        const firstBlock = files[0].blocks[0];
        assertEquals(firstBlock.request?.url, 'https://faker.deno.dev/pong?quiet=true&delay=2000');
        assertEquals(firstBlock.meta?.boolean, true);
        assertEquals(firstBlock.actualResponse?.status, 200);
        assertEquals(firstBlock.expectedResponse?.status, 200);
    });
