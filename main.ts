import { type Args, parse } from "https://deno.land/std@0.126.0/flags/mod.ts";
import * as colors from "https://deno.land/std@0.126.0/fmt/colors.ts";


if (import.meta.main) {
    const args: Args = parse(Deno.args);

    const abortController = new AbortController();
    Deno.addSignalListener("SIGINT", () => {
        // console.log("ctrl +c");
        abortController.abort();
        Deno.exit(130);
    });
    await runFetch(args, abortController.signal);
}

async function runFetch(args: Args, signal: AbortSignal | null = null): Promise<void> {

    const url = new URL(`${args._.join("?")}`);

    // create headers
    const headers = new Headers();
    const header = args.header ? Array.isArray(args.header) ? args.header : [args.header] : [];

    for (const txt of header) {
        const [key, value] = txt.replace(":", "<<::>>").split("<<::>>");
        headers.set(key.trim(), value.trim());
    }

    const init: RequestInit = {
        method: args.method || "GET",
        headers,
        body: args.body || null,
        cache: args.cache || "default",
        credentials: args.credentials || "same-origin",
        redirect: args.redirect || "follow",
        referrer: args.referrer || "client",
        referrerPolicy: args.referrerPolicy || "no-referrer",
        integrity: args.integrity || "",
        keepalive: args.keepalive || false,
        mode: args.mode || "cors",
        signal,
    };

    const request: Request = new Request(url, init);

    // Run:
    try {
        console.info(await castRequestToHttpText(request));
        const response = await fetch(request);
        console.info(await castResponseToHttpText(response));
    } catch (error) {
        console.error(error);
    }
}

function extractBody(re: Response | Request): unknown {
    if (!re.bodyUsed) return "";

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

async function castResponseToHttpText(response: Response): Promise<string> {
    const body = await extractBody(response);

    const statusColor = response.status >= 200 && response.status < 300
        ? colors.green
        : response.status >= 300 && response.status < 400
            ? colors.yellow
            : response.status >= 400 && response.status < 500
                ? colors.red
                : colors.bgRed;



    const status = statusColor(String(response.status));
    const statusText = response.statusText;
    const headers = headerToString(response.headers);

    const bodyStr = typeof body === "string"
        ? body
        : JSON.stringify(body, null, 2);

    return `${colors.dim(`HTTP/1.1`)} ${colors.bold(`${status} ${statusText}`)}
${colors.dim(headers)}

${bodyStr}`;
}

async function castRequestToHttpText(request: Request): Promise<string> {
    const body = await extractBody(request);
    const method = request.method;
    const url = request.url;
    const headers = headerToString(request.headers);


    return `
${colors.bold(`${colors.yellow(method)} ${url}`)}
${(headers)}` + (body ? `\n${body}` : '');

}

function headerToString(headers: Headers): string {
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