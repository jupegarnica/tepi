import { type Args, parse } from "https://deno.land/std@0.158.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.158.0/fmt/colors.ts";
// @ts-ignore: it has a highlight named export
import { highlight } from "npm:cli-highlight";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";
import { assertEquals, assertObjectMatch } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { extension } from "https://deno.land/std@0.158.0/media_types/mod.ts?source=cli";

import type { RequestUnused, Meta, ResponseUsed, BodyExtracted } from "./types.ts";
import { assert } from "https://deno.land/std@0.158.0/_util/assert.ts";


if (import.meta.main) {
    const args: Args = parse(Deno.args, {
        alias: {
            headers: "h",
            method: ["X", 'm'],
            body: "b",
            hideBody: "hide-body",
            hideHeaders: "hide-headers",
            hideRequest: "hide-request",
            hideResponse: "hide-response",

        },
        boolean: ['hideRequest', 'hideResponse', 'hideBody', 'keepAlive'],
        default: {
            method: "GET",
            body: null,
            cache: "default",
            credentials: "same-origin",
            redirect: "follow", // "manual" | "follow" | "error"
            referrer: "client",
            referrerPolicy: "no-referrer",
            integrity: "",
            keepalive: false,
            mode: "cors",

            hideBody: false,
            hideHeaders: false,
            hideResponse: false,
            hideRequest: false,


        }
    });

    const abortController = new AbortController();
    Deno.addSignalListener("SIGINT", () => {
        abortController.abort();
        Deno.exit(130);
    });

    await runFetch(args, abortController.signal);
}

export function runFetch(args: Args, signal: AbortSignal | null = null): Promise<ResponseUsed> {

    let url = '';

    if (args._.length === 0) {
        throw new Error("Error: URL is required");
    } else {
        url = `${args._[0]}`
        if (!url.match(/^https?:\/\//)) {
            url = `http://${url}`
        }
    }

    const headers = new Headers();
    const headersInput = args.headers ? Array.isArray(args.headers) ? args.headers : [args.headers] : [];
    for (const txt of headersInput) {
        const [key, value] = txt.replace(":", "<<::>>").split("<<::>>");
        headers.set(key, value);
    }

    const init: RequestInit = {
        method: args.method,
        headers,
        body: args.body,
        cache: args.cache,
        credentials: args.credentials,
        redirect: args.redirect,
        referrer: args.referrer,
        referrerPolicy: args.referrerPolicy,
        integrity: args.integrity,
        keepalive: args.keepalive,
        mode: args.mode,
        signal,
    };
    const request: RequestUnused = new Request(url, init);
    const contentType = request.headers.get("content-type") || "";
    const requestBodyRaw = mimesToJSON.some((ct) => contentType.includes(ct))
        ? JSON.parse(init.body as string)
        : init.body;
    if (requestBodyRaw) {
        request.bodyRaw = requestBodyRaw;
    }
    const { hideBody, hideHeaders, hideRequest, hideResponse } = args;

    const meta: Meta = { hideBody, hideHeaders, hideRequest, hideResponse }

    return fetchRequest(request, meta, undefined);




}



export async function fetchRequest(
    request: RequestUnused,
    meta: Meta = {},
    expectedResponse?: ResponseUsed
): Promise<ResponseUsed> {
    try {
        const {
            hideBody = false,
            hideHeaders = false,
            hideRequest = false,
            hideResponse = false,
        } = meta;
        const requestBodyRaw = request.bodyRaw;

        const promise = fetch(request);

        hideRequest || console.info(requestToText(request));
        hideRequest || hideHeaders || console.info(headersToText(request.headers));
        hideRequest || hideBody || console.info(await bodyToText({ body: requestBodyRaw, contentType: request.headers.get("content-type") || '' }), '\n');

        const response: ResponseUsed = await promise;

        hideResponse || console.info(responseToText(response));
        hideResponse || hideHeaders || console.info(headersToText(response.headers));

        if (!hideBody) {
            const bodyExtracted = await extractBody(response);
            response.bodyExtracted = bodyExtracted.body;

            console.info(await bodyToText(bodyExtracted), '\n');
        }

        if (!response.bodyUsed) {
            await response.body?.cancel();
        }
        if (typeof expectedResponse === 'object') {
            assertExpectedResponse(response, expectedResponse);
        }
        return response;
    } catch (error) {
        // console.error(error);
        throw error;


    }
}


function requestToText(request: Request): string {
    const method = request.method;
    const url = request.url;
    return `${colors.bold(`${colors.yellow(method)} ${url}`)}`;
}

function responseToText(response: Response): string {
    const statusColor = response.status >= 200 && response.status < 300
        ? colors.green
        : response.status >= 300 && response.status < 400
            ? colors.yellow
            : response.status >= 400 && response.status < 500
                ? colors.red
                : colors.bgRed;

    const status = statusColor(String(response.status));
    const statusText = response.statusText;

    return `${colors.dim(`HTTP/1.1`)} ${colors.bold(`${status} ${statusText}`)}`;


}


function headersToText(headers: Headers): string {
    let maxLengthKey = 0
    let maxLengthValue = 0

    let result = '';

    for (const [key, value] of headers.entries()) {
        maxLengthKey = Math.max(maxLengthKey, key.length);
        maxLengthValue = Math.max(maxLengthValue, value.length);
    }
    for (const [key, value] of headers.entries()) {
        result += (`${colors.blue(`${key}:`.padEnd(maxLengthKey + 1))} ${colors.white(value.padEnd(maxLengthValue + 1))}\n`)
    }

    return result;


}



async function bodyToText({ body, contentType }: BodyExtracted): Promise<string> {
    if (!contentType || !body) return ''


    const includes = (ct: string) => contentType.includes(ct)

    if (mimesToArrayBuffer.some(includes)) {
        return await imageToText(body as ArrayBuffer);

    }
    if (mimesToBlob.some(includes)) {
        return `${Deno.inspect(body)}`;
    }


    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    const language = contentTypeToLanguage(contentType);

    if (language) {

        try {
            return highlight(bodyStr, { language, ignoreIllegals: true });
        } catch (error) {
            console.error(language, error.message);
            throw error;
        }
    }
    if (mimesToText.some(includes)) {
        return bodyStr;
    }


    throw new Error("Unknown content type " + contentType);

}

async function extractBody(re: Response | Request): Promise<BodyExtracted> {

    const contentType = re.headers.get("content-type") || "";

    const includes = (ct: string) => contentType.includes(ct)

    if (!contentType) {
        return { body: await Promise.resolve(undefined), contentType };
    }
    if (mimesToArrayBuffer.some(includes)) {
        return { body: await re.arrayBuffer(), contentType };
    }
    if (mimesToText.some(includes)) {
        return { body: await re.text(), contentType };
    }
    if (mimesToJSON.some(includes)) {
        return { body: await re.json(), contentType };
    }
    if (mimesToBlob.some(includes)) {
        return { body: await re.blob(), contentType };
    }
    if (mimesToFormData.some(includes)) {
        return { body: await re.formData(), contentType };
    }
    throw new Error("Unknown content type " + contentType);
}

function contentTypeToLanguage(contentType: string): string {
    let language = extension(contentType);
    if (!language) {
        const [mime] = contentType.split(";");
        [, language] = mime.split("/");
        language = language.replace(/\+.*/, '');
    }
    language ||= 'text';
    language = language !== 'plain' ? language : 'text';
    return language;

}

async function imageToText(body: ArrayBuffer): Promise<string> {
    const rawFile = new Uint8Array(body);
    const options = { rawFile }
    return [...await getImageStrings(options)].join('');
}


function assertExpectedResponse(response: ResponseUsed, expectedResponse: ResponseUsed) {
    try {
        console.log('assertExpectedResponse', {
            headers: expectedResponse.headers,
            body: expectedResponse.bodyExtracted ,
            status: expectedResponse.status,
            statusText: expectedResponse.statusText,

        });

        if (expectedResponse.status) assertEquals(expectedResponse.status, expectedResponse.status);
        if (expectedResponse.statusText) assertEquals(expectedResponse.statusText, expectedResponse.statusText);
        if (expectedResponse.bodyExtracted) {
            if (typeof expectedResponse.bodyExtracted === 'object') {
                // assertObjectMatch(response.bodyExtracted as Record<string,unknown>, expectedResponse.bodyExtracted as Record<string,unknown>);
                assert(response.bodyExtracted instanceof expectedResponse.bodyExtracted.constructor);
            } else {
                assertEquals(response.bodyExtracted, expectedResponse.bodyExtracted);
            }

        }
        if (expectedResponse.headers) {
            console.log('expectedResponse.headers', expectedResponse.headers);

            for (const [key, value] of expectedResponse.headers.entries()) {
                assertEquals(response.headers.get(key), value);
            }
        }
    } catch (error) {
        throw new Error("Expected response does not match actual response: " + error.message);

    }

}