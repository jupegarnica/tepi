import { type Args, parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.126.0/fmt/colors.ts";


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
            redirect: "follow",
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

    const contentType = re.headers.get("content-type");

    if (!contentType) {
        return re.text();
    }
    if (contentType.includes("application/json")) {
        return re.json();
    }
    if (contentType.includes("text/")) {
        return re.text();
    }
    if (contentType.includes("application/octet-stream")) {
        return re.arrayBuffer();
    }
    if (contentType.includes("multipart/form-data")) {
        return re.formData();
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
        return re.formData();
    }
    return re.blob();
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
    const body = await extractBody(re);
    const bodyStr = typeof body === "string"
        ? body
        : JSON.stringify(body, null, 2);
    return bodyStr;
}
