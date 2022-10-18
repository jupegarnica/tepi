import { Block, Meta, _Request, _Response } from "./types.ts";
import { httpMethods } from "./types.ts";



export function parseBlockText(block: Block): Block {
  const txt = block.text || '';
  const lines: string[] = txt.replaceAll('\r', '\n').split("\n");

  let url = '';
  const init: RequestInit = {
    method: 'GET',
    body: '',
  };
  let meta: Meta | undefined;

  let responseInit: ResponseInit | undefined;
  let responseBody: BodyInit | null = '';
  let responseHttpText = '';
  let requestHttpText = '';
  init.headers = new Headers();

  let thisLineMayBeHeader = false;
  let thisLineMayBeBody = false;
  let thisLineMayBeResponseHeader = false;
  let thisLineMayBeResponseBody = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('HTTP/')) {
      responseHttpText += line;
      // console.log(i, 'status'.padEnd(17), trimmed);
      responseInit ??= {};
      const [, status, ...statusText] = trimmed.split(' ');
      responseInit.status = parseInt(status);
      responseInit.statusText = statusText.join(' ');
      thisLineMayBeResponseHeader = true;
      thisLineMayBeBody = false;
      thisLineMayBeResponseBody = false;
      continue;
    }
    if (trimmed && thisLineMayBeResponseHeader) {
      responseHttpText += '\n' + line;
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
    if (trimmed.startsWith('#')) {
      // console.log(i, 'comment'.padEnd(17), trimmed);
      meta ??= {};
      const clean = trimmed.replace(/^#+\s*/g, '');
      if (!clean) continue;
      let key = clean.match(/^@\w+/)?.[0] || '';
      if (key) {
        let value: string | boolean = clean.replace(key, '').replace('=', '').trim();
        key = key.replace('@', '');
        if (!value) value = true;
        meta[key] = value;
      }

      continue;
    }

    if (thisLineMayBeResponseBody && !thisLineMayBeBody) {
      // console.log(i, 'response body'.padEnd(17), trimmed);
      responseHttpText += '\n' + line;
      responseBody += '\n' + line;
      continue;
    }
    if (thisLineMayBeBody && !thisLineMayBeResponseBody) {
      // console.log(i, 'body'.padEnd(17), trimmed);
      requestHttpText += '\n' + line;
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



    if (httpMethods.some((method) => trimmed.startsWith(method))) {
      // console.log(i, 'url'.padEnd(17), trimmed);
      requestHttpText += line;
      [init.method, url] = trimmed.split(" ");
      if (!url.match(/^https?:\/\//)) {
        url = `http://${url}`;
      }

      thisLineMayBeHeader = true;
      continue;
    }
    if (trimmed && thisLineMayBeHeader) {
      // console.log(i, 'header'.padEnd(17), trimmed);
      requestHttpText += '\n' + line;
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
  if (url) {
    const request: _Request = new Request(url, init);
    request.bodyRaw = init.body;
    request.httpText = requestHttpText;
    block.request = request;
  }
  if (meta) {
    block.meta = meta;
  }

  if (responseInit) {
    if (typeof responseBody === 'string') {
      responseBody = responseBody.trim();
      responseBody ||= null;
    }

    const response: _Response = new Response(responseBody, responseInit);
    response.httpText = responseHttpText;
    response.bodyRaw = responseBody;
    block.expectedResponse = response;
  }
  return block;
}



// export function parseRequestFromBlockText(block: Block): Block {
//   const { request } = parseBlockText(block);
//   return request;
// }