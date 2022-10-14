// @ts-ignore: it has a highlight named export
import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";

import type { _Request, _Response, BodyExtracted, Block } from "./types.ts";
import { requestToText, headersToText, printBody, responseToText } from "./print.ts";



export async function fetchBlock(
    block: Block
): Promise<void> {
    const { request, meta = {} } = block;
    if (!request) {
        throw new Error('block.request is undefined');
    }
    const {
        hideBody = false,
        hideHeaders = false,
        hideRequest = false,
        hideResponse = false,
    } = meta;

    const promise = fetch(request);

    if (!hideRequest) {
        console.info(requestToText(request));
        hideHeaders || console.info(headersToText(request.headers));
        hideBody || await printBody(request);
    }

    const actualResponse: _Response = await promise;
    block.actualResponse = actualResponse;

    hideResponse || console.info(responseToText(actualResponse));
    hideResponse || hideHeaders || console.info(headersToText(actualResponse.headers));

    if (!hideBody) {
        await printBody(actualResponse);
    }

    if (!actualResponse.bodyUsed) {
        await actualResponse.body?.cancel();
    }

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