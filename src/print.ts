import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// @ts-ignore ¿?¿ it has a named highlight export
import { highlight, supportsLanguage } from "npm:cli-highlight";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToArrayBuffer, mimesToBlob, mimesToText } from "./mimes.ts";
import { extension } from "https://deno.land/std@0.158.0/media_types/mod.ts?source=cli";
import { _Request, _Response, Block, Meta } from "./types.ts";

type FmtMethod = keyof typeof fmt;

function printTitle(title: string, fmtMethod: FmtMethod = "dim") {
  const consoleWidth = Deno.consoleSize(Deno.stdout.rid).columns;
  // @ts-ignore // TODO: fix this
  const titleStr = fmt[fmtMethod](` ${title} `, undefined) as string;
  const padLength = 2 + Math.floor((consoleWidth - titleStr.length) / 2);
  const separator = fmt.dim("-");
  const output = `${separator.repeat(5)} ${titleStr} ${separator.repeat(padLength)
    }`;
  console.info(output);
}

export const DISPLAYS = [
  "none",
  "minimal",
  "default",
  "full",
];
export function getDisplayIndex(meta: Meta): number {
  const display = meta.display;
  const index = DISPLAYS.indexOf(display);
  return index;

}

export async function printBlock(block: Block): Promise<void> {
  const { request, actualResponse, expectedResponse, error, meta } = block;

  if (block.meta.ignore) {
    return;
  }
  console.log(block.meta.display, getDisplayIndex(block.meta));

  if (getDisplayIndex(block.meta) < 3) {
    return;
  }
  if (meta) {
    console.group();
    printTitle("⬇   Meta    ⬇");
    console.info(metaToText(meta));
    console.groupEnd();
  }
  if (request) {
    console.group();
    console.info("");
    printTitle("⬇   Request    ⬇");

    console.info(requestToText(request));
    console.info(headersToText(request.headers));
    await printBody(request);
    console.groupEnd();
  }

  if (actualResponse) {
    console.group();
    printTitle("⬇   Response   ⬇");

    console.info(responseToText(actualResponse));
    console.info(headersToText(actualResponse.headers));
    await printBody(actualResponse);
    console.groupEnd();
  }
  if (expectedResponse) {
    console.group();
    printTitle("⬇   Expected Response   ⬇");
    console.info(responseToText(expectedResponse));
    console.info(headersToText(expectedResponse.headers));
    await printBody(expectedResponse);
    console.groupEnd();
  }
  if (error) {
    console.group();
    printError(block);
    console.groupEnd();
  }
}
function metaToText(meta: Meta): string {
  let output = "";
  let maxLengthKey = 0;
  for (const key in meta) {
    if (key.startsWith("_") || meta[key] === undefined) continue;

    if (key.length > maxLengthKey) {
      maxLengthKey = key.length;
    }
  }
  for (const key in meta) {
    if (key.startsWith("_") || meta[key] === undefined) continue;
    const _key = key + ':';

    output += fmt.dim(`${_key.padEnd(maxLengthKey + 3)} ${meta[key]}\n`);
  }
  return output;
}

export function printErrorsSummary(blocks: Block[]): void {
  const blocksWidthErrors = blocks.filter((b) => b.error);

  if (blocksWidthErrors.length) {
    console.info();
    printTitle("⬇   Failures Summary   ⬇", "brightRed");
    console.info();
  }
  let firstError = true;
  for (const { error, meta } of blocksWidthErrors) {
    if (!error) {
      continue;
    }
    const maximumLength = Deno.consoleSize(Deno.stdout.rid).columns / 2;
    const path = `${meta._relativeFilePath}:${1 + (meta._startLine || 0)}`;
    const messagePath = `${fmt.dim("at:")} ${fmt.cyan(path)}`;
    // const messageText = `${fmt.red("✖")} ${fmt.white(error.message)}`;
    let message = "";

    if (!meta._errorDisplayed) {
      firstError || console.error(fmt.dim("------------------"));
      if (getDisplayIndex(meta) === 1) {
        // console.log(messageText,fmt.blue('------------------\n'));
        const messageText = fmt.stripColor(error.message);
        const trimmedMessage = messageText.trim().replaceAll(/\s+/g, " ");
        const messageLength = trimmedMessage.length;
        const needsToTruncate = messageLength > maximumLength;
        const truncatedMessage = needsToTruncate
          ? `${trimmedMessage.slice(0, maximumLength - 3)}...`
          : trimmedMessage;
        const messagePadded = truncatedMessage.padEnd(maximumLength);
        message = `${fmt.red("✖")} ${fmt.white(messagePadded)} ${messagePath}`;
      } else {
        message = `${fmt.red("✖")} ${fmt.white(error.message)
          } \n${messagePath}`;
      }
    } else {
      message = messagePath;
    }
    console.error(message);
    firstError = false;
  }
}

export function printError(block: Block): void {
  const error = block.error;
  if (!error) return;

  const path = block.meta._relativeFilePath;

  printTitle("⬇   Error    ⬇");

  block.description && console.error(fmt.brightRed(block.description));
  console.error(
    fmt.dim("At:\n"),
    fmt.cyan(`${path}:${1 + (block.meta._startLine || 0)}`),
  );
  console.error(fmt.dim("Message:\n"), fmt.white(error?.message));
  // error?.stack && console.error(fmt.dim('Trace:\n'), fmt.dim(error?.stack));
  error?.cause &&
    console.error(fmt.dim("Cause:\n"), fmt.dim(String(error?.cause)));
  block.meta._errorDisplayed = true;
  console.error();
}

export function requestToText(request: Request): string {
  const method = request.method;
  const url = request.url;
  return `${fmt.brightWhite(`${fmt.yellow(method)} ${url}`)}`;
}
export function responseToText(response: Response): string {
  const statusColor = response.status >= 200 && response.status < 300
    ? fmt.green
    : response.status >= 300 && response.status < 400
      ? fmt.yellow
      : response.status >= 400 && response.status < 500
        ? fmt.red
        : fmt.bgRed;

  const status = statusColor(String(response.status));
  const statusText = response.statusText;

  return `${fmt.dim(`HTTP/1.1`)} ${fmt.bold(`${status} ${statusText}`)}`;
}
export function headersToText(headers: Headers): string {
  let maxLengthKey = 0;
  let maxLengthValue = 0;

  let result = "";

  for (const [key, value] of headers.entries()) {
    maxLengthKey = Math.max(maxLengthKey, key.length);
    maxLengthValue = Math.max(maxLengthValue, value.length);
  }
  for (const [key, value] of headers.entries()) {
    result += `${fmt.dim(`${key}:`.padEnd(maxLengthKey + 1))} ${fmt.dim(value.padEnd(maxLengthValue + 1))
      }\n`;
  }

  return result;
}
export async function printBody(re: _Response | _Request): Promise<void> {
  try {
    let body = await bodyToText(re);
    body &&= body.trim() + "\n";
    console.info(body);
  } catch (error) {
    console.error(fmt.bgYellow(" Error printing block "));
    console.error(fmt.red(error.name), error.message);
    // console.error(error.stack);
  }
}

async function bodyToText(re: _Request | _Response): Promise<string> {
  const body = await re.getBody();

  const contentType = re.headers.get("content-type") || "";
  if (!contentType || !body) {
    return "";
  }

  const includes = (ct: string) => contentType.includes(ct);

  if (mimesToArrayBuffer.some(includes)) {
    return await imageToText(body as ArrayBuffer);
  }
  if (mimesToBlob.some(includes)) {
    return `${Deno.inspect(body)}`;
  }

  const bodyStr = typeof body === "string"
    ? body
    : JSON.stringify(body, null, 2);
  const language = contentTypeToLanguage(contentType);

  if (language) {
    if (supportsLanguage(language)) {
      return highlight(bodyStr, { language, ignoreIllegals: true });
    }

    return highlight(bodyStr);
  }
  if (mimesToText.some(includes)) {
    return bodyStr;
  }

  throw new Error("Unknown content type " + contentType);
}
function contentTypeToLanguage(contentType: string): string {
  let language = extension(contentType);
  if (!language) {
    const [mime] = contentType.split(";");
    [, language] = mime.split("/");
    language = language.replace(/\+.*/, "");
  }
  language ||= "text";
  language = language !== "plain" ? language : "text";
  return language;
}

async function imageToText(body: ArrayBuffer): Promise<string> {
  const rawFile = new Uint8Array(body);
  const options = { rawFile };
  return [...await getImageStrings(options)].join("");
}
