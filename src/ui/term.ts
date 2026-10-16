import { TermDOM, transportFromProcess } from "@b9g/termdom";
import { ansiToHtml } from "./utils/ansi.ts";
import { setViewport } from "./viewport.ts";

export interface TermUI {
  /**
   * Render a view: a plain string with "\n"-separated lines. ANSI escapes from
   * the formatting helpers are converted to inline styles for the DOM.
   */
  render(view: string): void;
  /** Hand the terminal back / flush final output. */
  close(): Promise<void>;
}

export function escapeHtmlTag(html: string): string {
  return html
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Raw side-channel for streaming writers (dots stream); registered by openTerm.
let rawWriter: ((chunk: string) => void) | null = null;

export function registerRawWriter(w: (chunk: string) => void): void {
  rawWriter = w;
}

export function rawWrite(chunk: string): void {
  if (rawWriter) rawWriter(chunk);
  else process.stdout.write(chunk);
}

function viewToBodyHtml(view: string): string {
  const lines = view.length ? view.split("\n") : [];
  // termdom's default white-space collapses "\n" inside a text node, so each
  // line becomes its own block element with pre-spaces preserved.
  return lines
    .map((line) => `<div style="white-space:pre">${ansiToHtml(line)}</div>`)
    .join("");
}

/**
 * Interactive rendering: the document stays attached and termdom repaints on
 * mutation (browser-like frames in place).
 */
export async function openAttachedTerm(opts?: {
  rows?: number;
  cols?: number;
}): Promise<TermUI> {
  const term = new TermDOM({ transport: transportFromProcess() });
  await term.attach();
  setViewport(term.transport.rows ?? 24, term.transport.cols ?? 80);
  registerRawWriter((chunk) => {
    const div = term.document.createElement("div");
    div.setAttribute("style", "white-space:pre");
    div.textContent = chunk.replace(/\n$/, "");
    term.document.body.appendChild(div);
  });
  return {
    render(view: string) {
      term.document.body.innerHTML = viewToBodyHtml(view);
    },
    async close() {
      await term.dispose();
    },
  };
}

/**
 * Non-interactive (pipe) rendering: every render prints the current document
 * through the transport, mirroring ink's frame semantics on a redirected
 * stdout. A fresh unattached TermDOM renders synchronously via print().
 */
export function openPipedTerm(opts?: { cols?: number; rows?: number }): TermUI {
  const writes = (chunk: string) => {
    process.stdout.write(chunk);
  };
  registerRawWriter(writes);
  const transport = {
    cols: opts?.cols ?? 80,
    rows: opts?.rows ?? 24,
    sharesScreen: true,
    interactive: false,
    ready: Promise.resolve(),
    closed: new Promise<never>(() => {}),
    readable: new ReadableStream({ start(c) { c.close(); } }),
    writable: new WritableStream({ write(c) { writes(String(c)); } }),
    resizes: new ReadableStream({ start(c) { c.close(); } }),
    close() {},
  };
  let instance: TermDOM | null = null;
  let pending: Promise<void> = Promise.resolve();

  setViewport(transport.rows, transport.cols);

  const getTerm = () => {
    if (instance === null) {
      instance = new TermDOM({ transport });
    }
    return instance;
  };

  return {
    render(view: string) {
      const term = getTerm();
      term.document.body.innerHTML = viewToBodyHtml(view);
      pending = pending
        .then(() => term.print())
        .catch((e) => {
          console.error(`tepi render error: ${e?.stack ?? e}`);
        });
    },
    async close() {
      await pending;
      if (instance) {
        await instance.dispose().catch(() => {});
      }
      instance = null;
    },
  };
}
