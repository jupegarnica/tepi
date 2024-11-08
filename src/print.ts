import * as fmt from "jsr:@std/fmt@0.225.1/colors";
import { getImageStrings } from "jsr:@garn/terminal-images@3.1.0";
import { mimesToArrayBuffer, mimesToBlob, mimesToText } from "./types.ts";
import { _Request, _Response, Block, Meta } from "./types.ts";
import { contentTypeToLanguage, highlight } from "./highlight.ts";
import ms from "npm:ms@2.1.3";
import { REFRESH_INTERVAL, getSpinner, log } from "./logger.ts";

type FmtMethod = keyof typeof fmt;

export const DISPLAYS = [
  "none", // 0
  "minimal", // 1
  "default", // 2
  "truncate", // 3
  "full", // 4
  "verbose", // 5
];

// const DISPLAY_INDEX_NONE = getDisplayIndexNamed("none");
export const DISPLAY_INDEX_MINIMAL = getDisplayIndexNamed("minimal");
export const DISPLAY_INDEX_DEFAULT = getDisplayIndexNamed("default");
export const DISPLAY_INDEX_TRUNCATE = getDisplayIndexNamed("truncate");
export const DISPLAY_INDEX_FULL = getDisplayIndexNamed("full");
export const DISPLAY_INDEX_VERBOSE = getDisplayIndexNamed("verbose");

function consoleSize(): { rows: number; columns: number } {
  try {
    const { columns, rows } = Deno.consoleSize();
    return { columns, rows };
  } catch {
    // console.debug("Could not get console size, getting default size");
    return { columns: 150, rows: 150 };
  }
}

function printTitle(title: string, fmtMethod: FmtMethod = "gray") {
  const consoleWidth = consoleSize().columns;
  // @ts-ignore - fmtMethod is a key of fmt
  const titleStr = fmt[fmtMethod](` ${title} `, undefined) as string;
  let padLength = 2 + Math.floor((consoleWidth - titleStr.length) / 2);
  padLength = padLength < 0 ? 0 : padLength;
  const separator = fmt.gray("-");
  const output = `${separator.repeat(5)} ${titleStr} ${separator.repeat(
    padLength
  )}`;
  console.info(output);
}

export function getDisplayIndex(meta: Meta): number {
  const display = meta.display;
  const index = DISPLAYS.indexOf(display);
  if (index === -1) {
    return Infinity;
  }
  return index;
}

function getDisplayIndexNamed(name: string): number {
  const index = DISPLAYS.indexOf(name);
  if (index === -1) {
    return Infinity;
  }
  return index;
}

export async function printBlock(block: Block): Promise<void> {
  const { request, actualResponse, expectedResponse, error, meta } = block;

  const displayIndex = getDisplayIndex(meta);
  if (displayIndex < DISPLAY_INDEX_TRUNCATE) {
    return;
  }
  if (block.meta.ignore && displayIndex < DISPLAY_INDEX_VERBOSE) {
    return;
  }
  console.group();
  if (
    block.meta._relativeFilePath &&
    (request || actualResponse || expectedResponse || error)
  ) {
    const path = `\n${fmt.dim("Data from:")} ${fmt.cyan(
      `${block.meta._relativeFilePath}:${block.meta._startLine}`
    )}`;
    console.info(path);
  }
  if (meta && displayIndex >= DISPLAY_INDEX_TRUNCATE) {
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
    // const messageText = `${fmt.red("✖")} ${fmt.white((error as Error).message)}`;
    let message = "";

    if (!meta._errorDisplayed) {
      firstError || console.info(fmt.dim("------------------"));
      if (getDisplayIndex(meta) === 1) {
        // minimal
        const descriptionMaybeTruncated =
          description.length > maximumLength - 20
            ? `${description.slice(0, maximumLength - 20)}...`
            : description;

        const messageText = fmt.stripColor(
          `${descriptionMaybeTruncated} => ${(error as Error).name}: ${
            (error as Error).message
          }`
        );
        const trimmedMessage = messageText.trim().replaceAll(/\s+/g, " ");
        const messageLength = trimmedMessage.length;
        const needsToTruncate = messageLength > maximumLength;
        const truncatedMessage = needsToTruncate
          ? `${trimmedMessage.slice(0, maximumLength - 4)} ...`
          : trimmedMessage;
        const messagePadded = truncatedMessage.padEnd(maximumLength);

        const finalMsg = messagePadded.replace(/.+=>/, fmt.red("$&"));
        message = `${fmt.red("✖")}  ${finalMsg} ${messagePath}`;
      } else {
        // default
        message = `${fmt.red("✖")} ${fmt.red(description + " => ")} ${fmt.bold(
          (error as Error).name
        )}\n${fmt.white((error as Error).message)} \n${messagePath}`;
      }
    } else {
      // already displayed
      message = `${fmt.red(description + " => ")} ${fmt
        .bold((error as Error).name)
        .padEnd(maximumLength)} ${messagePath}`;
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

  block.description && console.info(fmt.brightRed(block.description));
  console.info(
    fmt.dim("At:\n"),
    fmt.cyan(`${path}:${1 + (block.meta._startLine || 0)}`)
  );
  console.info(
    fmt.dim("Message:\n"),
    fmt.bold(error?.name) + ":",
    fmt.white(error?.message)
  );
  // error?.stack && console.info(fmt.dim('Trace:\n'), fmt.dim(error?.stack));
  error?.cause &&
    console.info(fmt.dim("Cause:\n"), fmt.dim(String(error?.cause)));
  block.meta._errorDisplayed = true;
  console.info();
}

export function requestToText(request: Request): string {
  const method = request.method;
  const url = request.url;
  return `${fmt.brightWhite(`${fmt.yellow(method)} ${url}`)}`;
}
export function responseToText(response: Response): string {
  const statusColor =
    response.status >= 200 && response.status < 300
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

  if (displayIndex >= DISPLAY_INDEX_FULL) {
    // verbose, do not truncate
    truncate = (str: string, _: number) => str;
  }

  for (const [key] of headers.entries()) {
    maxLengthKey = Math.max(maxLengthKey, truncate(key, truncateAt).length);
  }
  for (const [key, value] of headers.entries()) {
    result += `${fmt.gray(
      `${truncate(key, truncateAt)}:`.padEnd(maxLengthKey + 1)
    )} ${fmt.dim(truncate(value, truncateAt))}\n`;
  }

  return result;
}
export async function printBody(
  re: _Response | _Request,
  displayIndex = DISPLAY_INDEX_FULL
): Promise<void> {
  let truncate = truncateRows;
  const MAX_BODY_LINES = 40;
  try {
    let body = await bodyToText(re);
    body &&= body.trim() + "\n";
    if (displayIndex >= DISPLAY_INDEX_FULL) {
      truncate = (str: string, _: number) => str;
    }
    console.info(truncate(body, MAX_BODY_LINES));
  } catch (error) {
    console.error(
      fmt.bgYellow(" Error printing block "),
      fmt.red((error as Error).name),
      (error as Error).message
    );
    console.info(re.bodyExtracted ?? re.bodyRaw ?? re.body);
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

  const bodyStr =
    typeof body === "string" ? body : JSON.stringify(body, null, 2);
  const language = contentTypeToLanguage(contentType);

  if (language) {
    return highlight(bodyStr, language);
  }
  if (mimesToText.some(includes)) {
    return bodyStr;
  }

  return bodyStr;
}

async function imageToText(body: ArrayBuffer): Promise<string> {
  const rawFile = new Uint8Array(body);
  const options = { rawFile };
  return [...(await getImageStrings(options))].join("");
}

const noop = (..._: unknown[]): unknown => _;

export const logPath = (
  text: string,
  displayIndex: number,
  noAnimation = false
) => {
  if (displayIndex === DISPLAY_INDEX_MINIMAL) {
    return noAnimation ? console.info(text) : log(text);
  }
  if (displayIndex > DISPLAY_INDEX_MINIMAL) {
    return console.info(text);
  }
};

export type BlockSpinner = {
  fail: () => void;
  ignore: () => void;
  pass: () => void;
  update: () => void;
  empty: () => void;
  start: () => void;
  clear: () => void;
};
export function createBlockSpinner(
  block: Block,
  filePath: string,
  globalMeta: Meta
): BlockSpinner {
  let displayIndex = getDisplayIndex(block.meta);
  if (displayIndex === Infinity) {
    displayIndex = getDisplayIndex(globalMeta);
  }

  if (displayIndex <= DISPLAY_INDEX_MINIMAL) {
    return {
      pass: noop,
      ignore: noop,
      fail: noop,
      update: noop,
      empty: noop,
      start: noop,
      clear: noop,
    };
  }
  const fromFilePath = block.meta._relativeFilePath;
  const isDiferenteFile = fromFilePath !== filePath;
  const differentFile = isDiferenteFile
    ? fmt.dim(` needed -> ${fromFilePath}`)
    : "";
  const startTime = Date.now();
  const text = `${block.description} ${"   "} ${fmt.gray(
    "0ms"
  )}${differentFile}`;

  const spinner = getSpinner(text);

  block.meta._spinner = spinner;

  const update = () => {
    if (globalMeta._noAnimation) {
      return;
    }
    const _elapsedTime = Date.now() - startTime;
    const text = ` ${fmt.dim(block.blockLink)} ${fmt.white(
      block.description
    )} ${"   "} ${fmt.gray(`${_elapsedTime}ms`)}${differentFile}`;
    if (text !== spinner.text) {
      spinner.text = text;
    }
  };
  const id = setInterval(() => {
    update();
  }, REFRESH_INTERVAL);

  return {
    start() {
      if (globalMeta._noAnimation) {
        return;
      }
      spinner.start();
    },
    fail: () => {
      const _elapsedTime = Date.now() - startTime;
      block.meta._elapsedTime = _elapsedTime;
      const status = String(block.actualResponse?.status || "");
      const statusText = status ? " " + status : " ERR";
      const text = `${fmt.dim(block.blockLink)} ${fmt.white(
        block.description
      )} ${fmt.bold(statusText)} ${fmt.gray(
        `${ms(_elapsedTime)}`
      )}${differentFile}`;
      const symbol = fmt.brightRed("✖");
      clearInterval(id);

      if (globalMeta._noAnimation) {
        console.info(symbol, text);
        return;
      }
      spinner.stopAndPersist({
        symbol,
        text,
      });
    },
    ignore: () => {
      if (displayIndex < DISPLAY_INDEX_FULL) {
        spinner.stop();
        spinner.clear();
        return;
      }
      const _elapsedTime = Date.now() - startTime;

      const text = `${fmt.dim(block.blockLink)} ${fmt.white(
        block.description
      )} ${"   "} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      const symbol = fmt.yellow("-");
      clearInterval(id);

      if (globalMeta._noAnimation) {
        console.info(symbol, text);
        return;
      }
      spinner.stopAndPersist({
        symbol,
        text,
      });
    },
    pass: () => {
      const _elapsedTime = Date.now() - startTime;
      block.meta._elapsedTime = _elapsedTime;
      const status = String(block.actualResponse?.status);
      const text = `${fmt.dim(block.blockLink)} ${fmt.white(
        block.description
      )} ${fmt.bold(status)} ${fmt.gray(
        `${ms(_elapsedTime)}`
      )}${differentFile}`;
      const symbol = fmt.brightGreen("✔");
      clearInterval(id);

      if (globalMeta._noAnimation) {
        console.info(symbol, text);
        return;
      }

      spinner.stopAndPersist({
        symbol,
        text,
      });
    },
    clear() {
      if (globalMeta._noAnimation) {
        return;
      }
      spinner.stop();
      spinner.clear();
    },
    empty: () => {
      if (displayIndex < DISPLAY_INDEX_VERBOSE) {
        spinner.stop();
        spinner.clear();
        return;
      }
      const _elapsedTime = Date.now() - startTime;
      const text = `${fmt.dim(block.blockLink)} ${fmt.dim(
        block.description
      )} ${"   "} ${fmt.gray(`${ms(_elapsedTime)}`)}${differentFile}`;
      const symbol = fmt.dim("·");
      clearInterval(id);
      if (globalMeta._noAnimation) {
        console.info(symbol, text);
        return;
      }

      spinner.stopAndPersist({
        symbol,
        text,
      });
    },

    update,
  };
}
