import { type Args, parse } from "https://deno.land/std@0.159.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";


import { runner } from "./runner.ts";
import { generateFromString } from "https://deno.land/x/ascii_captcha@v1.0.2/mod.ts"


if (import.meta.main) {
    await cli();
}

async function cli() {
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
        const { ascii } = await generateFromString("HTTest");
        const isReadme = !!Deno.env.get("NO_COLOR");

        const b = fmt.cyan;
        const w = fmt.brightWhite;
        // const d = (t:string) => isReadme ? '> '+ t : fmt.dim('> '+ t);
        const d = fmt.dim;
        const g = fmt.brightGreen;
        const orange = (t: string) => fmt.rgb24(t, 0xFF6600);
        const codeDelimiter = isReadme ? "`" : "";
        const c = (t: string) => orange(codeDelimiter + t + codeDelimiter);
        const codeBlockDelimiter = isReadme ? "```" : "";
        const codeBlock = (t: string, lang = 'rest') => (codeBlockDelimiter + lang + t + codeBlockDelimiter);
        const helpText =
            `
${codeBlock(fmt.bold(fmt.brightYellow(ascii)),'')}

${g('# Install:')}

${w('deno install -A -f -n httest https://deno.land/x/httest/cli.ts')}



${g("# Usage:")}

${w(`httest [OPTIONS] [FILES|GLOBS...]`)}

${g("# Options:")}

${d('* ')}-w, ${b('--watch')}         ${d("Watch files for changes and rerun tests.")}
${d('* ')}-t, ${b('--timeout')}       ${d("Set the timeout for each test in milliseconds. After the timeout, the test will fail.")}
${d('* ')}-f, ${b('--fail-fast')}     ${d("Stop running tests after the first failure.")}
${d('* ')}-d, ${b('--display')}       ${d("Set the display mode. (none, minimal, default and full)")}
                            none:${d(` display nothing`)}
                            minimal:${d(` display only final result`)}
                            default:${d(` display list results and errors`)}
                            full:${d(` display all requests and responses`)}
${d('* ')}-h, ${b('--help')}         ${d("output usage information")}
${d('* ')}  , ${b('--init')}      ${d("create example.http test file")}

${g("# Examples:")}

${c(`httest`)}
${d(`> Run all .http in the current directory and folders. (same as httest ./**/*.http)`)}

${c(`httest test.http ./test2.http`)}
${d(`> Run test.http and test2.http`)}


${c(`httest **/*.http`)}
${d(`> Run all .http in the current directory and folders.`)}


${c(`httest rest.http --watch`)}
${d(`> Run rest.http and rerun when it changes`)}



${c(`httest rest.http  --watch "src/**/*.ts"`)}
${d(`> Run rest.http and rerun when any .ts file in the src folder changes.`)}


${c(`httest rest.http  --watch "src/**/*.json" --watch "src/**/*.ts"`)}
${d(`> You can use multiple --watch flags.`)}
${d(`> Note: You can use globs here too, but use quotes to avoid the shell expanding them.`)}


${g("# HTTP syntax:")}

${(`You can use the standard HTTP syntax in your .http files as follow:`)}

${codeBlock(`
${w(`POST https://example.com/`)}
${w(`Authorization: Bearer 123`)}
${w(`Content-Type: application/json`)}

${w(`{"name": "Garn"}`)}

${w(`### separate requests with 3 #`)}
${w(`# comment a line with`)}
${w(`# use @ tu include metadata`)}
${w(`# @name example`)}

${w(`GET /?body=hola`)}
${w(`host: https://faker.deno.dev`)}

${d(`# write the expected response to validate the actual response`)}
${w(`HTTP/1.1 200 OK`)}

${w(`{"name": "Garn"}`)}
`)}

${(`Run ${c(`httest --init`)} to create a example.http file to know more about the syntax.`)}

`

        console.info(helpText);
        return;
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
