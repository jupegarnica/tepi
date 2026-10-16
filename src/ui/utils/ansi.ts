import { escapeHtml } from "./ansi-escape.ts";
import { stripAnsiCode } from "@std/fmt/colors";

// SGR code -> CSS style "category:value" for termdom rendering. The formatting
// helpers emit @std/fmt SGR codes; termdom cannot carry raw CSI inside text
// nodes, so we convert. Category comes from the CSS property (color:,
// background-color:, font-weight:, opacity:, text-decoration:), and one value
// per category is active at a time (last wins, as in a browser).
const SGR_MAP: Record<string, string> = {
  "1": "font-weight:bold",
  "2": "opacity:0.6",
  "4": "text-decoration:underline",
  "30": "color:black",
  "31": "color:#cd3131",
  "32": "color:#23d18b",
  "33": "color:#f5c000",
  "34": "color:#3477ff",
  "35": "color:#d16ba5",
  "36": "color:#29b8db",
  "37": "color:#e5e5e5",
  "90": "color:#8a8a8a",
  "91": "color:#ff6e6e",
  "92": "color:#5fd787",
  "93": "color:#ffd75f",
  "94": "color:#7fb6ff",
  "95": "color:#ff8fff",
  "96": "color:#7fd8ff",
  "97": "color:#ffffff",
  "41": "background-color:#cd3131",
  "42": "background-color:#23d18b",
  "43": "background-color:#f5c000",
  "44": "background-color:#3477ff",
  "45": "background-color:#d16ba5",
  "46": "background-color:#29b8db",
  "47": "background-color:#e5e5e5",
  "101": "background-color:#cd3131",
  "102": "background-color:#23d18b",
  "103": "background-color:#f5c000",
  "104": "background-color:#3477ff",
  "105": "background-color:#d16ba5",
  "106": "background-color:#29b8db",
  "107": "background-color:#e5e5e5",
};

const SGR_RE = /\u001b\[([0-9;]*)m/g;

function category(style: string): string {
  return style.split(":")[0];
}

/**
 * Text built by the formatting helpers (with @std/fmt SGR codes) -> HTML
 * fragment safe for a termdom document. Each plain text run is wrapped in a
 * single <span> carrying the active styles; a category applies last-wins.
 */
export function ansiToHtml(line: string): string {
  let out = "";
  const active = new Map<string, string>();
  let i = 0;
  let m: RegExpExecArray | null;
  SGR_RE.lastIndex = 0;

  while (true) {
    m = SGR_RE.exec(line);
    const textEnd = m === null ? line.length : m.index;
    if (i < textEnd) {
      const text = escapeHtml(line.slice(i, textEnd));
      if (active.size === 0) out += text;
      else {
        out += `<span style="${[...active.values()].join(";")}">${text}</span>`;
      }
    }
    if (m === null) break;
    const codes = m[1];
    if (codes === "" || codes === "0") {
      active.clear();
    } else {
      for (const code of codes.split(";")) {
        if (code === "39") {
          active.delete("color");
        } else if (code === "49") {
          active.delete("background-color");
        } else {
          const style = SGR_MAP[code];
          if (style !== undefined) active.set(category(style), style);
        }
      }
    }
    i = SGR_RE.lastIndex;
  }
  return out;
}

/** Any helper-built string -> text without escape codes. */
export { stripAnsiCode as stripAnsi };

/** ink-style named color -> SGR-wrapped text (parts of the old UI relied on it). */
export function colorNameToCode(
  color: "green" | "red" | "yellow" | "blue" | "gray" | "white",
  text: string,
): string {
  const open: Record<string, string> = {
    green: "\u001b[32m",
    red: "\u001b[31m",
    yellow: "\u001b[33m",
    blue: "\u001b[34m",
    gray: "\u001b[90m",
    white: "\u001b[37m",
  };
  return `${open[color]}${text}\u001b[39m`;
}

