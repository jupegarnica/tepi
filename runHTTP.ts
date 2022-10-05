
const httpMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

type Block = {
    request: Request;
    response?: Response;
};

export function parseHttp(txt: string): Block {
    const lines: string[] = txt.replaceAll('\r', '\n').split("\n");

    let url = '';
    const init: RequestInit = {
        method: 'GET',
    };
    let responseInit: ResponseInit | undefined ;
    let responseBody = '';

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
            responseInit.status = parseInt(trimmed.split(' ')[1]);
            thisLineMayBeResponseHeader = true;
            thisLineMayBeBody = false;
            thisLineMayBeResponseBody = false;
            continue;
        }
        if (trimmed && thisLineMayBeResponseHeader) {
            // console.log(i, 'response header'.padEnd(17), trimmed);
            responseInit ??= {};
            responseInit.headers =
            responseInit.headers instanceof Headers
            ? responseInit.headers
            : new Headers();

            const [key, value] = trimmed.replace(":", "<<::>>").split("<<::>>");
            responseInit.headers.set(key, value);
            thisLineMayBeResponseHeader = true;
            continue;
        }

        if (thisLineMayBeResponseBody && !thisLineMayBeBody) {
            // console.log(i, 'response body'.padEnd(17), trimmed);
            responseBody += line;
            thisLineMayBeResponseHeader = false;
            continue;
        }
        if (thisLineMayBeBody && !thisLineMayBeResponseBody) {
            // console.log(i, 'body'.padEnd(17), trimmed);
            if (!init.body) {
                init.body = '';
            }
            init.body += '\n' + line;
            thisLineMayBeBody = true;
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
        init.body = init.body?.trim();
    }
    const request = new Request(url, init);
    const block: Block = { request };
    if (responseInit) {
        block.response = new Response(responseBody, responseInit);
    }
    return block;
}