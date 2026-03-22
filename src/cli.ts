import { type Args, parseArgs } from "@std/cli";
import type { Meta } from "./types.ts";
import * as fmt from "@std/fmt/colors";
import { relative } from "@std/path";
import { globsToFilePaths, checkGlobHasLineSpec } from "./files.ts";
import { load } from "@std/dotenv";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./ui/utils/formatters.ts";
import { help, readme } from "./help.ts";
import { render } from "ink";
import React from "react";
import { createStore } from "./ui/store/index.ts";
import { App } from "./ui/App/index.ts";
import { fileURLToPath } from "node:url";
import { execFile as _execFile } from "node:child_process";
import { promisify } from "node:util";
import chokidar from "chokidar";

const execFile = promisify(_execFile);

function parseThreads(rawValue: unknown): number {
  const value = rawValue ?? "1";
  const threads = Number(value);
  if (!Number.isInteger(threads) || threads < 1) {
    throw new Error(`Invalid threads value: ${value}. Must be an integer greater than or equal to 1.`);
  }
  return threads;
}

function parseTimeout(rawValue: unknown): number {
  const value = rawValue ?? "0";
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 0) {
    throw new Error(`Invalid timeout value: ${value}. Must be an integer greater than or equal to 0.`);
  }
  return timeout;
}

function exit(code: number) {
  !process.env.TEPI_NOT_EXIT && process.exit(code);
}

let _activeStore: ReturnType<typeof createStore> | undefined;

process.on("SIGINT", () => {
  _activeStore?.getState().addMessage("error", fmt.yellow("\nForcefully exiting with code 143 (SIGINT)"));
  console.info(fmt.yellow("\nForcefully exiting with code 143 (SIGINT)"));
  exit(143);
});

const isMain = import.meta.url.startsWith("file:")
  ? process.argv[1] === fileURLToPath(import.meta.url)
  : (import.meta as { main?: boolean }).main ?? false;
if (isMain) {
  await cli();
}

export async function cli() {
  const store = createStore();
  _activeStore = store;

  const options = {
    default: {
      display: "default",
      help: false,
      threads: "1",
      timeout: "0",
    },
    collect: ["watch", "envFile", "watch-no-clear"],
    boolean: [
      "help",
      "failFast",
      "noColor",
      "upgrade",
      "noAnimation",
      "readme",
    ],
    string: ["display", "envFile", "threads", "timeout"],

    alias: {
      h: "help",
      w: "watch",
      t: "timeout",
      p: "threads",
      f: "failFast",
      d: "display",
      e: "envFile",
      r: "readme",
      parallelization: "threads",
      envFile: "env-file",
      noColor: "no-color",
      watchNoClear: "watch-no-clear",
      noAnimation: "no-animation",
      failFast: "fail-fast",
    },
  };
  const args: Args = parseArgs(process.argv.slice(2), options);

  let threads = 1;
  try {
    threads = parseThreads(args.threads);
  } catch (error) {
    console.error(fmt.brightRed((error as Error).message));
    exit(1);
    return;
  }

  let timeout = 0;
  try {
    timeout = parseTimeout(args.timeout);
  } catch (error) {
    console.error(fmt.brightRed((error as Error).message));
    exit(1);
    return;
  }

  store.getState().setDisplayMode(args.display as string || "default");

  // --no-color
  /////////////
  if (args.noColor) {
    fmt.setColorEnabled(false);
    store.getState().setNoColor(true);
  }
  // --upgrade
  /////////////
  if (args.upgrade) {
    try {
      await execFile("npm", ["install", "-g", "@garn/tepi"], { stdio: "inherit" } as any);
    } catch (e) {
      console.error((e as Error).message);
    }
    exit(0);
  }

  // --version
  /////////////
  if (args.version) {
    // fetch VERSION file
    const { VERSION } = await import("./version.ts");
    console.info(VERSION);
    exit(0);
    return;
  }

  // --help
  /////////////
  if (args.help) {
    help();
    return;
  }

  if (args.readme) {
    readme();
    return;
  }

  // --display
  /////////////

  if (args.display === "") {
    args.display = "full";
  }

  const defaultMeta: Meta = {
    timeout,
    display: args.display as string,
    threads,
  };
  if (getDisplayIndex(defaultMeta.display as string) === Infinity) {
    console.error(
      fmt.brightRed(
        `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map(
          (t) => fmt.bold(t)
        ).join(", ")}`
      )
    );
    exit(1);
  }

  // --no-animation + interactive incompatibility
  /////////////
  if (args.noAnimation && args.display === "interactive") {
    console.error(fmt.brightRed(`--no-animation is not compatible with --display interactive`));
    exit(1);
    return;
  }

  // --no-animation
  /////////////
  if (args.noAnimation) {
    defaultMeta._noAnimation = true;
    store.getState().setNoAnimation(true);
  }

  // --env-file
  /////////////
  const keysLoaded = new Set();
  const envFiles = new Set();
  for (const path of args.envFile) {
    const vars = await load({
      export: true,
      envPath: path,
    });
    for (const key in vars) {
      keysLoaded.add(key);
      envFiles.add(path);
    }
  }
  if (keysLoaded.size && getDisplayIndex(defaultMeta.display as string) > 0) {
    const msg = `Loaded ${keysLoaded.size} environment variables from: ${Array.from(envFiles).join(", ")}`;
    console.info(fmt.gray(msg));
    store.getState().addMessage("info", msg);
  }

  // resolves globs to file paths and skips globs that have line specs
  /////////////
  const globs: string[] = args._.length ? (args._ as string[]) : ["**/*.http"];

  const filePathsToRun = await globsToFilePaths(globs);

  // ink render
  /////////////
  let inkInstance: ReturnType<typeof render> | undefined;
  if (getDisplayIndex(defaultMeta.display as string) > 0) {
    inkInstance = render(React.createElement(App, { store }));
  }

  // runner
  /////////////
  let { exitCode, onlyMode } = await runner(
    filePathsToRun,
    defaultMeta,
    args.failFast,
    store
  );

  // warn only mode
  /////////////

  if (onlyMode.size) {
    if (getDisplayIndex(defaultMeta.display as string) > 0) {
      const onlyMsg = `\n${fmt.bgYellow(fmt.bold(" ONLY MODE "))} ${onlyMode.size} ${
        onlyMode.size === 1 ? "test" : "tests"
      } are in "only" mode.`;
      console.info(fmt.yellow(onlyMsg));
      store.getState().addMessage("warn", onlyMsg);
      if (!exitCode) {
        const exitMsg = `\nExited with code 1 because the ${fmt.bold('"only"')} option was used at ${[...onlyMode].join(", ")}`;
        console.info(fmt.red(exitMsg));
        store.getState().addMessage("error", exitMsg);
      }
    }
    exitCode ||= 1;
  }

  // --watch
  /////////////
  if (args.watch || args["watch-no-clear"]) {
    const watch = args.watch || args["watch-no-clear"];
    const filePathsToJustWatch = await globsToFilePaths(
      watch.filter((i: boolean | string) => typeof i === "string")
    );
    const noClear = !!args["watch-no-clear"];
    const relativeRunPaths = filePathsToRun.map((p) => relative(process.cwd(), p));
    const relativeTriggerPaths = filePathsToJustWatch.map((p) => relative(process.cwd(), p));
    store.getState().setWatchMode(relativeRunPaths, relativeTriggerPaths);
    const { done, stop } = watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta, noClear, store);

    if (args.display === "interactive") {
      // Allow q/Escape to stop the watcher and exit cleanly.
      const userExit = new Promise<void>((resolve) => {
        store.getState().setExitResolver(() => { stop(); resolve(); });
      });
      await Promise.race([done, userExit]).catch(console.error);
      await new Promise((r) => setTimeout(r, 50));
      inkInstance?.unmount();
      exit(exitCode);
    } else {
      done.catch(console.error);
      // process stays alive via chokidar file handles
    }
  } else {
    if (inkInstance) {
      if (args.display === "interactive") {
        // Keep the process alive so the user can browse results interactively.
        // Resolves when the user presses q or Escape in DisplayInteractive.
        await new Promise<void>((resolve) => {
          store.getState().setExitResolver(resolve);
        });
      }
      // Give React one event-loop turn to render the final "done" state,
      // then unmount ink cleanly before exiting.
      await new Promise((resolve) => setTimeout(resolve, 50));
      inkInstance.unmount();
    }
    exit(exitCode);
  }
}

function watchAndRun(
  filePaths: string[],
  filePathsToJustWatch: string[],
  defaultMeta: Meta,
  noClear: boolean,
  store: ReturnType<typeof createStore>,
): { done: Promise<void>; stop: () => void } {
  // Chokidar needs real FS paths — strip any ":line" specs before watching.
  const stripLineSpec = (p: string) => checkGlobHasLineSpec(p) ? p.split(":")[0] : p;
  const watchablePaths = [...new Set([...filePaths, ...filePathsToJustWatch].map(stripLineSpec))];
  const justWatchFsPaths = new Set(filePathsToJustWatch.map(stripLineSpec));

  const watcher = chokidar.watch(watchablePaths, { ignoreInitial: true });

  const done = new Promise<void>((_resolve, reject) => {
    watcher.on("error", reject);
    watcher.on("change", (changedPath: string) => {
      if (!noClear) {
        console.clear();
      }
      // Reset store state for re-run (preserves watch config)
      store.getState().reset();

      if (justWatchFsPaths.has(changedPath)) {
        debounceRunner(filePaths, defaultMeta, false, store);
      } else {
        // Re-attach original line specs so the runner targets the right block.
        const matching = filePaths.filter((p) => stripLineSpec(p) === changedPath);
        debounceRunner(matching.length ? matching : [changedPath], defaultMeta, false, store);
      }
    });
  });

  return { done, stop: () => watcher.close() };
}
const debounceRunner = debounce(runner, 100) as typeof runner;

function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null;
  return function (...args: any) {
    clearTimeout(timeout as ReturnType<typeof setTimeout>);
    timeout = setTimeout(() => func(...args), wait);
  };
}
