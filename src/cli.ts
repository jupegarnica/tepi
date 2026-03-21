import { type Args, parseArgs } from "@std/cli";
import type { Meta } from "./types.ts";
import * as fmt from "@std/fmt/colors";
import { relative } from "@std/path";
import { globsToFilePaths } from "./files.ts";
import { load } from "@std/dotenv";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./ui/formatters.ts";
import { help, readme } from "./help.ts";
import { render } from "ink";
import React from "react";
import { createStore } from "./ui/store.ts";
import { App } from "./ui/App.tsx";
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
    string: ["display", "envFile", "threads"],

    alias: {
      h: "help",
      w: "watch",
      t: "timeout",
      f: "failFast",
      d: "display",
      e: "envFile",
      r: "readme",
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
    timeout: 0,
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
      allowEmptyValues: true,
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
    watchAndRun(
      filePathsToRun,
      filePathsToJustWatch,
      defaultMeta,
      noClear,
      store,
      inkInstance
    ).catch(console.error);
  } else {
    if (inkInstance) {
      // Give React one event-loop turn to render the final "done" state,
      // then unmount ink cleanly before exiting.
      await new Promise((resolve) => setTimeout(resolve, 50));
      inkInstance.unmount();
    }
    exit(exitCode);
  }
}

async function watchAndRun(
  filePaths: string[],
  filePathsToJustWatch: string[],
  defaultMeta: Meta,
  noClear: boolean,
  store: ReturnType<typeof createStore>,
  _inkInstance: ReturnType<typeof render> | undefined
) {
  const allFilePaths = filePaths.concat(filePathsToJustWatch);
  const watcher = chokidar.watch(allFilePaths, { ignoreInitial: true });

  return new Promise<void>((_resolve, reject) => {
    watcher.on("error", reject);
    watcher.on("change", (changedPath: string) => {
      if (!noClear) {
        console.clear();
      }
      // Reset store state for re-run (preserves watch config)
      store.getState().reset();

      if (filePathsToJustWatch.includes(changedPath)) {
        debounceRunner(filePaths, defaultMeta, false, store);
      } else {
        debounceRunner([changedPath], defaultMeta, false, store);
      }
    });
  });
}
const debounceRunner = debounce(runner, 100) as typeof runner;

function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null;
  return function (...args: any) {
    clearTimeout(timeout as ReturnType<typeof setTimeout>);
    timeout = setTimeout(() => func(...args), wait);
  };
}
