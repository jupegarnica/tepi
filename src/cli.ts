import { type Args, parse } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { filePathsToFiles } from "./filePathsToFiles.ts";
import type { Meta, File, Block } from './types.ts'
import { consumeBodies, fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { printBlock, printError } from "./print.ts";
import { parseMetaFromText, parseRequestFromText, parseResponseFromText } from "./parseBlockText.ts";

import * as assertions from "https://deno.land/std@0.160.0/testing/asserts.ts";


let exitCode = 0;
const noop = (..._: unknown[]): void => { };



if (import.meta.main) {

    const args: Args = parse(Deno.args, {
        default: {
            display: 'default',
            help: false,
        },
        collect: ['watch'],
        boolean: ['help', 'failFast'],
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
                            minimal: display only final result
                            default: display list results and errors
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
        'default',
        'full',
    ];
    const defaultMeta: Meta = {
        display: args.display as string,
        get displayIndex(): number { return displays.indexOf(this.display as string); },
    }
    if (defaultMeta.displayIndex === -1) {
        console.error(`Invalid display mode: ${args.display}. Must be one of: ${displays.join(', ')}`);
        Deno.exit(1);
    }


    const globs: string = args._.length ? args._.join(' ') : '**/*.http';
    const filePathsToRun = await globsToFilePaths(globs.split(' '));

    await runner(filePathsToRun, defaultMeta, args.failFast);
    if (args.watch) {
        const filePathsToJustWatch = await globsToFilePaths(args.watch.filter((i: boolean | string) => typeof i === 'string'));
        watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta).catch(console.error);
    } else {
        Deno.exit(exitCode);
    }

}

function logWatchingPaths(filePaths: string[], filePathsToJustWatch: string[]) {
    console.info(fmt.dim('\nWatching and Running tests from:'));
    filePaths.map((filePath) => relative(Deno.cwd(), filePath)).forEach((filePath) => console.info(fmt.cyan(`  ${filePath}`)));
    if (filePathsToJustWatch.length) {
        console.info(fmt.dim('\nRerun when changes from:'));
        filePathsToJustWatch.map((filePath) => relative(Deno.cwd(), filePath)).forEach((filePath) => console.info(fmt.cyan(`  ${filePath}`)));
    }
}

async function watchAndRun(filePaths: string[], filePathsToJustWatch: string[], defaultMeta: Meta) {
    const allFilePaths = filePaths.concat(filePathsToJustWatch);
    const watcher = Deno.watchFs(allFilePaths);
    logWatchingPaths(filePaths, filePathsToJustWatch);

    for await (const event of watcher) {
        if (event.kind === 'access') {
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


export async function runner(filePaths: string[], defaultMeta: Meta, failFast = false): Promise<File[]> {

    const files: File[] = await filePathsToFiles(filePaths);
    let passedBlocks = 0;
    let failedBlocks = 0;
    let ignoredBlocks = 0;
    const blocksWithErrors: Block[] = [];
    let fullSpinner;

    for (const file of files) {
        const relativePath = relative(Deno.cwd(), file.path);

        if ((defaultMeta?.displayIndex as number) === 0) {
            // do not display anything
        } else if ((defaultMeta?.displayIndex as number) >= 1) {

            console.info(fmt.dim(`${relativePath}`));
        } else {
            fullSpinner = wait({ text: '' })
            fullSpinner.start();
            fullSpinner.text = fmt.dim(`${relativePath}`);
        }

        let firstBlock = true;
        let globalMeta = {};
        for (const block of file.blocks) {
            block.meta ??= {};
            block.meta.relativePath = relativePath;

            const startTime = Date.now();
            try {
                const meta = await parseMetaFromText(block.text, { ...block, ...assertions });
                block.meta = { ...defaultMeta, ...block.meta, ...globalMeta, ...meta };

                block.request = await parseRequestFromText(block, { ...block, ...assertions });
            } catch (error) {
                block.error = error;
                blocksWithErrors.push(block);
                failedBlocks++;
                continue;
            }
            if (firstBlock) {
                if (!block.request) {
                    globalMeta = block.meta;
                }
                firstBlock = false;
            }


            if (!block.request) continue;
            block.description = block.meta?.name as string
                || `${block.request?.method} ${block.request?.url}`

            let spinner;
            if ((block.meta?.displayIndex as number) >= 2) {
                spinner = wait({
                    prefix: fmt.dim('-'),
                    text: fmt.white(block.description),
                    color: 'cyan',
                    spinner: 'dots4',
                    interval: 200,
                    discardStdin: true,
                })
            } else {
                spinner = {
                    start: noop,
                    stopAndPersist: noop,
                    update: noop,
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
                await block.actualResponse?.extractBody()


                block.expectedResponse = await parseResponseFromText(
                    block.text,
                    {
                        ...block,
                        response: block.actualResponse,
                        ...assertions
                    });
                if (block.expectedResponse) {
                    await assertResponse(block);
                }
                block.elapsedTime = Date.now() - startTime;
                spinner.stopAndPersist({ symbol: fmt.green('✔'), text: fmt.green(block.description) + fmt.dim(` ${block.elapsedTime}ms`) });

                passedBlocks++;
            } catch (error) {
                block.error = error;
                blocksWithErrors.push(block);

                block.elapsedTime = Date.now() - startTime;
                spinner.stopAndPersist({ symbol: fmt.brightRed('✖'), text: fmt.red(block.description) + fmt.dim(` ${block.elapsedTime}ms`) });
                failedBlocks++;
            } finally {
                await printBlock(block);
                await consumeBodies(block);

                if (failFast && failedBlocks) {
                    blocksWithErrors.forEach(printError);
                    const status = block.actualResponse?.status || 1;
                    console.error(fmt.red(`\nFAIL FAST: exiting with status ${status}`));
                    Deno.exit(status);
                }

            }

        }

        fullSpinner?.stopAndPersist();
    }
    if ((defaultMeta?.displayIndex as number) !== 0) {
        blocksWithErrors.forEach(printError);
        exitCode = failedBlocks;

        const statusText = exitCode ? fmt.bgRed(' FAIL ') : fmt.bgBrightGreen(' PASS ');

        const totalBlocks = passedBlocks + failedBlocks + ignoredBlocks;
        console.info()
        console.info(
            (fmt.bold(`${statusText}`)),
            `${fmt.white(String(totalBlocks))} tests, ${fmt.green(String(passedBlocks))} passed, ${fmt.red(String(failedBlocks))} failed, ${fmt.yellow(String(ignoredBlocks))} ignored`,
        )
    }
    return files;
}
