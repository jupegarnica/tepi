import { parse, type Args } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { filePathsToFiles } from "./filePathsToFiles.ts";
import { type File } from './types.ts'
import { fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import { colors } from "https://deno.land/x/terminal_images@3.0.0/deps.ts";
// import ora from "npm:ora";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";

if (import.meta.main) {

    const args = parse(Deno.args, {
        boolean: ['help', 'version'],
        alias: {
            h: 'help',
            v: 'version',
        },
    })
    if (args.help) {
        console.log(`Usage: deno run --allow-net --allow-read --allow-write --allow-env --unstable src/main.ts [OPTIONS] [FILES]

Options:
    -h, --help      Show this help message and exit
    -v, --version   Show version and exit`)
        Deno.exit(0)
    }
    if (args.watch) {
        console.log('watching')
        const watcher = Deno.watchFs("/");
        for await (const event of watcher) {
            console.log(">>>> event", event);
            // { kind: "create", paths: [ "/foo.txt" ] }
        }
    }
    const globs: string = args._.length ? args._.join(' ') : '**/*.http';
    const filePaths = await globsToFilePaths(globs.split(' '));
    await runner(filePaths);

}


export async function runner(filePaths: string[]): Promise<File[]> {

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

        console.info(colors.brightBlue(`\n${relativePath}`));

        for (const block of file.blocks) {
            const defaultMeta = {
                hideBody: true,
                hideHeaders: true,
                hideRequest: true,
                hideResponse: true,
            }
            block.meta = {
                ...defaultMeta,
                ...block.meta,
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
                console.error('at:', colors.cyan(`${file.path}:${1 + (block.startLine || 0)}`));
                // wait
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