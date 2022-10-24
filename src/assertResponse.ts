import { _Response, Block } from "./types.ts";
import {
  assertEquals,
  AssertionError,
  assertObjectMatch,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";

export async function assertResponse(block: Omit<Block, "meta">) {
  const { expectedResponse, actualResponse } = block;
  if (!expectedResponse) {
    throw new AssertionError("block.expectedResponse is undefined");
  }
  if (!actualResponse) {
    throw new AssertionError("block.actualResponse is undefined");
  }

  if (expectedResponse.status) {
    try {
      assertEquals(expectedResponse.status, actualResponse.status);
    } catch (error) {
      throw new AssertionError(`Status code mismatch\n${error.message}`);
    }
  }
  if (expectedResponse.statusText) {
    try {
      assertEquals(expectedResponse.statusText, actualResponse.statusText);
    } catch (error) {
      throw new AssertionError(`Status text mismatch\n${error.message}`);
    }
  }

  if (await expectedResponse.getBody()) {
    let assertBody: typeof assertEquals | typeof assertObjectMatch
      = assertEquals;
    if (
      typeof await expectedResponse.getBody() === "object" &&
      typeof await actualResponse.getBody() === "object"
    ) {
      assertBody = assertObjectMatch;
    }
    try {
      assertBody(
        await actualResponse.getBody() as Record<string, unknown>,
        await expectedResponse.getBody() as Record<string, unknown>,
      );
    } catch (error) {
      throw new AssertionError(`Body mismatch\n${error.message}`);
    }
  }
  if (expectedResponse.headers) {
    for (const [key, value] of expectedResponse.headers.entries()) {
      assertEquals(actualResponse.headers.get(key), value);
    }
  }
}
