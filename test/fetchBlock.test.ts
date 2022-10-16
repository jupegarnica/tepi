import { assertEquals, assertRejects } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { fetchBlock } from "../src/fetchBlock.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
import { parseBlockText } from "../src/parseBlockText.ts";
import { Block } from "../src/types.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

Deno.test("[fetchBlock] with expectedResponse and actualResponse",
    // { only: true },
    async () => {
        const block: Block = {
            text: `
        GET http://httpbin.org/status/400

        HTTP/1.1 403 Forbidden
        `}
        parseBlockText(block);
        await fetchBlock(block);
        assertEquals(block.expectedResponse?.status, 403);
        assertEquals(block.actualResponse?.status, 400);
        if (!block.expectedResponse?.bodyUsed) {
            await block.expectedResponse?.body?.cancel();
        }
        if (!block.actualResponse?.bodyUsed) {
            await block.actualResponse?.body?.cancel();
        }

    })



Deno.test("[fetchBlock] with expectedResponse and actualResponse",
    // { only: true },
    async () => {
        const block: Block = {
            text: `
GET http://httpbin.org/status/400

HTTP/1.1 400 Forbidden
`}
        parseBlockText(block);
        await fetchBlock(block);
        assertEquals(block.expectedResponse?.statusText, 'Forbidden');
        assertEquals(block.actualResponse?.statusText, 'Bad Request');
        if (!block.expectedResponse?.bodyUsed) {
            await block.expectedResponse?.body?.cancel();
        }
        if (!block.actualResponse?.bodyUsed) {
            await block.actualResponse?.body?.cancel();
        }
    })



Deno.test("[fetchBlock] with expectedResponse and actualResponse",
    // { only: true },
    async () => {
        const block: Block = {
            text: `
GET http://httpbin.org/status/400

HTTP/1.1 400 Forbidden
`}
        parseBlockText(block);
        await fetchBlock(block);
        assertEquals(block.expectedResponse?.statusText, 'Forbidden');
        assertEquals(block.actualResponse?.statusText, 'Bad Request');
        if (!block.expectedResponse?.bodyUsed) {
            await block.expectedResponse?.body?.cancel();
        }
        if (!block.actualResponse?.bodyUsed) {
            await block.actualResponse?.body?.cancel();
        }
    })

// Deno.test("[fetchBlock] with expectedResponse plain test body",
//     { ignore: true }, // TODO rethink this test
//     async () => {
//         const expectedResponse = await fetchBlock(
//             `
// POST http://httpbin.org/text
// Content-Type: text/plain

// hola mundo

// HTTP/1.1 200 OK
// Content-Type: text/plain

// hola mundo

// `);
//         assertEquals(expectedResponse?.status, 200);

//     })



// Deno.test("[fetchBlock] with expectedResponse json body",
//     // { only: true },
//     // { ignore: true },
//     async () => {
//         const expectedResponse = await fetchBlock(
//             `
// POST https://faker.deno.dev/pong?quite=true
// Content-Type: application/json

// {"foo":"bar"}

// HTTP/1.1 200 OK
// Content-Type: application/json

// {"foo":"bar"}

// `);
//         // assertEquals(expectedResponse?.bodyRaw, '{"foo":"bar"}');
//         assertEquals(expectedResponse?.bodyExtracted, { foo: "bar" });
//         assertEquals(expectedResponse?.status, 200);

//     })



// Deno.test("[fetchBlock] run empty block",
//     // { only: true },
//     // { ignore: true },
//     async () => {
//         const expectedResponse = await fetchBlock(``);
//         assertEquals(expectedResponse, undefined);

//     })





// Deno.test("[fetchBlock] with response json body throws",
//     // { only: true },
//     async () => {
//         await assertRejects(async () => {
//             await fetchBlock(
//                 `
//     POST https://faker.deno.dev/pong?quite=true
//     Content-Type: application/json

//     {"foo":"bar"}

//     HTTP/1.1 200 OK
//     Content-Type: application/json

//     {"hey":"bar"}

//     `);
//         });

//     })


// Deno.test("[fetchBlock] with response json body contains",
//     // { only: true },
//     // { ignore: true },
//     async () => {
//         const response = await fetchBlock(
//             `
// POST https://faker.deno.dev/pong?quite=true
// Content-Type: application/json

// { "foo":"bar" ,  "bar": "foo" }

// HTTP/1.1 200 OK
// Content-Type: application/json

// {"foo":"bar"}

// `);
//         assertEquals(response?.status, 200);

//     })


// Deno.test("[fetchBlock] with response json body contains throws",
//     // { only: true },
//     async () => {
//         await assertRejects(async () => {
//             await fetchBlock(
//                 `
// POST https://faker.deno.dev/pong?quite=true
// Content-Type: application/json

// { "foo":"bar" ,  "bar": "foo" }

// HTTP/1.1 200 OK
// Content-Type: application/json

// {"foo":"bar", "b": "f"}

//     `);
//         });

//     })
