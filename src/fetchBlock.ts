import {
  mimesToBlob,
  mimesToFormData,
  mimesToJSON,
  mimesToText,
} from "./types.ts";

import { delay } from "jsr:@std/async@0.224.0/delay";

import { type _Request, _Response, type Block } from "./types.ts";

export async function fetchBlock(
  block: Block,
): Promise<Block> {
  const { request } = block;
  if (!request) {
    throw new Error("block.request is undefined");
  }
  const ctl = new AbortController();
  const signal = ctl.signal;
  let timeoutId;
  const _delay = Number(block.meta.delay);
  if (delay) {
    await delay(_delay);
  }
  const timeout = Number(block.meta.timeout);
  if (timeout) {
    timeoutId = setTimeout(() => ctl.abort(), timeout);
  }

  try {
    const response = await fetch(request, { signal });
    const actualResponse = _Response.fromResponse(response, request.bodyRaw);
    block.actualResponse = actualResponse;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new error.constructor(
        `Timeout of ${block.meta.timeout}ms exceeded`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  return block;
}

export async function extractBody(
  re: _Response | _Request,
): Promise<_Response | _Request> {
  const contentType = re.headers.get("content-type") || "";
  const includes = (ct: string) => contentType.includes(ct);

  if (re.bodyUsed) {
    if (re.bodyExtracted !== undefined) {
      return re;
    }
    if (typeof re.bodyRaw === "string") {
      const requestExtracted = mimesToJSON.some((ct) =>
          contentType.includes(ct)
        )
        ? JSON.parse(re.bodyRaw as string)
        : re.bodyRaw;
      re.bodyExtracted = requestExtracted;
      return re;
    }
    return re;
  }

  if (!contentType) {
    re.bodyExtracted = undefined;
    return re;
  }

  if (mimesToText.some(includes)) {
    const body = await re.text();
    re.bodyExtracted = body;
    return re;
  }
  if (mimesToJSON.some(includes)) {
    const body = await re.json();
    re.bodyExtracted = body;
    return re;
  }
  if (mimesToBlob.some(includes)) {
    const body = await re.blob();
    re.bodyExtracted = body;
    return re;
  }
  if (mimesToFormData.some(includes)) {
    const body = await re.formData();
    re.bodyExtracted = body;
    return re;
  }
  // TODO: arrayBuffer as default?
  const body = await re.arrayBuffer();
  re.bodyExtracted = body;
  return re;
  // if (mimesToArrayBuffer.some(includes)) {
  // } else {}
  // throw new Error("Unknown content type " + contentType);
}

export async function consumeBodies(block: Block): Promise<void> {
  const promises = [];
  if (!block.expectedResponse?.bodyUsed) {
    promises.push(block.expectedResponse?.body?.cancel());
  }
  if (!block.actualResponse?.bodyUsed) {
    promises.push(block.actualResponse?.body?.cancel());
  }
  await Promise.all(promises);
}
