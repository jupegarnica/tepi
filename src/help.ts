import * as Marked from 'marked';
import * as Renderer from 'marked-terminal';
import chalk from 'chalk';
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

export const installCommand =
  "npm install -g @garndev/tepi";

export const runRemoteCommand =
  "npx @garndev/tepi";


async function getFileTextFromRemoteOrLocal(url: URL): Promise<string> {
  if (url.protocol === "file:") {
    return readFile(fileURLToPath(url), "utf-8");
  } else {
    return fetch(url).then((res) => res.text());
  }
}

const marked = Marked.marked;
const TerminalRenderer = Renderer.default;

const defaultOptions = {
  // Colors
  code: chalk.magenta,
  codespan: chalk.magentaBright,
  blockquote: chalk.dim.italic,
  html: chalk.gray,
  heading: chalk.green.bold,
  firstHeading: chalk.magenta.underline.bold,
  hr: chalk.reset,
  listitem: chalk.reset,
  table: chalk.reset,
  paragraph: chalk.reset,
  strong: chalk.bold,
  em: chalk.italic,
  del: chalk.dim.gray.strikethrough,
  link: chalk.blue,
  href: chalk.blue.underline,

  // Formats the bullet points and numbers for lists
  // list: function (_body, _ordered) {},

  // Reflow and print-out width
  width: 80, // only applicable when reflow is true
  reflowText: false,

  // Should it prefix headers?
  showSectionPrefix: true,

  // Whether or not to undo marked escaping
  // of entities (" -> &quot; etc)
  unescape: true,

  // Whether or not to show emojis
  emoji: true,

  // Options passed to cli-table3
  tableOptions: {},

  // The size of tabs in number of spaces or as tab characters
  tab: 3 // examples: 4, 2, \t, \t\t

  // image: function (_href, _title, _text) {} // function for overriding the default image handling.
};
marked.setOptions({
  renderer: new TerminalRenderer(defaultOptions)
});

export async function help(): Promise<void> {
  const usageMDText = await getFileTextFromRemoteOrLocal(new URL("../docs/usage.md", import.meta.url));
  console.info(marked(usageMDText));
}

export async function readme(): Promise<void> {
  const readmeMDText = await getFileTextFromRemoteOrLocal(new URL("../README.md", import.meta.url));
  console.info(marked(readmeMDText));
}
