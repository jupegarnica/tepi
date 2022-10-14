import { parse, type Args } from "https://deno.land/std@0.159.0/flags/mod.ts"
import { globsToFiles } from "./globsToFiles.ts";
import { type File } from './types.ts'
import {fetchBlock} from './fetchBlock.ts'
import { assertResponse } from "./assertResponse.ts";
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

    for (const file of files) {
        for (const block of file.blocks) {
            if (block.request) {
                await fetchBlock(block);
            }
            if (block.response) {
                assertResponse(block);
            }
        }
    }

    return files;
}