import { extension } from "https://deno.land/std@0.164.0/media_types/mod.ts?source=cli";

let supportsLang = (_: string) => true;
let hl = (code: string, { language: _ }: { language: string }) => code;

try {
  const { highlight, supportsLanguage } = await import("npm:cli-highlight@2.1.11");
  hl = highlight;
  supportsLang = supportsLanguage;
} catch {
  console.error("cli-highlight not available");
}

export function highlight(txt: string, language: string): string {
  if (language === "json") {
    return Deno.inspect(JSON.parse(txt), { colors: !Deno.noColor });
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
