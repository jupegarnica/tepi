import { type Args, parse } from "https://deno.land/std@0.159.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";

import { runner } from "./runner";


if (import.meta.main) {
    const args: Args = parse(Deno.args, {
        default: {
            display: "default",
            help: false,
        },
        collect: ["watch"],
        boolean: ["help", "failFast"],
        alias: {
            h: "help",
            w: "watch",
            t: "timeout",
            f: "failFast",
            d: "display",
            "fail-fast": "failFast",
        },
    });
    if (args.help) {
        console.log(
            `Usage: httest [options] [file|glob]...

Examples:
    httest
    httest api.http
    httest test.http test2.http
    httest **/*.http

Options:

    -h, --help          output usage information
    -w, --watch         watch files for changes
    -f, --fail-fast     fail on error
    -d, --display       display mode, (defaults: only-error)
                            none: display nothing
                            minimal: display only final result
                            default: display list results and errors
                            full: display all requests and responses
    -t, --timeout       global timeout for all requests in ms

// TODO:
    -c, --concurrency   number of concurrent requests
    `,
        );
        Deno.exit(0);
    }

    const displays = [
        "none",
        "minimal",
        "default",
        "full",
    ];
    const defaultMeta: Meta = {
        timeout: 0,
        display: args.display as string,
        get displayIndex(): number {
            return displays.indexOf(this.display as string);
        },
    };
    if (defaultMeta.displayIndex === -1) {
        console.error(
            `Invalid display mode: ${args.display}. Must be one of: ${displays.join(", ")
            }`,
        );
        Deno.exit(1);
    }

    const globs: string = args._.length ? args._.join(" ") : "**/*.http";
    const filePathsToRun = await globsToFilePaths(globs.split(" "));

    const { exitCode } = await runner(filePathsToRun, defaultMeta, args.failFast);
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
    console.info(fmt.dim("\nWatching and Running tests from:"));
    filePaths.map((filePath) => relative(Deno.cwd(), filePath)).forEach((
        filePath,
    ) => console.info(fmt.cyan(`  ${filePath}`)));
    if (filePathsToJustWatch.length) {
        console.info(fmt.dim("\nRerun when changes from:"));
        filePathsToJustWatch.map((filePath) => relative(Deno.cwd(), filePath))
            .forEach((filePath) => console.info(fmt.cyan(`  ${filePath}`)));
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
