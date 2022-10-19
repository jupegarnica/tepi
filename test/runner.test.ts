import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/cli.ts";



Deno.test("[runner] find one file", async () => {
    const files = await runner(['test/data/test1.http'], { displayIndex: 0 });
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 5);
});




Deno.test("[runner] must have found request, expected response, meta and actualResponse",
    // { only: true },
    async () => {
        const files = await runner(['test/data/test2.http'], { displayIndex: 0 });
        const firstBlock = files[0].blocks[0];
        assertEquals(firstBlock.request?.url, 'https://faker.deno.dev/pong?quiet=true&delay=200');
        assertEquals(firstBlock.meta?.boolean, true);
        assertEquals(firstBlock.actualResponse?.status, 200);
        assertEquals(firstBlock.expectedResponse?.status, 200);
    });


Deno.test('[runner] interpolation',
    { only: true },
    async () => {
        const files = await runner(['test/data/interpolate.http'], { displayIndex: 2 });
        const firstBlock = files[0].blocks[0];

        assertEquals(firstBlock.expectedResponse?.headers.get('content-type'), 'text/plain;charset=UTF-8');
        assertEquals(firstBlock.actualResponse?.bodyRaw, 'Hola Garn!');
        assertEquals(firstBlock.actualResponse?.bodyExtracted, 'Hola Garn!');
        const secondBlock = files[0].blocks[1];
        assertEquals(secondBlock.actualResponse?.bodyExtracted, 'pong');
    });
