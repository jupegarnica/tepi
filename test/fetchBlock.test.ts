import {
  assertEquals,
  assertRejects,
} from "jsr:@std/assert@0.225.2";
import { consumeBodies, fetchBlock } from "../src/fetchBlock.ts";
import { stub } from "jsr:@std/testing@0.224.0/mock";
import { parseBlockText } from "../src/parser.ts";
import { Block } from "../src/types.ts";
Deno.env.get("NO_LOG") && stub(console, "info");

const HOST = Deno.env.get("HOST") || "https://faker.deno.dev";
const HOST_HTTPBIN = Deno.env.get("HOST_HTTPBIN") || "http://httpbin.org";

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse",
  // { only: true },
  async () => {
    const block = new Block({
      meta: {},
      text: `
        GET ${HOST_HTTPBIN}/status/400

        HTTP/1.1 403 Forbidden
        `,
    });
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.status, 403);
    assertEquals(block.actualResponse?.status, 400);
    await consumeBodies(block);
  },
);

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse",
  // { only: true },
  async () => {
    const block = new Block({
      meta: {},
      text: `
GET ${HOST}?status=400
x-quiet: true

HTTP/1.1 400 Forbidden
`,
    });
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.statusText, "Forbidden");
    assertEquals(block.actualResponse?.statusText, "Bad Request");
    await consumeBodies(block);
  },
);

Deno.test(
  "[fetchBlock] with expectedResponse and actualResponse",
  // { only: true },
  async () => {
    const block = new Block({
      meta: {},
      text: `
GET ${HOST}?status=400
x-quiet:true

HTTP/1.1 400 Forbidden
`,
    });
    await parseBlockText(block);
    await fetchBlock(block);
    assertEquals(block.expectedResponse?.statusText, "Forbidden");
    assertEquals(block.actualResponse?.statusText, "Bad Request");
    await consumeBodies(block);
  },
);

Deno.test("[fetchBlock] with expectedResponse plain test body", async () => {
  const block = new Block({
    meta: {},
    text: `
            POST ${HOST_HTTPBIN}/text
            Content-Type: text/plain

            hola mundo

            HTTP/1.1 200 OK
            Content-Type: text/plain

            hola mundo

            `,
  });
  await parseBlockText(block);
  const { expectedResponse } = await fetchBlock(block);
  await consumeBodies(block);
  assertEquals(expectedResponse?.status, 200);
});

Deno.test(
  "[fetchBlock] with expectedResponse json body", // { only: true },
  // { ignore: true },
  async () => {
    const block = new Block({
      meta: {},
      text: `
            POST ${HOST}/pong?quiet=true
            Content-Type: application/json

            {"foo":"bar"}

            HTTP/1.1 200 OK
            Content-Type: application/json

            {"foo":"bar"}

            `,
    });
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
      await fetchBlock(new Block({ text: "" }));
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
// POST ${HOST}/pong?quiet=true
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
// POST ${HOST}/pong?quiet=true
// Content-Type: application/json

// { "foo":"bar" ,  "bar": "foo" }

// HTTP/1.1 200 OK
// Content-Type: application/json

// {"foo":"bar", "b": "f"}

//     `);
//         });

//     })
