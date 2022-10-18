import { parse, type Args } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { filePathsToFiles } from "./filePathsToFiles.ts";
import { Meta, type File } from './types.ts'
import { fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import { colors } from "https://deno.land/x/terminal_images@3.0.0/deps.ts";
// import ora from "npm:ora";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { print } from "./print.ts";
import { parseMetaFromText, parseRequestFromText, parseResponseFromText } from "./parseBlockText.ts";

let exitCode = 0;

if (import.meta.main) {

    const args = parse(Deno.args, {
        default: {
            watch: false,
            verbose: false,
        },
        boolean: ['help', 'verbose', 'failFast', 'watch', 'quiet'],
        alias: {
            h: 'help',
            v: 'verbose',
            w: 'watch',
            t: 'timeout',
            f: 'failFast',
            q: 'quiet',
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
    -v, --verbose       output http request and response
    -q, --quiet         do not output http request and response
    -w, --watch         watch files for changes
    -f, --fail-fast     fail on error

// TODO:
    -t, --timeout       timeout for requests in ms
    -c, --concurrency   number of concurrent requests
    `
        )
        Deno.exit(0);

    }
    const defaultMeta = {
        verbose: args.verbose,
        quiet: args.quiet,

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
    console.info(colors.dim('\nWatching for file changes at:'));
    filePaths.map((filePath) => relative(Deno.cwd(), filePath)).forEach((filePath) => console.info(colors.cyan(`  ${filePath}`)));
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

    const totalBlocks = files.reduce((acc, file) => acc + file.blocks.filter(b => !!b.request).length, 0);
    let passedBlocks = 0;
    let failedBlocks = 0;
    let runBlocks = 0;
    let ignoredBlocks = 0;
    for (const file of files) {
        const relativePath = relative(Deno.cwd(), file.path);

        console.info(colors.brightBlue(`\n${relativePath}\n`));

        for (const block of file.blocks) {
            block.meta = {
                ...defaultMeta,
                ...block.meta,
            }
            runBlocks++;
            const text = block.meta?.name as string ||
                `${block.request?.method} ${block.request?.url}`

            const spinner = wait({

                prefix: colors.dim(`${runBlocks}/${totalBlocks}`),
                text: colors.bold(text),

                color: 'cyan',
                spinner: 'dots4',
                interval: 200,
                discardStdin: true,
            }).start();
            try {



                if (block.meta.ignore) {
                    ignoredBlocks++;
                    spinner.stopAndPersist({ symbol: '✔', text: colors.dim(text) });
                    continue;
                }

                block.request = parseRequestFromText(block.text);
                block.meta = parseMetaFromText(block.text);



                if (block.request) {
                    await fetchBlock(block);
                }
                block.expectedResponse = parseResponseFromText(block.text);

                if (block.expectedResponse) {
                    assertResponse(block);
                }
                spinner?.succeed();
                passedBlocks++;
            } catch (error) {
                spinner?.fail();
                failedBlocks++;
                console.error();
                console.error(colors.red(error.message));
                console.error('at:', colors.cyan(`${relativePath}:${1 + (block.startLine || 0)}`));

                exitCode++;
            } finally {
                if (block.meta.verbose) {
                    await print(block);
                }
                if (!block.expectedResponse?.bodyUsed) {
                    await block.expectedResponse?.body?.cancel();
                }
                if (!block.actualResponse?.bodyUsed) {
                    await block.actualResponse?.body?.cancel();
                }
                if (failFast && exitCode) {
                    const status = block.actualResponse?.status || 1;
                    console.log(colors.red(`\nFAIL FAST: exiting with status ${status}`));
                    Deno.exit(status);
                }

            }
        }
    }
    console.info(
        '\n',
        colors.green(`Passed: ${passedBlocks}`),
        colors.red(`Failed: ${failedBlocks}`),
        colors.yellow(`Ignored: ${ignoredBlocks}`),
        colors.white(`Total: ${totalBlocks}`)
    )
    return files;
}
