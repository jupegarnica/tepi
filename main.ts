import { type Args, parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.126.0/fmt/colors.ts";
// @ts-ignore: it has a highlight named export
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

    let url = '';

    if (args._.length === 0) {
        console.log(colors.red("Error: URL is required"));
        Deno.exit(1);
    } else {
        // has protocol?
        url = `${args._[0]}`
        if (!url.match(/^https?:\/\//))  {
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


    try {
        const request: Request = new Request(url, init);
        const { hideBody, hideHeaders, hideRequest, hideResponse } = args;
        const contentType = request.headers.get("content-type") || "";
        const requestBody = mimesToJSON.some((ct) => contentType.includes(ct))
            ? JSON.parse(init.body as string)
            : init.body;

        const promise = fetch(request);

        hideRequest || console.info(requestToText(request));
        hideRequest || hideHeaders || console.info(headersToText(request.headers));
        hideRequest || hideBody || console.info(await bodyToText({ body: requestBody, contentType: request.headers.get("content-type") || '' }), '\n');

        const response = await promise;

        hideResponse || console.info(responseToText(response));
        hideResponse || hideHeaders || console.info(headersToText(response.headers));
        hideBody || console.info(await bodyToText(await extractBody(response)), '\n');

        if (!response.bodyUsed) {
            await response.body?.cancel();
        }
    } catch (error) {
        console.error(error);
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

type BodyExtracted = { body?: BodyInit; contentType: string }


async function bodyToText({ body, contentType }: BodyExtracted): Promise<string> {
    if (!contentType) return ''


    const includes = (ct: string) => contentType.includes(ct)

    if (mimesToArrayBuffer.some(includes)) {
        return await imageToText(body as ArrayBuffer);

    }
    if (mimesToBlob.some(includes)) {
        return `${Deno.inspect(body)}`;
    }


    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
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

async function extractBody(re: Response | Request): Promise<BodyExtracted> {

    const contentType = re.headers.get("content-type") || "";

    const includes = (ct: string) => contentType.includes(ct)

    if (!contentType) {
        return { body: await Promise.resolve(''), contentType };
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