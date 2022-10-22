import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { consumeBodies, fetchBlock } from "../src/fetchBlock.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
import { parseBlockText } from "../src/parseBlockText.ts";
import { Block } from "../src/types.ts";
Deno.env.get("NO_LOG") && stub(console, "info");

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse", // { only: true },
  async () => {
    const block: Block = {
      meta: {},
      text: `
        GET http://httpbin.org/status/400

        HTTP/1.1 403 Forbidden
        `,
    };
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.status, 403);
    assertEquals(block.actualResponse?.status, 400);
    await consumeBodies(block);
  },
);

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse", // { only: true },
  async () => {
    const block: Block = {
      meta: {},
      text: `
GET http://httpbin.org/status/400

HTTP/1.1 400 Forbidden
`,
    };
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.statusText, "Forbidden");
    assertEquals(block.actualResponse?.statusText, "Bad Request");
    await consumeBodies(block);
  },
);

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse", // { only: true },
  async () => {
    const block: Block = {
      meta: {},
      text: `
GET http://httpbin.org/status/400

HTTP/1.1 400 Forbidden
`,
    };
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.statusText, "Forbidden");
    assertEquals(block.actualResponse?.statusText, "Bad Request");
    await consumeBodies(block);
  },
);

Deno.test("[fetchBlock] with expectedResponse plain test body", async () => {
  const block = {
    meta: {},
    text: `
            POST http://httpbin.org/text
            Content-Type: text/plain

            hola mundo

            HTTP/1.1 200 OK
            Content-Type: text/plain

            hola mundo

            `,
  };
  await parseBlockText(block);
  const { expectedResponse } = await fetchBlock(block);
  await consumeBodies(block);
  assertEquals(expectedResponse?.status, 200);
});

Deno.test(
  "[fetchBlock] with expectedResponse json body", // { only: true },
  // { ignore: true },
  async () => {
    const block: Block = {
      meta: {},
      text: `
            POST https://faker.deno.dev/pong?quite=true
            Content-Type: application/json

            {"foo":"bar"}

            HTTP/1.1 200 OK
            Content-Type: application/json

            {"foo":"bar"}

            `,
    };
    await parseBlockText(block);
    await fetchBlock(block);
    await consumeBodies(block);
    assertEquals(block.expectedResponse?.bodyRaw, '{"foo":"bar"}');
    assertEquals(block.expectedResponse?.status, 200);
    // assertEquals(block.expectedResponse, block.actualResponse);
  },
);

Deno.test(
  "[fetchBlock] run block with request must throw error", // { only: true },
  // { ignore: true },
  async () => {
    await assertRejects(async () => {
      await fetchBlock({ meta: {}, text: "" });
    });
  },
);

// TODO rethink this

// Deno.test("[fetchBlock] with response json body contains",
//     // { only: true },
//     { ignore: true },
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
