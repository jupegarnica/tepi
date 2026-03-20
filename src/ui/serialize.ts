import type { _Request, _Response, Meta } from "../types.ts";
import type {
  SerializedHeaders,
  SerializedRequest,
  SerializedResponse,
} from "./store.ts";
import { contentTypeToLanguage, highlight } from "../highlight.ts";

function serializeHeaders(headers: Headers): SerializedHeaders {
  const result: SerializedHeaders = [];
  for (const [key, value] of headers.entries()) {
    result.push([key, value]);
  }
  return result;
}

export function serializeRequest(
  request: _Request,
): SerializedRequest {
  const serialized: SerializedRequest = {
    method: request.method,
    url: request.url,
    headers: serializeHeaders(request.headers),
  };

  if (request.bodyExtracted !== undefined) {
    serialized.body =
      typeof request.bodyExtracted === "string"
        ? request.bodyExtracted
        : JSON.stringify(request.bodyExtracted, null, 2);
  }

  return serialized;
}

export async function serializeResponse(
  response: _Response,
): Promise<SerializedResponse> {
  const contentType = response.headers.get("content-type") || "";
  const serialized: SerializedResponse = {
    status: response.status,
    statusText: response.statusText,
    headers: serializeHeaders(response.headers),
    contentType,
  };

  try {
    const body = await response.getBody();
    if (body !== undefined && body !== null) {
      let bodyStr =
        typeof body === "string" ? body : JSON.stringify(body, null, 2);

      // Apply syntax highlighting if applicable
      const language = contentTypeToLanguage(contentType);
      if (language && typeof bodyStr === "string") {
        bodyStr = highlight(bodyStr, language);
      }

      serialized.body = bodyStr;
    }
  } catch {
    // Body may already be consumed or unavailable
  }

  return serialized;
}

export function serializeMeta(meta: Meta): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in meta) {
    if (key.startsWith("_") || meta[key] === undefined) continue;
    result[key] = meta[key];
  }
  return result;
}
