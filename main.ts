import { type Args, parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.126.0/fmt/colors.ts";
import { highlight } from "npm:cli-highlight";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToBlob, mimesToArrayBuffer, mimesToJSON, mimesToText, mimesToFormData } from "./mimes.ts";


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
        // console.log("ctrl +c");
        abortController.abort();
        Deno.exit(130);
    });

    await runFetch(args, abortController.signal);
}

export async function runFetch(args: Args, signal: AbortSignal | null = null): Promise<void> {

    const url = new URL(`${args._.join("?")}`);

    // create headers
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


    try {
        const request: Request = new Request(url, init);
        const { hideBody, hideHeaders, hideRequest, hideResponse } = args;

        const promise = fetch(request);

        hideRequest || console.info(requestToText(request));
        hideHeaders || console.info(headersToText(request.headers));
        hideBody || console.info(await bodyToText(request));

        const response = await promise;

        // if (response.headers.get("content-encoding")) {
        //     throw new Error("content-encoding is not supported " + response.headers.get("content-encoding"));
        // }
        hideResponse || console.info(responseToText(response));
        hideResponse || hideHeaders || console.info(headersToText(response.headers));
        hideResponse || hideBody || console.info(await bodyToText(response));

        if (!response.bodyUsed) {
            await response.body?.cancel();
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}


function extractBody(re: Response | Request): Promise<unknown> {

    const contentType = re.headers.get("content-type") || "";

    const includes = (ct: string) => contentType.includes(ct)

    if (!contentType) {
        return Promise.resolve('');
    }
    if (mimesToArrayBuffer.some(includes)) {
        return re.arrayBuffer();
    }
    if (mimesToText.some(includes)) {
        return re.text();
    }
    if (mimesToJSON.some(includes)) {
        return re.json();
    }
    if (mimesToBlob.some(includes)) {
        return re.blob();
    }
    if (mimesToFormData.some(includes)) {
        return re.formData();
    }
    throw new Error("Unknown content type " + contentType);
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



async function bodyToText(re: Response | Request): Promise<string> {
    const contentType = re.headers.get("content-type") || "";
    if (!contentType) return ''
    const body = await extractBody(re);
    const bodyStr = typeof body === "string"
        ? body
        : JSON.stringify(body, null, 2);



    const includes = (ct: string) => contentType.includes(ct)

    if (mimesToArrayBuffer.some(includes)) {
        return imageToText(body as ArrayBuffer);

    }
    if (mimesToBlob.some(includes)) {
        return `${Deno.inspect(body)}`;
    }


    let { language } = contentTypeToLanguage(contentType);

    if (language) {
        language = language !== 'plain' ? language : 'text';
        try {
            return highlight(bodyStr, { language, ignoreIllegals: true, languageSubset: ['text'] });
        } catch (error) {
            console.error(error.message);
            console.log(typeof body);
            throw error;
        }
    }
    if (mimesToText.some(includes)) {
        return bodyStr;
    }


    throw new Error("Unknown content type " + contentType);

}


function contentTypeToLanguage(contentType: string): { language: string; mime: string; type: string } {
    const [mime] = contentType.split(";");
    let [type, language] = mime.split("/");
    language = language.replace(/\+.*/, '');
    return { type, language, mime }

}

async function imageToText(body: ArrayBuffer): Promise<string> {
    const rawFile = new Uint8Array(body);
    const options = { rawFile }
    return [...await getImageStrings(options)].join('');
}