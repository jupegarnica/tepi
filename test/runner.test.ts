import { assertEquals, AssertionError } from "https://deno.land/std@0.158.0/testing/asserts.ts";
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

    async () => {
        const files = await runner(['test/data/interpolate.http'], { displayIndex: 0 });
        const firstBlock = files[0].blocks[0];

        assertEquals(firstBlock.expectedResponse?.headers.get('content-type'), 'text/plain;charset=UTF-8');
        await firstBlock.actualResponse?.extractBody()
        assertEquals(firstBlock.actualResponse?.bodyExtracted, 'Hola Garn!');

        const secondBlock = files[0].blocks[1];
        assertEquals(secondBlock.expectedResponse?.body, undefined);

        const thirdBlock = files[0].blocks[2];
        await thirdBlock.expectedResponse?.extractBody()
        assertEquals(thirdBlock.expectedResponse?.bodyExtracted, undefined);
        assertEquals(thirdBlock.error?.message, 'ups');
        const fourthBlock = files[0].blocks[3];
        await fourthBlock.expectedResponse?.extractBody()
        assertEquals(fourthBlock.expectedResponse?.bodyExtracted, 'hola');
        assertEquals(fourthBlock.error, undefined);

    });


Deno.test('[runner] asserts ',
    async () => {
        const files = await runner(['test/data/assert.http'], { displayIndex: 0 });
        const firstBlock = files[0].blocks[0];
        assertEquals(firstBlock.error instanceof AssertionError, true);
        const secondBlock = files[0].blocks[1];
        assertEquals(secondBlock.error, undefined);
        const thirdBlock = files[0].blocks[2];
        assertEquals(thirdBlock.error?.message, 'failed!');
        const fourthBlock = files[0].blocks[3];
        assertEquals(fourthBlock.error?.message.startsWith('Values are not equal'), true);
    });



// Deno.test('[runner] host meta data',
//     // { only: true },
//     async () => {
//         const files = await runner(['test/data/assert.http'], { displayIndex: 0 });
//         const firstBlock = files[0].blocks[0];

//         assertEquals(firstBlock.request?.url, 'https://faker.deno.dev');


//     });
