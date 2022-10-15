// @ts-ignore: it has a highlight named export
import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";

import type { _Request, _Response, BodyExtracted, Block } from "./types.ts";



export async function fetchBlock(
    block: Block
): Promise<void> {
    const { request} = block;
    if (!request) {
        throw new Error('block.request is undefined');
    }
    const promise = fetch(request);

    const actualResponse: _Response = await promise;
    block.actualResponse = actualResponse;


}


export async function extractBody(re: _Response | _Request): Promise<BodyExtracted> {

    const contentType = re.headers.get("content-type") || "";
    const includes = (ct: string) => contentType.includes(ct);


    if (re.bodyUsed) {

        const requestExtracted =
            mimesToJSON.some((ct) => contentType.includes(ct))
                ? JSON.parse(re.bodyRaw as string)
                : re.bodyRaw;

        if (requestExtracted) {
            re.bodyExtracted = requestExtracted;
        }
        return { body: re.bodyExtracted, contentType };
    }
    if (!contentType) {

        const body = undefined;
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToArrayBuffer.some(includes)) {
        const body = await re.arrayBuffer();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToText.some(includes)) {
        const body = await re.text();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToJSON.some(includes)) {
        const body = await re.json();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToBlob.some(includes)) {
        const body = await re.blob();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    if (mimesToFormData.some(includes)) {
        const body = await re.formData();
        re.bodyExtracted = body;
        return { body, contentType };
    }
    throw new Error("Unknown content type " + contentType);
}