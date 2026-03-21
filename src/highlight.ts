import { extension } from "@std/media-types/extension";
import { inspect } from "node:util";

let supportsLang = (_: string) => true;
let hl = (code: string, { language: _ }: { language: string }) => code;

try {
  const { highlight, supportsLanguage } = await import(
    "cli-highlight"
  );
  hl = highlight;
  supportsLang = supportsLanguage;
} catch {
  // console.error("cli-highlight not available");
}

export function highlight(txt: string, language: string): string {
  if (language === "json") {
    return inspect(JSON.parse(txt), { colors: !process.env.NO_COLOR, breakLength: 2_000, depth: 10 });
  }
  if (supportsLang(language)) return hl(txt, { language });
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
