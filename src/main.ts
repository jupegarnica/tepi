import { parse, type Args } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { globsToFiles } from "./globsToFiles.ts";
import { type File } from './types.ts'
import { fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import { colors } from "https://deno.land/x/terminal_images@3.0.0/deps.ts";

// import ora from "npm:ora";
import { wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

if (import.meta.main) {

    const args = parse(Deno.args, {
        boolean: ['help', 'version'],
        alias: {
            h: 'help',
            v: 'version',
        },
    })
    await runner(args);

}


export async function runner(args: Args): Promise<File[]> {


    const globs: string = args._.length ? args._.join(' ') : '**/*.http';
    const files: File[] = await globsToFiles(globs);

    const totalBlocks = files.reduce((acc, file) => acc + file.blocks.length, 0);
    let passedBlocks = 0;
    let failedBlocks = 0;
    let runnedBlocks = 0;
    // TODO SKIPPED BLOCKS
    for (const file of files) {
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
                    runnedBlocks++;
                    const text = block.meta?.name as string ||
                        `${block.request?.method} ${block.request?.url}`
                    spinner = wait({

                        prefix: colors.dim(`${runnedBlocks}/${totalBlocks}`),
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