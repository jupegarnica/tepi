import * as fmt from "https://deno.land/std@0.160.0/fmt/colors.ts";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToArrayBuffer, mimesToBlob, mimesToText } from "./types.ts";
import { _Request, _Response, Block, Meta } from "./types.ts";
import { contentTypeToLanguage, highlight } from "./highlight.ts";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";
import { ms } from "https://deno.land/x/ms@v0.1.0/ms.ts";



type FmtMethod = keyof typeof fmt;

// TODO make it work on CI
function consoleSize(): { rows: number; columns: number } {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    console.debug("Could not get console size, getting default size");
    return { columns: 150, rows: 150 };
  }
}

function printTitle(title: string, fmtMethod: FmtMethod = "gray") {
  const consoleWidth = consoleSize().columns;
  // @ts-ignore // TODO: fix this
  const titleStr = fmt[fmtMethod](` ${title} `, undefined) as string;
  let padLength = 2 + Math.floor((consoleWidth - titleStr.length) / 2);
  padLength = padLength < 0 ? 0 : padLength;
  const separator = fmt.gray("-");
  const output = `${separator.repeat(5)} ${titleStr} ${separator.repeat(padLength)
    }`;
  console.info(output);
}

export const DISPLAYS = [
  "none",
  "minimal",
  "default",
  "full",
  "verbose",
];
export function getDisplayIndex(meta: Meta): number {
  const display = meta.display;
  const index = DISPLAYS.indexOf(display);
  if (index === -1) {
    return Infinity;
  }
  return index;
}

export async function printBlock(block: Block): Promise<void> {
  const { request, actualResponse, expectedResponse, error, meta } = block;

  if (block.meta.ignore) {
    return;
  }
  const displayIndex = getDisplayIndex(meta);
  if (displayIndex < 3) {
    return;
  }
  console.group();
  if (
    block.meta._relativeFilePath &&
    (request || actualResponse || expectedResponse || error)
  ) {
    const path = `\n${fmt.dim("Data from:")} ${fmt.cyan(`${block.meta._relativeFilePath}:${block.meta._startLine}`)
      }`;
    console.info(path);
  }
  if (meta && displayIndex >= 4) {
    printTitle("⬇   Meta    ⬇");
    console.info(metaToText(meta));
  }
  if (request) {
    console.info("");
    printTitle("⬇   Request    ⬇");

    console.info(requestToText(request));
    console.info(headersToText(request.headers, displayIndex));
    await printBody(request, displayIndex);
  }

  if (actualResponse) {
    printTitle("⬇   Response   ⬇");

    console.info(responseToText(actualResponse));
    console.info(headersToText(actualResponse.headers, displayIndex));
    await printBody(actualResponse, displayIndex);
  }
  if (expectedResponse) {
    printTitle("⬇   Expected Response   ⬇");
    console.info(responseToText(expectedResponse));
    console.info(headersToText(expectedResponse.headers, displayIndex));
    await printBody(expectedResponse, displayIndex);
  }
  if (error) {
    printError(block);
  }
  console.groupEnd();
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
    const _key = key + ":";

    output += fmt.dim(`${_key.padEnd(maxLengthKey + 3)} ${meta[key]}\n`);
  }
  return output;
}

export function printErrorsSummary(_blocks: Set<Block>): void {
  const blocks = Array.from(_blocks);
  const blocksWidthErrors = blocks.filter((b) => b.error);

  if (blocksWidthErrors.length) {
    console.info();
    printTitle("⬇   Failures Summary   ⬇", "brightRed");
    console.info();
  }
  let firstError = true;
  for (const { error, meta, description } of blocksWidthErrors) {
    if (!error) {
      continue;
    }
    const maximumLength = consoleSize().columns / 2;
    const path = `${meta._relativeFilePath}:${1 + (meta._startLine || 0)}`;
    const messagePath = `${fmt.dim("at:")} ${fmt.cyan(path)}`;
    // const messageText = `${fmt.red("✖")} ${fmt.white(error.message)}`;
    let message = "";

    if (!meta._errorDisplayed) {
      firstError || console.error(fmt.dim("------------------"));
      if (getDisplayIndex(meta) === 1) {
        // minimal

        const messageText = fmt.stripColor(`${description} => ${error.name}: ${error.message}`);
        const trimmedMessage = messageText.trim().replaceAll(/\s+/g, " ");
        const messageLength = trimmedMessage.length;
        const needsToTruncate = messageLength > maximumLength;
        const truncatedMessage = needsToTruncate
          ? `${trimmedMessage.slice(0, maximumLength - 4)} ...`
          : trimmedMessage;
        const messagePadded = truncatedMessage.padEnd(maximumLength);

        const finalMsg = messagePadded.replace(/.+=>/, fmt.red('$&'));
        message = `${fmt.red("✖")}  ${finalMsg} ${messagePath}`;
      } else {
        // default
        message = `${fmt.red("✖")} ${fmt.red(description + ' => ')} ${fmt.bold(error.name)}\n${fmt.white(error.message)
          } \n${messagePath}`;
      }
    } else {
      // already displayed
      message = `${fmt.red(description + ' => ')} ${fmt.bold(error.name).padEnd(maximumLength)} ${messagePath}`;
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
  console.error(
    fmt.dim("Message:\n"),
    fmt.bold(error?.name) + ":",
    fmt.white(error?.message),
  );
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

function truncateCols(str: string, maxLength: number): string {
  const length = str.length;
  if (length > maxLength) {
    return `${str.slice(0, maxLength - 3)}...`;
  }
  return str;
}

function truncateRows(str: string, maxLength: number): string {
  const lines = str.split("\n");

  if (lines.length > maxLength) {
    return lines.slice(0, maxLength - 3).join("\n") + fmt.bold("\n.\n.\n.");
  }
  return str;
}

export function headersToText(headers: Headers, displayIndex: number): string {
  const halfWidth = -5 + consoleSize().columns / 2;
  let maxLengthKey = 0;
  const truncateAt = halfWidth;

  let result = "";
  let truncate = truncateCols;

  if (displayIndex >= 4) {
    // verbose, do not truncate
    truncate = (str: string, _: number) => str;
  }

  for (const [key] of headers.entries()) {
    maxLengthKey = Math.max(maxLengthKey, truncate(key, truncateAt).length);
  }
  for (const [key, value] of headers.entries()) {
    result += `${fmt.gray(`${truncate(key, truncateAt)}:`.padEnd(maxLengthKey + 1))
      } ${fmt.dim(truncate(value, truncateAt))}\n`;
  }

  return result;
}
export async function printBody(
  re: _Response | _Request,
  displayIndex = 4,
): Promise<void> {
  let truncate = truncateRows;
  const MAX_BODY_LINES = 40;
  try {
    let body = await bodyToText(re);
    body &&= body.trim() + "\n";
    if (displayIndex >= 4) {
      truncate = (str: string, _: number) => str;
    }
    console.info(truncate(body, MAX_BODY_LINES));
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
    return highlight(bodyStr, language);
  }
  if (mimesToText.some(includes)) {
    return bodyStr;
  }

  throw new Error("Unknown content type " + contentType);
}

async function imageToText(body: ArrayBuffer): Promise<string> {
  const rawFile = new Uint8Array(body);
  const options = { rawFile };
  return [...await getImageStrings(options)].join("");
}

const noop = (): void => { };


const log = (text: string, prefix?: string) => wait({
  prefix,
  text,
  // color: "white",
  spinner: "dots4",
  // interval: 200,
  // discardStdin: true,
}).start();
export const logPath = (text: string, displayIndex: number) => {
  if (displayIndex === 1) {
    return log(text);
  }
  if (displayIndex > 1) {
    return console.info(text);
  }
};
export type Logger = {
  fail: () => void;
  ignore: () => void;
  pass: () => void;
  update: () => void;
  empty: () => void;
  start: () => void;
};
export function logBlock (block: Block, filePath: string, globalMeta: Meta): Logger  {
  let displayIndex = getDisplayIndex(block.meta);
  if (displayIndex === Infinity) {
    displayIndex = getDisplayIndex(globalMeta);
  }

  if (displayIndex < 2) {
    return {
      pass: noop,
      ignore: noop,
      fail: noop,
      update: noop,
      empty: noop,
      start: noop,
    };
  }
  const fromFilePath = block.meta._relativeFilePath
  const isDiferenteFile = fromFilePath !== filePath;
  const differentFile = isDiferenteFile ? fmt.dim(` needed -> ${fromFilePath}`) : ''
  const startTime = Date.now();
  const text = `${block.description} ${'   '} ${fmt.gray('0ms')}${differentFile}`;
  const spinner = wait({
    prefix: '',
    text,
    spinner: "dots4",
    color: "gray",
    interval: 170,
    discardStdin: true,
  });

  const update = () => {
    const _elapsedTime = Date.now() - startTime;
    const text = `${fmt.brightWhite(block.description)} ${'   '} ${fmt.gray(`${(_elapsedTime)}ms`)}${differentFile}`;
    if (text !== spinner.text) {
      spinner.text = text;
    }
  };
  const id = setInterval(() => {
    update();
  }, 230);

  return {
    start() {
      spinner.start();
    },
    fail: () => {
      const _elapsedTime = Date.now() - startTime;
      block.meta._elapsedTime = _elapsedTime;
      const status = String(block.actualResponse?.status || "");
      const statusText = status ? (" " + status) : (" ERR");
      const text = `${fmt.red(block.description)} ${statusText} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      spinner?.stopAndPersist({
        symbol: fmt.brightRed("✖"),
        text,
      });
      clearInterval(id);
    },
    ignore: () => {
      const _elapsedTime = Date.now() - startTime;

      const text = `${fmt.yellow(block.description)} ${'   '} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      spinner?.stopAndPersist({
        symbol: fmt.yellow(""),
        text,
      });
      clearInterval(id);

    },
    pass: () => {
      const _elapsedTime = Date.now() - startTime;
      block.meta._elapsedTime = _elapsedTime;
      const status = String(block.actualResponse?.status);
      const text = `${fmt.green(block.description)} ${status} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      spinner?.stopAndPersist({
        symbol: fmt.green("✓"),
        text,
      });
      clearInterval(id);

    },
    empty: () => {
      const _elapsedTime = Date.now() - startTime;
      const text = `${fmt.dim(block.description)} ${'   '} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      spinner?.stopAndPersist({
        symbol: fmt.dim(""),
        text
      });
      clearInterval(id);

    },
    update,
  };


};
