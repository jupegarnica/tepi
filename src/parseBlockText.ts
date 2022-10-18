import { Block, Meta, _Request, _Response } from "./types.ts";
import { httpMethods } from "./types.ts";


const isRequestStartLine = (line: string): boolean => httpMethods.some(method => line.trim().startsWith(method));

const isResponseStartLine = (line: string): boolean => line.trim().startsWith('HTTP/');

const isHeaderLine = (line: string): boolean => !!line.trim().match(/^[^:]+:\s*[^:]+$/);


export function parseBlockTextOLD(block: Block): Block {
  const text = block.text || '';
  const lines: string[] = text.replaceAll('\r', '\n').split("\n");

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

export function parseBlockText(block: Block): Block {
  block.request = parseRequestFromText(block.text);
  block.meta = parseMetaFromText(block.text);
  block.expectedResponse = parseResponseFromText(block.text);

  return block
}

export function parseMetaFromText(text = ''): Meta  {
  const meta: Meta = {};
  const lines: string[] = text.replaceAll('\r', '\n').split("\n");

  const requestStartLine = lines.findIndex(isRequestStartLine);
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



export function parseRequestFromText(text = ''): _Request | undefined {

  const lines: string[] = text.replaceAll('\r', '\n').split("\n");
  const requestStartLine = lines.findIndex(isRequestStartLine);
  if (requestStartLine === -1) {
    return;
  }
  let requestEndLine = lines.findIndex(isResponseStartLine, requestStartLine);
  if (requestEndLine === -1) requestEndLine = lines.length;
  let url = '';
  const headers: Headers = new Headers();
  const requestInit: RequestInit = {}
  const meta: Meta = {};
  let lookingFor = 'url';

  for (let i = requestStartLine; i < requestEndLine; i++) {
    const line = lines[i];
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
      if (!url.match(/^https?:\/\//)) {
        url = `http://${url}`;
      }
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

  const request: _Request = new Request(url, requestInit);
  request.bodyRaw = requestInit.body;
  return request


}


export function parseResponseFromText(text = ''): _Response | undefined {
  const lines: string[] = text.replaceAll('\r', '\n').split("\n");
  const responseInit: ResponseInit = {};
  const headers = new Headers();
  let responseBody: BodyInit | null = '';

  const statusLine = lines.findIndex(isResponseStartLine);
  if (statusLine === -1) return;

  let lookingFor = 'status';
  for (let i = statusLine; i < lines.length; i++) {
    const line = lines[i];
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
  const response: _Response = new Response(responseBody, responseInit);
  response.bodyRaw = responseBody;
  return response;
}
