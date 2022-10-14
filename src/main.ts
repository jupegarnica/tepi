import { parse, type Args } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { globsToFiles } from "./globsToFiles.ts";
import { type File } from './types.ts'
import { fetchBlock } from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
import { colors } from "https://deno.land/x/terminal_images@3.0.0/deps.ts";
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


    const tests = [];

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
            try {
                if (block.request) {
                    await fetchBlock(block);
                }
                if (block.response) {
                    assertResponse(block);
                }
            } catch (error) {
                // TODO handle error AND override error stacktrace to .http file line

                // const customError = new Error(
                //     `Error in ${file.path}:${block.startLine}
                //         ${error.message}`)

                console.error('❌', colors.cyan(`${file.path}:${block.startLine}`));
                console.error(error.message);

            }
        }
    }

    return files;
}