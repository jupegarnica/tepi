import { Block, Meta } from "./types.ts";
import { _Request, _Response, httpMethods } from "./types.ts";
import * as eta from "npm:eta@1.14.2";
import { extract } from "jsr:@std/front-matter@0.224.0/yaml";

async function renderTemplate(template: string, data: Record<string, unknown>) {
  const result = await eta.render(template, data, {
    async: true,
    useWith: true,
    rmWhitespace: false,
    autoTrim: false,
    // TODO: add custom tags??
    // tags: ["{{", "}}"]
  });
  return result;
}

export const isRequestStartLine = (line: string): boolean =>
  httpMethods.some((method) => line.trim().startsWith(method));

const isResponseStartLine = (line: string): boolean =>
  line.trim().startsWith("HTTP/");

const isHeaderLine = (line: string): boolean =>
  !!line.trim().match(/^[^:]+:\s*.+$/);

export async function parseBlockText(block: Block): Promise<Block> {
  block.meta = await parseMetaFromText(block.text);
  block.request = await parseRequestFromText(block);
  block.expectedResponse = await parseResponseFromText(block.text);
  return block;
}

const findFrontMatterTextRegex = /^---\s*([\s\S]*?)\s*---\s*/gm;
export async function parseMetaFromText(
  textRaw = "",
  dataToInterpolate = {}
): Promise<Meta> {
  const meta: Meta = {};
  const frontMatterTextRaw = textRaw.match(findFrontMatterTextRegex)?.[0] || "";
  const text =
    (await renderTemplate(frontMatterTextRaw, dataToInterpolate)) || "";
  const frontMatterText = text.match(findFrontMatterTextRegex)?.[0] || "";

  if (frontMatterText) {
    const data = extract(frontMatterText);
    Object.assign(meta, data.attrs);
  }
  return meta;
}

function splitLines(text: string): string[] {
  return text.replaceAll("\r", "\n").split("\n");
}

export async function parseRequestFromText(
  block: Block,
  dataToInterpolate = {}
): Promise<_Request | undefined> {
  const textRaw = block.text.replace(findFrontMatterTextRegex, "");

  const meta = block.meta;
  const linesRaw: string[] = splitLines(textRaw);

  const requestStartLine = 0;
  let requestEndLine = linesRaw.findIndex(
    isResponseStartLine,
    requestStartLine
  );

  if (requestEndLine === -1) requestEndLine = linesRaw.length;

  const requestText = linesRaw
    .slice(requestStartLine, requestEndLine)
    .join("\n");

  const text = (await renderTemplate(requestText, dataToInterpolate)) || "";

  const requestStartLineIndex = linesRaw.findIndex(isRequestStartLine);
  if (requestStartLineIndex === -1) {
    return;
  }
  const lines = splitLines(text);

  let url: string | URL = "";
  const headers: Headers = new Headers();
  const requestInit: RequestInit = {
    method: "GET",
    mode: "cors",
    credentials: "same-origin",
    cache: "default",
    redirect: "follow",
    referrer: "client",
    referrerPolicy: "no-referrer-when-downgrade",
    integrity: "",
    keepalive: false,
    signal: undefined,
    headers: new Headers(),
  };

  for (const key in meta) {
    if (key in requestInit) {
      requestInit[key as keyof RequestInit] = meta[key];
    }
  }
  let lookingFor = "url";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("###")) {
      break;
    }
    if (lookingFor !== "body" && trimmed.startsWith("#")) {
      continue;
    }

    if (lookingFor === "url" && isRequestStartLine(line)) {
      const [method, _url] = trimmed.split(/\s+/);

      requestInit.method = method;
      url = _url;

      lookingFor = "headers";
      continue;
    }
    if (lookingFor === "headers" && isHeaderLine(line)) {
      const [key, value] = extractHeader(trimmed);
      headers.set(key, value);
      continue;
    }
    if (lookingFor === "headers" && !isHeaderLine(line)) {
      lookingFor = "body";
    }
    if (lookingFor === "body") {
      requestInit.body = (requestInit.body || "") + "\n" + line;
    }
  }
  requestInit.body = ((requestInit.body as string) || "").trim();
  if (requestInit.body === "") {
    requestInit.body = null;
  }
  requestInit.headers = headers;

  const headersInit = requestInit.headers as Headers;
  let host = headersInit.get("host") || meta.host || "";
  host = String(host).trim();
  const hasProtocol = url.match(/^https?:\/\//);
  if (host && !hasProtocol) {
    if (host.endsWith("/") && url.startsWith("/")) {
      host = host.slice(0, -1);
    }
    url = host + (url || "");
  }

  if (!url.match(/^https?:\/\//)) {
    url = `http://${url}`;
  }
  try {
    url = new URL(url).toString();
  } catch (error) {
    // @ts-ignore - it works    brew install docker-compose
    throw new error.constructor(`Invalid URL: ${url} -> ${error.message}`);
  }

  const request: _Request = new _Request(url, requestInit);

  return request;
}

export async function parseResponseFromText(
  textRaw = "",
  dataToInterpolate = {}
): Promise<_Response | undefined> {
  const linesRaw: string[] = splitLines(textRaw);
  const responseInit: ResponseInit = {};
  const headers = new Headers();
  let responseBody: BodyInit | null = "";

  const statusLine = linesRaw.findIndex(isResponseStartLine);
  if (statusLine === -1) return;

  const responseText = linesRaw.slice(statusLine).join("\n");
  const text = (await renderTemplate(responseText, dataToInterpolate)) || "";
  const lines = splitLines(text);

  let lookingFor = "status";
  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("###")) {
      break;
    }
    if (lookingFor !== "body" && trimmed.startsWith("#")) {
      continue;
    }

    if (lookingFor !== "body" && trimmed.startsWith("#")) {
      continue;
    }
    if (lookingFor === "status" && isResponseStartLine(line)) {
      const [, status, ...statusText] = trimmed.split(" ");
      responseInit.status = parseInt(status);
      responseInit.statusText = statusText.join(" ");
      lookingFor = "headers";
      continue;
    }
    if (lookingFor === "headers" && isHeaderLine(line)) {
      const [key, value] = extractHeader(trimmed);
      headers.set(key, value);
      continue;
    }
    if (lookingFor !== "body" && !trimmed) {
      if (lookingFor === "headers") {
        lookingFor = "body";
      }
      continue;
    }
    if (lookingFor === "body") {
      responseBody += "\n" + line;
      continue;
    }
  }

  responseInit.headers = headers;
  responseBody = responseBody.trim();
  responseBody ||= null;
  const response: _Response = new _Response(responseBody, responseInit);
  return response;
}

function extractHeader(line: string): [string, string] {
  const [key, ...values] = line.split(":");
  const value = values.join(":").trim();
  return [key, value];
}
