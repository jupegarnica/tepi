import {
  assertEquals,
  assertRejects,
} from "@std/assert";
import { consumeBodies, fetchBlock } from "../src/fetchBlock.ts";
import { test, vi, beforeAll } from "vitest";
import { parseBlockText } from "../src/parser.ts";
import { Block } from "../src/types.ts";

beforeAll(() => {
  if (process.env.NO_LOG) {
    vi.spyOn(console, "info").mockImplementation(() => {});
  }
});

const HOST = process.env.HOST || "https://faker.deno.dev";
const HOST_HTTPBIN = process.env.HOST_HTTPBIN || "http://httpbin.org";

test(
  "[fetchBlock] with expectedResponse and actualResponse",
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

test(
  "[fetchBlock] with expectedResponse and actualResponse",
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

test(
  "[fetchBlock] with expectedResponse and actualResponse",
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

test("[fetchBlock] with expectedResponse plain test body", async () => {
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

test(
  "[fetchBlock] with expectedResponse json body",
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
  },
);

test(
  "[fetchBlock] run block with request must throw error",
  async () => {
    await assertRejects(async () => {
      await fetchBlock(new Block({ text: "" }));
    });
  },
);
