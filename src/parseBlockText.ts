import type { Block, Meta } from "./types.ts";
import { httpMethods, _Request, _Response } from "./types.ts";
import * as eta from "https://deno.land/x/eta@v1.12.3/mod.ts"

async function renderTemplate(template: string, data: Record<string, unknown>) {
  const result = await eta.render(
    template,
    data,
    { async: true, useWith: true, rmWhitespace: false, autoTrim: false },
  )
  return result;
}



const isRequestStartLine = (line: string): boolean => httpMethods.some(method => line.trim().startsWith(method));

const isResponseStartLine = (line: string): boolean => line.trim().startsWith('HTTP/');

const isHeaderLine = (line: string): boolean => !!line.trim().match(/^[^:]+:\s*[^:]+$/);


// export function parseBlockTextOLD(block: Block): Block {
//   const text = block.text || '';
//   const lines: string[] = splitLines(text);

//   let url = '';
//   const init: RequestInit = {
//     method: 'GET',
//     body: '',
//   };
//   let meta: Meta | undefined;

//   let responseInit: ResponseInit | undefined;
//   let responseBody: BodyInit | null = '';
//   let responseHttpText = '';
//   let requestHttpText = '';
//   init.headers = new Headers();

//   let thisLineMayBeHeader = false;
//   let thisLineMayBeBody = false;
//   let thisLineMayBeResponseHeader = false;
//   let thisLineMayBeResponseBody = false;

//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
//     const trimmed = line.trim();
//     if (trimmed.startsWith('HTTP/')) {
//       responseHttpText += line;
//       // console.log(i, 'status'.padEnd(17), trimmed);
//       responseInit ??= {};
//       const [, status, ...statusText] = trimmed.split(' ');
//       responseInit.status = parseInt(status);
//       responseInit.statusText = statusText.join(' ');
//       thisLineMayBeResponseHeader = true;
//       thisLineMayBeBody = false;
//       thisLineMayBeResponseBody = false;
//       continue;
//     }
//     if (trimmed && thisLineMayBeResponseHeader) {
//       responseHttpText += '\n' + line;
//       // console.log(i, 'response header'.padEnd(17), trimmed);
//       const [key, value] = trimmed.replace(":", "<<::>>").split("<<::>>");
//       try {
//         responseInit ??= {};
//         responseInit.headers =
//           responseInit.headers instanceof Headers
//             ? responseInit.headers
//             : new Headers();

//         responseInit.headers.set(key, value);
//         thisLineMayBeResponseHeader = true;
//         continue;
//       } catch (error) {
//         console.error(error);
//         throw new Error(`Invalid header; key: ${key}, value: ${value}`);

//       }
//     }
//     if (trimmed.startsWith('#')) {
//       // console.log(i, 'comment'.padEnd(17), trimmed);
//       meta ??= {};
//       const clean = trimmed.replace(/^#+\s*/g, '');
//       if (!clean) continue;
//       let key = clean.match(/^@\w+/)?.[0] || '';
//       if (key) {
//         let value: string | boolean = clean.replace(key, '').replace('=', '').trim();
//         key = key.replace('@', '');
//         if (!value) value = true;
//         meta[key] = value;
//       }

//       continue;
//     }

//     if (thisLineMayBeResponseBody && !thisLineMayBeBody) {
//       // console.log(i, 'response body'.padEnd(17), trimmed);
//       responseHttpText += '\n' + line;
//       responseBody += '\n' + line;
//       continue;
//     }
//     if (thisLineMayBeBody && !thisLineMayBeResponseBody) {
//       // console.log(i, 'body'.padEnd(17), trimmed);
//       requestHttpText += '\n' + line;
//       init.body += '\n' + line;
//       continue;
//     }


//     if (!trimmed) {
//       if (thisLineMayBeResponseHeader) {
//         thisLineMayBeResponseHeader = false;
//         thisLineMayBeResponseBody = true;
//       }
//       if (thisLineMayBeHeader) {
//         thisLineMayBeHeader = false;
//         thisLineMayBeBody = true;
//       }
//       // console.log(i, 'empty'.padEnd(17), trimmed);
//       continue;
//     }



//     if (httpMethods.some((method) => trimmed.startsWith(method))) {
//       // console.log(i, 'url'.padEnd(17), trimmed);
//       requestHttpText += line;
//       [init.method, url] = trimmed.split(" ");
//       if (!url.match(/^https?:\/\//)) {
//         url = `http://${url}`;
//       }

//       thisLineMayBeHeader = true;
//       continue;
//     }
//     if (trimmed && thisLineMayBeHeader) {
//       // console.log(i, 'header'.padEnd(17), trimmed);
//       requestHttpText += '\n' + line;
//       const [key, value] = trimmed.replace(":", "<<::>>").split("<<::>>");
//       init.headers.set(key, value);
//       thisLineMayBeHeader = true;
//       continue;
//     }
//   }


//   if (typeof init.body === 'string') {
//     init.body = init.body.trim();
//     init.body ||= null;
//   }
//   if (url) {
//     const request: _Request = new Request(url, init);
//     request.bodyRaw = init.body;
//     request.httpText = requestHttpText;
//     block.request = request;
//   }
//   if (meta) {
//     block.meta = meta;
//   }

//   if (responseInit) {
//     if (typeof responseBody === 'string') {
//       responseBody = responseBody.trim();
//       responseBody ||= null;
//     }

//     const response: _Response = new Response(responseBody, responseInit);
//     response.httpText = responseHttpText;
//     response.bodyRaw = responseBody;
//     block.expectedResponse = response;
//   }
//   return block;
// }

export async function parseBlockText(block: Block): Promise<Block> {
  block.meta = await parseMetaFromText(block.text);
  block.request = await parseRequestFromText(block);
  block.expectedResponse = await parseResponseFromText(block.text);
  return block
}

export async function parseMetaFromText(textRaw = '', dataToInterpolate = {}): Promise<Meta> {
  const meta: Meta = {};
  let lines: string[] = splitLines(textRaw);

  const requestStartLine = lines.findIndex(isRequestStartLine);

  const metaText = lines.slice(0, requestStartLine).join("\n");
  const text = await renderTemplate(metaText, dataToInterpolate) || '';

  lines = splitLines(text);
  if (requestStartLine === -1) return meta;
  for (let i = 0; i < requestStartLine; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const clean = trimmed.replace(/^#+\s*/g, '');
      if (!clean) continue;
      let key = clean.match(/^@\w+/)?.[0] || '';
      if (key) {
        let value: string | boolean = clean.replace(key, '').replace('=', '').trim();
        key = key.replace('@', '');
        if (!value) value = true;
        if (value === 'true') value = true;
        if (value === 'false') value = false;
        meta[key] = value;
      }
    }
  }
  return meta;

}

function splitLines(text: string): string[] {
  return text.replaceAll('\r', '\n').split("\n");
}

export async function parseRequestFromText(block: Block, dataToInterpolate = {}): Promise<_Request | undefined> {
  const textRaw = block.text || '';
  const meta = block.meta;
  const linesRaw: string[] = splitLines(textRaw);
  const requestStartLine = linesRaw.findIndex(isRequestStartLine);
  if (requestStartLine === -1) {
    return;
  }
  let requestEndLine = linesRaw.findIndex(isResponseStartLine, requestStartLine);
  if (requestEndLine === -1) requestEndLine = linesRaw.length;


  const requestText = linesRaw.slice(requestStartLine, requestEndLine).join("\n");

  const text = await renderTemplate(requestText, dataToInterpolate) || '';
  const lines = splitLines(text);


  let url = '';
  const headers: Headers = new Headers();
  const requestInit: RequestInit = {
    method: 'GET',
    mode: 'cors',
    credentials: 'same-origin',
    cache: 'default',
    redirect: 'follow',
    referrer: 'client',
    referrerPolicy: 'no-referrer-when-downgrade',
    integrity: '',
    keepalive: false,
    signal: undefined,
  }


  for (const key in meta) {
    if (key in requestInit) {
      requestInit[key as keyof RequestInit] = meta[key];
    }
  }
  let lookingFor = 'url';

  for (const line of lines) {

    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      break;
    }
    if (lookingFor !== 'body' && trimmed.startsWith('#')) {
      continue;
    }


    if (lookingFor === 'url' && isRequestStartLine(line)) {
      const [method, _url] = trimmed.split(" ");

      requestInit.method = method;
      url = _url;

      lookingFor = 'headers';
      continue;
    }
    if (lookingFor === 'headers' && isHeaderLine(line)) {
      const [key, value] = trimmed.split(":")
      headers.set(key, value);
      continue;
    }
    if (lookingFor === 'headers' && !isHeaderLine(line)) {
      lookingFor = 'body';
    }
    if (lookingFor === 'body') {
      requestInit.body = (requestInit.body || '') + '\n' + line;
    }


  }
  requestInit.body = (requestInit.body as string || '').trim();
  if (requestInit.body === '') {
    requestInit.body = null;
  }
  requestInit.headers = headers;

  const host = requestInit.headers.get('host') || meta?.host;
  if (host) {
    url = host + url;
  }
  if (!url.match(/^https?:\/\//)) {
    url = `http://${url}`;
  }

  const request: _Request = new _Request(url, requestInit);

  return request


}


export async function parseResponseFromText(textRaw = '', dataToInterpolate = {}): Promise<_Response | undefined> {
  const linesRaw: string[] = splitLines(textRaw);
  const responseInit: ResponseInit = {};
  const headers = new Headers();
  let responseBody: BodyInit | null = '';

  const statusLine = linesRaw.findIndex(isResponseStartLine);
  if (statusLine === -1) return;

  const responseText = linesRaw.slice(statusLine).join("\n");
  const text = await renderTemplate(responseText, dataToInterpolate) || '';
  const lines = splitLines(text);

  let lookingFor = 'status';
  for (const line of lines) {

    const trimmed = line.trim();

    if (trimmed.startsWith('###')) {
      break;
    }
    if (lookingFor !== 'body' && trimmed.startsWith('#')) {
      continue;
    }
    if (lookingFor === 'status' && isResponseStartLine(line)) {
      const [, status, ...statusText] = trimmed.split(' ');
      responseInit.status = parseInt(status);
      responseInit.statusText = statusText.join(' ');
      lookingFor = 'headers';
      continue;
    }
    if (lookingFor === 'headers' && isHeaderLine(line)) {
      const [key, value] = trimmed.split(":")
      headers.set(key, value);
      continue;
    }
    if (lookingFor !== 'body' && !trimmed) {
      if (lookingFor === 'headers') {
        lookingFor = 'body';
      }
      continue;
    }
    if (lookingFor === 'body') {
      responseBody += '\n' + line;
      continue;
    }
  }

  responseInit.headers = headers;
  responseBody = responseBody.trim();
  responseBody ||= null;
  const response: _Response = new _Response(responseBody, responseInit);
  return response;
}
