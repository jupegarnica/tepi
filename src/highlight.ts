import { extension } from "https://deno.land/std@0.160.0/media_types/mod.ts?source=cli";
// @ts-ignore ¿?¿ it has a named highlight export
// import { highlight as hl,supportsLanguage  } from "npm:cli-highlight";

let supportsLang = (_: string) => true;
let hl = (code: string, _: unknown) => code;

try {
  const { highlight, supportsLanguage } = await import("npm:cli-highlight");
  hl = highlight;
  supportsLang = supportsLanguage;
} catch {
//   console.error(error);
}


export function highlight(txt: string, language: string): string {
  if (language === "json") return Deno.inspect(JSON.parse(txt), { colors: !Deno.noColor });
  if (supportsLang(language)) return hl(txt, { language, ignoreIllegals: true });
  return txt;
}

export function contentTypeToLanguage(contentType: string): string {
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
