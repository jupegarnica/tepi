import { Block, _Response } from "./types.ts";
import { assertEquals, assertObjectMatch } from "https://deno.land/std@0.158.0/testing/asserts.ts";

export function assertResponse(block: Block) {


  const { response, actualResponse } = block;
  if (!response) {
    throw new Error('block.response is undefined');
  }
  if (!actualResponse) {
    throw new Error('block.actualResponse is undefined');
  }

  if (response.status)
    assertEquals(response.status, actualResponse.status);
  if (response.statusText)
    assertEquals(response.statusText, actualResponse.statusText);
  if (response.bodyExtracted) {
    if (typeof response.bodyExtracted === 'object' && typeof actualResponse.bodyExtracted === 'object') {
      assertObjectMatch(
        actualResponse.bodyExtracted as Record<string, unknown>,
        response.bodyExtracted as Record<string, unknown>
      );
    } else {
      assertEquals(actualResponse.bodyExtracted, response.bodyExtracted);
    }

  }
  if (response.headers) {

    for (const [key, value] of response.headers.entries()) {
      assertEquals(actualResponse.headers.get(key), value);
    }
  }
}
