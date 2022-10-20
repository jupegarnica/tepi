import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";

import { _Response, type _Request, type Block } from "./types.ts";



export async function fetchBlock(
    block: Block
): Promise<Block> {
    const { request, meta } = block;
    if (!request) {
        throw new Error('block.request is undefined');
    }
    const init: RequestInit = {
        method: request.method || 'GET',
        headers: request.headers,
        body: request.body,
        mode: request.mode || 'cors',
        credentials: request.credentials || 'same-origin',
        cache: request.cache || 'default',
        redirect: request.redirect || 'follow',
        referrer: request.referrer || 'client',
        referrerPolicy: request.referrerPolicy || 'no-referrer-when-downgrade',
        integrity: request.integrity || '',
        keepalive: request.keepalive || false,
        signal: request.signal || undefined,
    }

    for (const key in meta) {
        if (key in init) {
            init[key as keyof RequestInit] = meta[key];
        }
    }
    const response = await fetch(request, init);
    const actualResponse = _Response.fromResponse(response);
    block.actualResponse = actualResponse;
    return block;

}


export async function extractBody(re: _Response | _Request): Promise<_Response | _Request> {

    const contentType = re.headers.get("content-type") || "";
    const includes = (ct: string) => contentType.includes(ct);

    if (re.bodyUsed) {
        if (typeof re.bodyRaw === "string") {
            const requestExtracted =
                mimesToJSON.some((ct) => contentType.includes(ct))
                    ? JSON.parse(re.bodyRaw as string)
                    : re.bodyRaw;
            re.bodyExtracted = requestExtracted;
            return re;
        }
        return re
    }
    if (!contentType) {
        re.bodyExtracted = undefined;
        return re;
    }
    if (mimesToArrayBuffer.some(includes)) {
        const body = await re.arrayBuffer();
        re.bodyExtracted = body;
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
    throw new Error("Unknown content type " + contentType);
}


export async function consumeBodies(block: Block): Promise<void> {
    const promises = [];
    if (!block.expectedResponse?.bodyUsed) {
        promises.push(block.expectedResponse?.body?.cancel())
    }
    if (!block.actualResponse?.bodyUsed) {
        promises.push(block.actualResponse?.body?.cancel())
    }
    await Promise.all(promises);

}