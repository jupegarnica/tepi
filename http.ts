import { fetchRequest } from "./fetch.ts";
import { Block, ResponseUsed } from "./types.ts";

const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];



export function parseHttp(txt: string): Block {
    const lines: string[] = txt.replaceAll('\r', '\n').split("\n");

    let url = '';
    const init: RequestInit = {
        method: 'GET',
        body: '',
    };
    let responseInit: ResponseInit | undefined;
    let responseBody: BodyInit | null = '';

    init.headers = new Headers();

    let thisLineMayBeHeader = false;
    let thisLineMayBeBody = false;
    let thisLineMayBeResponseHeader = false;
    let thisLineMayBeResponseBody = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('HTTP/')) {
            // console.log(i, 'status'.padEnd(17), trimmed);
            responseInit ??= {};
            const data = trimmed.split(' ')
            responseInit.status = parseInt(data[1]);
            responseInit.statusText = data[2];
            thisLineMayBeResponseHeader = true;
            thisLineMayBeBody = false;
            thisLineMayBeResponseBody = false;
            continue;
        }
        if (trimmed && thisLineMayBeResponseHeader) {
            // console.log(i, 'response header'.padEnd(17), trimmed);
            const [key, value] = trimmed.replace(":", "<<::>>").split("<<::>>");
            try {
                responseInit ??= {};
                responseInit.headers =
                    responseInit.headers instanceof Headers
                        ? responseInit.headers
                        : new Headers();

                responseInit.headers.set(key, value);
                thisLineMayBeResponseHeader = true;
                continue;
            } catch (error) {
                console.error(error);
                throw new Error(`Invalid header; key: ${key}, value: ${value}`);

            }
        }

        if (thisLineMayBeResponseBody && !thisLineMayBeBody) {
            // console.log(i, 'response body'.padEnd(17), trimmed);
            responseBody += '\n' + line;
            continue;
        }
        if (thisLineMayBeBody && !thisLineMayBeResponseBody) {
            // console.log(i, 'body'.padEnd(17), trimmed);
            init.body += '\n' + line;
            continue;
        }


        if (!trimmed) {
            if (thisLineMayBeResponseHeader) {
                thisLineMayBeResponseHeader = false;
                thisLineMayBeResponseBody = true;
            }
            if (thisLineMayBeHeader) {
                thisLineMayBeHeader = false;
                thisLineMayBeBody = true;
            }
            // console.log(i, 'empty'.padEnd(17), trimmed);
            continue;
        }

        if (trimmed.startsWith('#')) {
            // console.log(i, 'comment'.padEnd(17), trimmed);
            continue;
        }

        if (httpMethods.some((method) => trimmed.startsWith(method))) {
            // console.log(i, 'url'.padEnd(17), trimmed);

            [init.method, url] = trimmed.split(" ");
            if (!url.match(/^https?:\/\//)) {
                url = `http://${url}`
            }

            thisLineMayBeHeader = true;
            continue;
        }
        if (trimmed && thisLineMayBeHeader) {
            // console.log(i, 'header'.padEnd(17), trimmed);
            const [key, value] = trimmed.replace(":", "<<::>>").split("<<::>>");
            init.headers.set(key, value);
            thisLineMayBeHeader = true;
            continue;
        }
    }


    if (typeof init.body === 'string') {
        init.body = init.body.trim();
        init.body ||= null;
    }
    const request = new Request(url, init);
    const block: Block = { request };
    if (responseInit) {
        if (typeof responseBody === 'string') {
            responseBody = responseBody.trim();
            responseBody ||= null;
        }

        const response: ResponseUsed = new Response(responseBody, responseInit);
        response.bodyExtracted = responseBody;
        block.response = response
    }
    return block;
}


export async function runHttp(txt: string): Promise<ResponseUsed> {

    const block = parseHttp(txt);
    const response = await fetchRequest(block.request, block.meta, block.response);
    return response;
}