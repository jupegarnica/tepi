import { _Response, Block } from "./types.ts";
import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";

export async function assertResponse(block: Block) {
  const { expectedResponse, actualResponse } = block;
  if (!expectedResponse) {
    throw new Error("block.expectedResponse is undefined");
  }
  if (!actualResponse) {
    throw new Error("block.actualResponse is undefined");
  }

  if (!expectedResponse.bodyExtracted) {
    await expectedResponse.extractBody();
  }
  if (!actualResponse.bodyExtracted) {
    await actualResponse.extractBody();
  }

  if (expectedResponse.status) {
    assertEquals(expectedResponse.status, actualResponse.status);
  }
  if (expectedResponse.statusText) {
    assertEquals(expectedResponse.statusText, actualResponse.statusText);
  }

  if (expectedResponse.bodyExtracted) {
    if (
      typeof expectedResponse.bodyExtracted === "object" &&
      typeof actualResponse.bodyExtracted === "object"
    ) {
      assertObjectMatch(
        actualResponse.bodyExtracted as Record<string, unknown>,
        expectedResponse.bodyExtracted as Record<string, unknown>,
      );
    } else {
      assertEquals(
        actualResponse.bodyExtracted,
        expectedResponse.bodyExtracted,
      );
    }
  }
  if (expectedResponse.headers) {
    for (const [key, value] of expectedResponse.headers.entries()) {
      assertEquals(actualResponse.headers.get(key), value);
    }
  }
}
