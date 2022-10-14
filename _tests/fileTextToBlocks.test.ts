import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { fileTextToBlocks } from "../http.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

// const http = String.raw
Deno.test("[fileTextToBlocks]",
    // { only: true },
    () => {
        const blocks = fileTextToBlocks(
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


Deno.test("[fileTextToBlocks]", () => {
    const blocks = fileTextToBlocks(`###`);
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0].startLine, 0);
    assertEquals(blocks[0].endLine, 0);
})



Deno.test("[fileTextToBlocks] must have request", () => {
    const blocks = fileTextToBlocks(`GET https://faker.deno.dev`);
    assertEquals(blocks.length, 1);
    assertEquals(blocks[0].request?.url, 'https://faker.deno.dev/');
    assertEquals(blocks[0].request?.method, 'GET');
})
