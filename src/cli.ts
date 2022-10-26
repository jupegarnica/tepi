import { type Args, parse } from "https://deno.land/std@0.160.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.160.0/fmt/colors.ts";
// import ora from "npm:ora";
import { relative } from "https://deno.land/std@0.160.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { config } from "https://deno.land/std@0.160.0/dotenv/mod.ts";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./print.ts";
import { help } from "./help";

if (import.meta.main) {
  await cli();
}

async function cli() {
  const options = {
    default: {
      display: "default",
      help: false,
    },
    collect: ["watch", "envFile"],
    boolean: ["help", "failFast", "noColor"],
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
      failFast: "fail-fast",
    },
  };
  const args: Args = parse(Deno.args, options);

  // --no-color
  /////////////
  if (args.noColor) {
    fmt.setColorEnabled(false);
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
  if (getDisplayIndex(defaultMeta) === -1) {
    console.error(
      fmt.brightRed(
        `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map((t) => fmt.bold(t)).join(", ")
        }`,
      ),
    );
    Deno.exit(1);
  }
  // --env-file
  /////////////
  const keysLoaded = [];
  for (const path of args.envFile) {
    const vars = await config({
      export: true,
      path,
      safe: true,
      allowEmptyValues: true,
    });
    for (const key in vars) {
      keysLoaded.push({ key, value: vars[key], path });
    }
  }
  if (keysLoaded.length && getDisplayIndex(defaultMeta) > 0) {
    console.log(
      fmt.gray(
        `Loaded ${keysLoaded.length} environment variables from: \n${keysLoaded.map(({ path }) => path).join(", ")
        }`,
      ),
    );
  }

  // resolves globs to file paths
  /////////////
  const globs: string = args._.length ? args._.join(" ") : "**/*.http";
  const filePathsToRun = await globsToFilePaths(globs.split(" "));

  // runner
  /////////////
  let { exitCode, onlyMode } = await runner(
    filePathsToRun,
    defaultMeta,
    args.failFast,
  );

  // warn only mode
  /////////////
  if (onlyMode.length) {
    if (getDisplayIndex(defaultMeta) > 0) {
      console.warn(
        fmt.yellow(`\n${fmt.bgYellow(fmt.bold(' ONLY MODE '))} ${onlyMode.length} tests are in "only" mode.`),
      );
      if (!exitCode) {
        console.error(fmt.red(`Failed because the ${fmt.bold('"only"')} option was used at ${onlyMode.join(", ")}`))
      }
    }
    exitCode ||= 1;
  }

  // --watch
  /////////////
  if (args.watch) {
    const filePathsToJustWatch = await globsToFilePaths(
      args.watch.filter((i: boolean | string) => typeof i === "string"),
    );
    watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta).catch(
      console.error,
    );
  } else {
    Deno.exit(exitCode);
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
) {
  const allFilePaths = filePaths.concat(filePathsToJustWatch);
  const watcher = Deno.watchFs(allFilePaths);
  logWatchingPaths(filePaths, filePathsToJustWatch);

  for await (const event of watcher) {
    if (event.kind === "access") {
      if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
        // run all
        console.clear();
        await runner(filePaths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      } else {
        // run just this file
        console.clear();
        await runner(event.paths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      }
    }
  }
}
