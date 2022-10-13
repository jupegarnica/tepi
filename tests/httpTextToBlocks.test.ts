import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { httpTextToBlocks } from "../http.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

// const http = String.raw
Deno.test("[httpTextToBlocks]",
    // { only: true },
    () => {
        const blocks = httpTextToBlocks(
`
GET http://faker.deno.dev
###
GET http://faker.deno.dev
    `
    );
        assertEquals(blocks.length, 2);
        assertEquals(blocks[0].startLine, 0);
        assertEquals(blocks[0].endLine, 2);
        assertEquals(blocks[1].startLine, 3);
        assertEquals(blocks[1].endLine, 4);

    })


Deno.test("[httpTextToBlocks]", () => {
    const blocks = httpTextToBlocks(`###`);
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0].startLine, 0);
    assertEquals(blocks[0].endLine, 0);
})
