import { _Response, Block } from "./types.ts";
import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";

export async function assertResponse(block: Omit<Block, "meta">) {
  const { expectedResponse, actualResponse } = block;
  if (!expectedResponse) {
    throw new Error("block.expectedResponse is undefined");
  }
  if (!actualResponse) {
    throw new Error("block.actualResponse is undefined");
  }

  if (expectedResponse.status) {
    assertEquals(expectedResponse.status, actualResponse.status);
  }
  if (expectedResponse.statusText) {
    assertEquals(expectedResponse.statusText, actualResponse.statusText);
  }
  if (await expectedResponse.getBody()) {
    if (
      typeof await expectedResponse.getBody() === "object" &&
      typeof await actualResponse.getBody() === "object"
    ) {
      assertObjectMatch(
        await actualResponse.getBody() as Record<string, unknown>,
        await expectedResponse.getBody() as Record<string, unknown>,
      );
    } else {
      assertEquals(
        await actualResponse.getBody(),
        await expectedResponse.getBody(),
      );
    }
  }
  if (expectedResponse.headers) {
    for (const [key, value] of expectedResponse.headers.entries()) {
      assertEquals(actualResponse.headers.get(key), value);
    }
  }
}
