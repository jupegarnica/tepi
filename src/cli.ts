import { parse } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { filePathsToFiles } from "./filePathsToFiles.ts";
import type { Meta, File, Block } from './types.ts'
import { consumeBodies, fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { printHttpText, printError } from "./print.ts";
import { parseMetaFromText, parseRequestFromText, parseResponseFromText } from "./parseBlockText.ts";

let exitCode = 0;



if (import.meta.main) {

    const args = parse(Deno.args, {
        default: {
            watch: false,
            display: 'minimal',
        },
        boolean: ['help', 'failFast', 'watch'],
        alias: {
            h: 'help',
            w: 'watch',
            t: 'timeout',
            f: 'failFast',
            d: 'display',
            'fail-fast': 'failFast',
        },
    })
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
                            minimal: display list results and errors
                            full: display all requests and responses

// TODO:
    -t, --timeout       timeout for requests in ms
    -c, --concurrency   number of concurrent requests
    `
        )
        Deno.exit(0);

    }
    const displays = [
        'none',
        'minimal',
        'full',
    ];
    const displayIndex = displays.indexOf(args.display as string);

    if (displayIndex === -1) {
        console.error(`Invalid display mode: ${args.display}`);
        Deno.exit(1);
    }

    const defaultMeta: Meta = {
        display: args.display as string,
        displayIndex,
    }

    const globs: string = args._.length ? args._.join(' ') : '**/*.http';
    const filePaths = await globsToFilePaths(globs.split(' '));
    // console.log({args});

    await runner(filePaths, defaultMeta, args.failFast);
    if (args.watch) {
        watchAndRun(filePaths, defaultMeta).catch(console.error);
        logWatchingPaths(filePaths);
    } else {
        Deno.exit(exitCode);
    }

}

function logWatchingPaths(filePaths: string[]) {
    console.info(fmt.dim('\nWatching for file changes at:'));
    filePaths.map((filePath) => relative(Deno.cwd(), filePath)).forEach((filePath) => console.info(fmt.cyan(`  ${filePath}`)));
}

async function watchAndRun(filePaths: string[], defaultMeta: Meta) {

    const watcher = Deno.watchFs(filePaths);
    for await (const event of watcher) {
        if (event.kind === 'access') {

            console.clear();
            await runner(event.paths, defaultMeta);
            logWatchingPaths(filePaths);

        }
    }
}


export async function runner(filePaths: string[], defaultMeta: Meta, failFast = false): Promise<File[]> {

    const files: File[] = await filePathsToFiles(filePaths);
    let passedBlocks = 0;
    let failedBlocks = 0;
    let totalBlocks = 0;
    let ignoredBlocks = 0;
    const blocksWithErrors: Block[] = [];
    const fullSpinner = wait({ text: 'Running tests...' })

    for (const file of files) {
        const relativePath = relative(Deno.cwd(), file.path);

        if ((defaultMeta?.displayIndex as number) >= 1) {
            console.info(fmt.dim(`${relativePath}`));
        } else {
            fullSpinner.start();
            fullSpinner.text = fmt.dim(`${relativePath}`);
        }
        for (const block of file.blocks) {

            block.request = parseRequestFromText(block.text);
            if (!block.request) continue;

            block.meta = parseMetaFromText(block.text);

            block.meta = {
                ...defaultMeta,
                ...block.meta,
            }
            block.meta.relativePath = relativePath;
            totalBlocks++;
            block.description = block.meta?.name as string
                || `${block.request?.method} ${block.request?.url}`

            let spinner;
            if ((block.meta?.displayIndex as number) >= 1) {
                spinner = wait({
                    prefix: fmt.dim('-'),
                    text: fmt.white(block.description),
                    color: 'cyan',
                    spinner: 'dots4',
                    interval: 200,
                    discardStdin: true,
                })
            } else {
                const noop = (..._: unknown[]): void => { };
                spinner = {
                    start: noop,
                    stopAndPersist: noop,
                }
            }

            try {
                spinner.start();

                if (block.meta.ignore) {
                    ignoredBlocks++;
                    spinner.stopAndPersist({ symbol: fmt.yellow('-'), text: fmt.yellow(block.description) });
                    continue;
                }

                await fetchBlock(block);

                block.expectedResponse = parseResponseFromText(block.text);
                if (block.expectedResponse) {
                    assertResponse(block);
                }
                spinner.stopAndPersist({ symbol: fmt.green('✔') });
                passedBlocks++;
            } catch (error) {
                block.error = error;
                blocksWithErrors.push(block);
                spinner.stopAndPersist({ symbol: fmt.brightRed('✖'), text: fmt.red(block.description) });
                failedBlocks++;
                exitCode++;
            } finally {

                await printHttpText(block);
                await consumeBodies(block);

                if (failFast && exitCode) {
                    blocksWithErrors.forEach(printError);
                    const status = block.actualResponse?.status || 1;
                    console.log(fmt.red(`\nFAIL FAST: exiting with status ${status}`));
                    Deno.exit(status);
                }

            }

        }

        fullSpinner.stopAndPersist();
    }
    blocksWithErrors.forEach(printError);

    console.info(
        '\n',
        fmt.green(`Passed: ${passedBlocks}`),
        fmt.red(`Failed: ${failedBlocks}`),
        fmt.yellow(`Ignored: ${ignoredBlocks}`),
        fmt.white(`Total: ${totalBlocks}`)
    )
    return files;
}
