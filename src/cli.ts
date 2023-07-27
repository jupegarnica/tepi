import { type Args, parse } from "https://deno.land/std@0.178.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";
import { relative } from "https://deno.land/std@0.178.0/path/posix.ts";
import { globsToFilePaths } from "./files.ts";
import { load } from "https://deno.land/std@0.178.0/dotenv/mod.ts";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./print.ts";
import { help, readme } from "./help.ts";
import { dispatch } from "./store.ts  "
import render from "https://deno.land/x/eta@v1.12.3/render.ts";
import { renderUI } from "./render.tsx";

const mustExit = !Deno.env.get("TEPI_NOT_EXIT");
function exit(code: number) {
  // mustExit && Deno.exit(code);
  mustExit && setTimeout(() => {
     Deno.exit(code);
  },100)
}

Deno.addSignalListener("SIGINT", () => {
  // console.info(fmt.yellow('\nForcefully exiting with code 143 (SIGINT)'));
  dispatch({ type: "SHOW_MESSAGE", payload: { message: "Forcefully exiting with code 143 (SIGINT)", color: "yellow" } });
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
  const args: Args = parse(Deno.args, options);


  // --no-color
  /////////////
  // TODO --no-color
  // if (args.noColor) {
  //   fmt.setColorEnabled(false);
  // }
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
    return;
  }

  // --version
  /////////////
  if (args.version) {
    // fetch VERSION file
    const version = await fetch("https://tepi.deno.dev/VERSION")
      .then((r) => r.text())
    console.info(version);
    exit(0);
    return;
  }

  // --help
  /////////////
  if (args.help) {
    help();
    exit(0);
    return;
  }

  if (args.readme) {
    readme();
    exit(0);
    return;
  }

  // --display
  /////////////

  if (args.display === "") {
    args.display = "full";
  }

  dispatch({ type: "SET_CLI_ARGS", payload: args });


  const defaultMeta: Meta = {
    timeout: 0,
    display: args.display as string,
  };


  if (getDisplayIndex(defaultMeta) === Infinity) {
    dispatch({
      type: "SHOW_MESSAGE", payload: {
        message: `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map((t) => fmt.bold(t)).join(", ")
          }`,
        color: 'red'
      }
    });
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
    dispatch({
      type: "SHOW_MESSAGE", payload: {
        message: `Loaded ${keysLoaded.size} environment variables from: ${Array.from(envFiles).join(", ")}`,
        color: 'gray'
      }
    });
  }

  // resolves globs to file paths and skips globs that have line specs
  /////////////
  const globs: string[] = args._.length ? args._ as string[] : ["**/*.http"];

  const filePathsToRun = await globsToFilePaths(globs);

  dispatch({ type: "SET_FILE_PATHS", payload: filePathsToRun });

  // runner
  /////////////

  // intercepts console logs

  console.log = (...args: any[]) => { };
  console.warn = (...args: any[]) => { };
  console.error = (...args: any[]) => { };
  console.info = (...args: any[]) => { };

  await Promise.race([
    runner(
      filePathsToRun,
      defaultMeta,
      args.failFast,
    ),
    renderUI(),
  ]);


  // warn only mode
  /////////////
  // TODO: only mode
  // if (onlyMode.size) {
  //   if (getDisplayIndex(defaultMeta) > 0) {
  //     console.warn(
  //       fmt.yellow(
  //         `\n${fmt.bgYellow(fmt.bold(" ONLY MODE "))} ${onlyMode.size} ${onlyMode.size === 1 ? "test" : "tests"
  //         } are in "only" mode.`,
  //       ),
  //     );
  //     if (!exitCode) {
  //       console.error(
  //         fmt.red(
  //           `\nExited with code 1 because the ${fmt.bold('"only"')} option was used at ${[...onlyMode].join(", ")
  //           }`,
  //         ),
  //       );
  //     }
  //   }
  //   exitCode ||= 1;
  // }

  // --watch
  /////////////
  // TODO: watch
  // if (args.watch || args["watch-no-clear"]) {
  //   const watch = args.watch || args["watch-no-clear"];
  //   const filePathsToJustWatch = await globsToFilePaths(
  //     watch.filter((i: boolean | string) => typeof i === "string"),
  //   );
  //   const noClear = !!args["watch-no-clear"];
  //   watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta, noClear)
  //     .catch(
  //       console.error,
  //     );
  // } else {
  //   exit(exitCode);
  // }
}

// function logWatchingPaths(filePaths: string[], filePathsToJustWatch: string[]) {
//   console.info(fmt.dim("\nWatching and running tests from:"));
//   filePaths.map((_filePath) => relative(Deno.cwd(), _filePath)).forEach((
//     _filePath,
//   ) => console.info(fmt.cyan(`  ${_filePath}`)));
//   if (filePathsToJustWatch.length) {
//     console.info(fmt.dim("\nRerun when changes from:"));
//     filePathsToJustWatch.map((_filePath) => relative(Deno.cwd(), _filePath))
//       .forEach((_filePath) => console.info(fmt.cyan(`  ${_filePath}`)));
//   }
// }

// async function watchAndRun(
//   filePaths: string[],
//   filePathsToJustWatch: string[],
//   defaultMeta: Meta,
//   noClear: boolean,
// ) {
//   const allFilePaths = filePaths.concat(filePathsToJustWatch);
//   const watcher = Deno.watchFs(allFilePaths);
//   logWatchingPaths(filePaths, filePathsToJustWatch);

//   for await (const event of watcher) {
//     if (event.kind === "access") {
//       noClear || console.clear();
//       await runner(filePaths, defaultMeta);
//       // logWatchingPaths(filePaths, filePathsToJustWatch);
//       if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
//         // run all
//         noClear || console.clear();
//         await runner(filePaths, defaultMeta);
//         logWatchingPaths(filePaths, filePathsToJustWatch);
//       } else {
//         // run just this file
//         noClear || console.clear();
//         await runner(event.paths, defaultMeta);
//         logWatchingPaths(filePaths, filePathsToJustWatch);
//       }
//     }
//   }
// }
