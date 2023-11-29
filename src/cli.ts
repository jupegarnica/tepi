// import { relative } from "https://deno.land/std@0.178.0/path/posix.ts";
// import { globsToFilePaths } from "./files.ts";
// import { runner } from "./runner.ts";
// import { help, readme } from "./help.ts";

import { load as loadEnv } from "https://deno.land/std@0.178.0/dotenv/mod.ts";
import { DISPLAYS, getDisplayIndex } from "./display.ts";
import { type Args, parse } from "https://deno.land/std@0.178.0/flags/mod.ts";
import type { Message, Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";
import { runner } from "./runner.ts";

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
    const messages: Message[] = []
    const options = {
        default: {
            display: "default",
            help: false,
        },
        collect: ["watch", "envFile", "watch-no-clear"],
        boolean: ["help", "failFast", "noColor", "upgrade", "readme"],
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
        const { VERSION } = await import("./version.ts")
        console.log(VERSION);
        exit(0);
        return;
    }

    // --help
    /////////////
    if (args.help) {
        // TODO help();

        return;
    }

    if (args.readme) {
        // TODO readme();
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
                `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map((t: string) => fmt.bold(t)).join(", ")
                }`,
            ),
        );
        exit(1);
    }



    // --env-file
    /////////////
    const keysLoaded = new Set();
    const envFiles = new Set();
    for (const path of args.envFile) {
        const vars = await loadEnv({
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

        messages.push({
            type: "info",
            message: `Loaded ${keysLoaded.size} environment variables from: ${Array.from(envFiles).join(", ")}`,
        });
    }



    // runner
    /////////////
    let { exitCode, onlyMode } = await runner(
        defaultMeta,
        args,
    );

    // warn only mode
    /////////////

    // TODO FIX ABSOLUTE PATHS
    // TODO FIX RELATIVE PATHS FROM AUTOSIDE INSTALL FOLDER
    // if (onlyMode.size) {
    //     if (getDisplayIndex(defaultMeta) > 0) {
    //         console.warn(
    //             fmt.yellow(
    //                 `\n${fmt.bgYellow(fmt.bold(" ONLY MODE "))} ${onlyMode.size} ${onlyMode.size === 1 ? "test" : "tests"
    //                 } are in "only" mode.`,
    //             ),
    //         );
    //         if (!exitCode) {
    //             console.error(
    //                 fmt.red(
    //                     `\nExited with code 1 because the ${fmt.bold('"only"')} option was used at ${[...onlyMode].join(", ")
    //                     }`,
    //                 ),
    //             );
    //         }
    //     }
    //     exitCode ||= 1;
    // }

    // --watch
    /////////////
    // if (args.watch || args["watch-no-clear"]) {
    //     const watch = args.watch || args["watch-no-clear"];
    //     const filePathsToJustWatch = await globsToFilePaths(
    //         watch.filter((i: boolean | string) => typeof i === "string"),
    //     );
    //     const noClear = !!args["watch-no-clear"];
    //     watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta, noClear)
    //         .catch(
    //             console.error,
    //         );
    // } else {
    //     exit(exitCode);
    // }
}

// function logWatchingPaths(filePaths: string[], filePathsToJustWatch: string[]) {
//     console.info(fmt.dim("\nWatching and running tests from:"));
//     filePaths.map((_filePath) => relative(Deno.cwd(), _filePath)).forEach((
//         _filePath,
//     ) => console.info(fmt.cyan(`  ${_filePath}`)));
//     if (filePathsToJustWatch.length) {
//         console.info(fmt.dim("\nRerun when changes from:"));
//         filePathsToJustWatch.map((_filePath) => relative(Deno.cwd(), _filePath))
//             .forEach((_filePath) => console.info(fmt.cyan(`  ${_filePath}`)));
//     }
// }

// async function watchAndRun(
//     filePaths: string[],
//     filePathsToJustWatch: string[],
//     defaultMeta: Meta,
//     noClear: boolean,
// ) {
//     const allFilePaths = filePaths.concat(filePathsToJustWatch);
//     const watcher = Deno.watchFs(allFilePaths);
//     logWatchingPaths(filePaths, filePathsToJustWatch);

//     for await (const event of watcher) {
//         if (event.kind === "access") {
//             noClear || console.clear();
//             await runner(filePaths, defaultMeta);
//             // logWatchingPaths(filePaths, filePathsToJustWatch);
//             if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
//                 // run all
//                 noClear || console.clear();
//                 await runner(filePaths, defaultMeta);
//                 logWatchingPaths(filePaths, filePathsToJustWatch);
//             } else {
//                 // run just this file
//                 noClear || console.clear();
//                 await runner(event.paths, defaultMeta);
//                 logWatchingPaths(filePaths, filePathsToJustWatch);
//             }
//         }
//     }
// }
