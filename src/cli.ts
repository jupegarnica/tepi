import { type Args, parseArgs  } from "jsr:@std/cli@0.224.2";
import type { Meta } from "./types.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";
import { relative } from "jsr:@std/path@0.225.1";
import { globsToFilePaths } from "./files.ts";
import { load } from "jsr:@std/dotenv@0.224.0";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./print.ts";
import { help, readme } from "./help.ts";

const mustExit = !Deno.env.get("TEPI_NOT_EXIT");
function exit(code: number) {
  mustExit && Deno.exit(code);
}

Deno.addSignalListener("SIGINT", () => {
  console.info(fmt.yellow('\nForcefully exiting with code 143 (SIGINT)'));
  exit(143);
});

if (import.meta.main) {
  await cli();
}

export async function cli() {
  const options = {
    default: {
      display: "default",
      help: false,
    },
    collect: ["watch", "envFile", "watch-no-clear"],
    boolean: ["help", "failFast", "noColor", "upgrade", "noAnimation", "readme"],
    string: ["display", "envFile"],

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
  const args: Args = parseArgs(Deno.args, options);

  // --no-color
  /////////////
  if (args.noColor) {
    fmt.setColorEnabled(false);
  }
  // --upgrade
  /////////////
  if (args.upgrade) {
    const { code } = await new Deno.Command(Deno.execPath(), {
      args:
        "install --unstable -A --reload -f -n tepi https://tepi.deno.dev/src/cli.ts?upgrade=true"
          .split(" "),
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    exit(code);
  }

  // --version
  /////////////
  if (args.version) {
    // fetch VERSION file
    const { VERSION } = await import("./version.ts")
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
  };
  if (getDisplayIndex(defaultMeta) === Infinity) {
    console.error(
      fmt.brightRed(
        `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map((t) => fmt.bold(t)).join(", ")
        }`,
      ),
    );
    exit(1);
  }

  // --no-animation
  /////////////
  if (args.noAnimation) {
    defaultMeta._noAnimation = true;
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
  if (keysLoaded.size && getDisplayIndex(defaultMeta) > 0) {
    console.info(
      fmt.gray(
        `Loaded ${keysLoaded.size} environment variables from: ${Array.from(envFiles).join(", ")
        }`,
      ),
    );
  }

  // resolves globs to file paths and skips globs that have line specs
  /////////////
  const globs: string[] = args._.length ? args._ as string[] : ["**/*.http"];

  const filePathsToRun = await globsToFilePaths(globs);

  // runner
  /////////////
  let { exitCode, onlyMode } = await runner(
    filePathsToRun,
    defaultMeta,
    args.failFast,
  );

  // warn only mode
  /////////////

  if (onlyMode.size) {
    if (getDisplayIndex(defaultMeta) > 0) {
      console.info(
        fmt.yellow(
          `\n${fmt.bgYellow(fmt.bold(" ONLY MODE "))} ${onlyMode.size} ${onlyMode.size === 1 ? "test" : "tests"
          } are in "only" mode.`,
        ),
      );
      if (!exitCode) {
        console.info(
          fmt.red(
            `\nExited with code 1 because the ${fmt.bold('"only"')} option was used at ${[...onlyMode].join(", ")
            }`,
          ),
        );
      }
    }
    exitCode ||= 1;
  }

  // --watch
  /////////////
  if (args.watch || args["watch-no-clear"]) {
    const watch = args.watch || args["watch-no-clear"];
    const filePathsToJustWatch = await globsToFilePaths(
      watch.filter((i: boolean | string) => typeof i === "string"),
    );
    const noClear = !!args["watch-no-clear"];
    watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta, noClear)
      .catch(
        console.error,
      );
  } else {
    exit(exitCode);
  }
}

function logWatchingPaths(filePaths: string[], filePathsToJustWatch: string[]) {
  console.info(fmt.dim("\nWatching and running tests from:"));
  filePaths.map((_filePath) => relative(Deno.cwd(), _filePath)).forEach((
    _filePath,
  ) => console.info(fmt.cyan(`  ${_filePath}`)));
  if (filePathsToJustWatch.length) {
    console.info(fmt.dim("\nRerun when changes from:"));
    filePathsToJustWatch.map((_filePath) => relative(Deno.cwd(), _filePath))
      .forEach((_filePath) => console.info(fmt.cyan(`  ${_filePath}`)));
  }
}

async function watchAndRun(
  filePaths: string[],
  filePathsToJustWatch: string[],
  defaultMeta: Meta,
  noClear: boolean,
) {
  const allFilePaths = filePaths.concat(filePathsToJustWatch);
  const watcher = Deno.watchFs(allFilePaths);
  logWatchingPaths(filePaths, filePathsToJustWatch);

  for await (const event of watcher) {
    if (event.kind === "access" || event.kind === "modify") {
      noClear || console.clear();
      if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
        // run all
        noClear || console.clear();
        debounceRunner(filePaths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      } else {
        // run just this file
        noClear || console.clear();

        debounceRunner(event.paths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      }
    }
  }
}
const debounceRunner = debounce(runner, 100);

function debounce(func: Function, wait: number) {
  let timeout: number | null;
  return function (...args: any) {
    clearTimeout(timeout as number);
    timeout = setTimeout(() => func(...args), wait);
  };
}
