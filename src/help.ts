import * as Marked from 'npm:marked@4.2.12';
import * as Renderer from 'npm:marked-terminal@5.1.1';
import chalk from 'npm:chalk@5.2.0';
import { dirname, fromFileUrl, normalize } from "jsr:@std/path";

export const installCommand =
  "deno install --reload  --allow-read --allow-env --allow-net --allow-run -f -n tepi https://tepi.deno.dev/src/cli.ts";

export const runRemoteCommand =
  "deno run --allow-read --allow-env --allow-net --allow-run https://tepi.deno.dev/src/cli.ts";


function getFileTextFromRemoteOrLocal(url: string): Promise<string> {
  url = normalize(url);
  if (url.startsWith("file://")) {
    return Deno.readTextFile(fromFileUrl(url));
  } else {
    return fetch(url).then((res) => res.text());
  }
}
const baseURL = dirname(import.meta.url);

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
  const usageMDText = await getFileTextFromRemoteOrLocal(`${baseURL}/../docs/usage.md`);
  console.info(marked(usageMDText));
}

export async function readme(): Promise<void> {
  const readmeMDText = await fetch(`${baseURL}/../README.md`).then((res) => res.text());
  console.info(marked(readmeMDText));
}
