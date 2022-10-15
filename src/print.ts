import * as colors from "https://deno.land/std@0.158.0/fmt/colors.ts";
// @ts-ignore ¿?¿ it has a named highlight export
import { highlight } from "npm:cli-highlight";
import { getImageStrings } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";
import { mimesToBlob, mimesToArrayBuffer, mimesToText } from "./mimes.ts";
import { extension } from "https://deno.land/std@0.158.0/media_types/mod.ts?source=cli";
import { _Request, _Response, BodyExtracted, Block } from "./types.ts";
import { extractBody } from "./fetchBlock.ts";



export async function print(block: Block): Promise<void> {
  const { request, actualResponse } = block;
  if (!request) {
    return;
  }
  console.group();
  console.info(requestToText(request));
  console.info(headersToText(request.headers));
  await printBody(request);
  console.groupEnd();
  if (!actualResponse) {
    throw new Error('block.actualResponse is undefined');
  }
  console.group();

  console.info(responseToText(actualResponse));
  console.info(headersToText(actualResponse.headers));
  await printBody(actualResponse);
  console.groupEnd();

  if (!actualResponse.bodyUsed) {
    await actualResponse.body?.cancel();
  }
}




export function requestToText(request: Request): string {
  const method = request.method;
  const url = request.url;
  return `${colors.bold(`${colors.yellow(method)} ${url}`)}`;
}
export function responseToText(response: Response): string {
  const statusColor = response.status >= 200 && response.status < 300
    ? colors.green
    : response.status >= 300 && response.status < 400
      ? colors.yellow
      : response.status >= 400 && response.status < 500
        ? colors.red
        : colors.bgRed;

  const status = statusColor(String(response.status));
  const statusText = response.statusText;

  return `${colors.dim(`HTTP/1.1`)} ${colors.bold(`${status} ${statusText}`)}`;


}
export function headersToText(headers: Headers): string {
  let maxLengthKey = 0;
  let maxLengthValue = 0;

  let result = '';

  for (const [key, value] of headers.entries()) {
    maxLengthKey = Math.max(maxLengthKey, key.length);
    maxLengthValue = Math.max(maxLengthValue, value.length);
  }
  for (const [key, value] of headers.entries()) {
    result += (`${colors.dim(`${key}:`.padEnd(maxLengthKey + 1))} ${colors.dim(value.padEnd(maxLengthValue + 1))}\n`);
  }

  return result;


}
export async function printBody(re: _Response | _Request): Promise<void> {
  const { body, contentType } = await extractBody(re);

  // console.log('re.constructor.name', re.constructor.name);
  // console.log('re.bodyExtracted', re.bodyExtracted);
  // console.log('re. bodyRaw', re.bodyRaw);
  console.info(await bodyToText({ body, contentType }), '\n');

}



async function bodyToText({ body, contentType }: BodyExtracted): Promise<string> {
  if (!contentType || !body)
    return '';


  const includes = (ct: string) => contentType.includes(ct);

  if (mimesToArrayBuffer.some(includes)) {
    return await imageToText(body as ArrayBuffer);

  }
  if (mimesToBlob.some(includes)) {
    return `${Deno.inspect(body)}`;
  }


  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  const language = contentTypeToLanguage(contentType);

  if (language) {

    try {
      return highlight(bodyStr, { language, ignoreIllegals: true });
    } catch (error) {
      console.error(language, error.message);
      throw error;
    }
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
    language = language.replace(/\+.*/, '');
  }
  language ||= 'text';
  language = language !== 'plain' ? language : 'text';
  return language;

}

async function imageToText(body: ArrayBuffer): Promise<string> {
  const rawFile = new Uint8Array(body);
  const options = { rawFile };
  return [...await getImageStrings(options)].join('');
}
