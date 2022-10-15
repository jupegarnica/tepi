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

if (import.meta.main) {

    const args = parse(Deno.args, {
        boolean: ['help', 'verbose', 'failFast', 'watch'],
        alias: {
            h: 'help',
            v: 'verbose',
            w: 'watch',
            t: 'timeout',

        },
    })
    if (args.help) {
        console.log(
            `Usage: httest [options] [file|glob]...

Options:

    -h, --help          output usage information
    -v, --verbose       output http request and response
    -w, --watch         watch files for changes

// TODO:
    -f, --fail-fast     fail on error
    -t, --timeout       timeout for requests in ms
    -c, --concurrency   number of concurrent requests
    `
        )

    }
    const defaultMeta = {
        verbose: args.verbose,
    }

    const globs: string = args._.length ? args._.join(' ') : '**/*.http';
    const filePaths = await globsToFilePaths(globs.split(' '));

    if (args.watch) {
        watchAndRun(filePaths, defaultMeta).catch(console.error);
    }
    console.clear();
    await runner(filePaths, defaultMeta);

}

async function watchAndRun(filePaths: string[], defaultMeta: Meta) {
    // console.log('watching', filePaths);

    const watcher = Deno.watchFs(filePaths);
    for await (const event of watcher) {
        if (event.kind === 'access') {
            console.clear();
            // console.count(event.paths.join(' '));
            // console.log('file changed', event.paths);
            await runner(event.paths, defaultMeta);
        }
    }
}


export async function runner(filePaths: string[], defaultMeta: Meta): Promise<File[]> {

    const files: File[] = await filePathsToFiles(filePaths);

    const totalBlocks = files.reduce((acc, file) => acc + file.blocks.length, 0);
    let passedBlocks = 0;
    let failedBlocks = 0;
    let runBlocks = 0;
    // TODO SKIPPED BLOCKS
    for (const file of files) {
        // const commonPath = common([file.path, Deno.cwd()]);
        // const relativePath = file.path.replace(commonPath, './');
        const relativePath = relative(Deno.cwd(), file.path);

        console.info(colors.brightBlue(`\n${relativePath}\n`));

        for (const block of file.blocks) {

            block.meta = {
                ...defaultMeta,
                ...block.meta,
            }
            if (block.meta.ignore) {
                continue;
            }

            let spinner;


            try {
                if (block.request) {
                    runBlocks++;
                    const text = block.meta?.name as string ||
                        `${block.request?.method} ${block.request?.url}`
                    spinner = wait({

                        prefix: colors.dim(`${runBlocks}/${totalBlocks}`),
                        text,

                        color: 'cyan',
                        spinner: 'dots4',
                        interval: 100,
                        discardStdin: true,
                    }).start();

                    await fetchBlock(block);

                }
                if (block.response) {
                    assertResponse(block);
                }
                spinner?.succeed();
                passedBlocks++;
            } catch (error) {
                spinner?.fail();
                failedBlocks++;
                // TODO handle error AND override error stacktrace to .http file line
                console.error(error.message);
                console.error('at:', colors.cyan(`${relativePath}:${1 + (block.startLine || 0)}`));
                // wait
            } finally {
                if (block.meta.verbose) {

                    await print(block);
                }
            }
        }
    }
    console.info(
        '\n',
        colors.green(`Passed: ${passedBlocks}`),
        colors.red(`Failed: ${failedBlocks}`),
        colors.yellow(`Total: ${totalBlocks}`),
    );

    return files;
}
