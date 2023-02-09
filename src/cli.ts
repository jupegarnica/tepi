import { type Args, parse } from "https://deno.land/std@0.164.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.164.0/fmt/colors.ts";
import { relative } from "https://deno.land/std@0.164.0/path/posix.ts";
import { globsToFilePaths } from "./files.ts";
import { config } from "https://deno.land/std@0.164.0/dotenv/mod.ts";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./print.ts";
import { help } from "./help.ts";

const mustExit = !Deno.env.get("TEPI_NOT_EXIT");
function exit(code: number) {
  mustExit && Deno.exit(code);
}

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
    boolean: ["help", "failFast", "noColor", "upgrade", "noAnimation"],
    string: ["display", "envFile"],

    alias: {
      h: "help",
      w: "watch",
      t: "timeout",
      f: "failFast",
      d: "display",
      e: "envFile",
      envFile: "env-file",
      noColor: "no-color",
      watchNoClear: "watch-no-clear",
      noAnimation: "no-animation",
      failFast: "fail-fast",
    },
  };
  const args: Args = parse(Deno.args, options);

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
    const version = await fetch("https://tepi.deno.dev/VERSION")
      .then((r) => r.text())
    console.log(version);
    exit(0);
    return;
  }

  // --help
  /////////////
  if (args.help) {
    help();
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
    const vars = await config({
      export: true,
      path,
      safe: true,
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
      console.warn(
        fmt.yellow(
          `\n${fmt.bgYellow(fmt.bold(" ONLY MODE "))} ${onlyMode.size} ${onlyMode.size === 1 ? "test" : "tests"
          } are in "only" mode.`,
        ),
      );
      if (!exitCode) {
        console.error(
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
    if (event.kind === "access") {
      noClear || console.clear();
      await runner(filePaths, defaultMeta);
      // logWatchingPaths(filePaths, filePathsToJustWatch);
      if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
        // run all
        noClear || console.clear();
        await runner(filePaths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      } else {
        // run just this file
        noClear || console.clear();
        await runner(event.paths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      }
    }
  }
}
