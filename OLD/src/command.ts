import { Block } from "./types.ts";
import $ from "https://deno.land/x/dax@0.31.1/mod.ts";
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";
import { DISPLAY_INDEX_MINIMAL, getDisplayIndex } from "./print.ts";
import { getCmdSpinner } from "./logger.ts";
import { deferred } from "https://deno.land/std@0.188.0/async/deferred.ts";

function mergeReadableStreams<T>(
    ...streams: ReadableStream<T>[]
): ReadableStream<T> {
    const resolvePromises = streams.map(() => deferred<void>());

    return new ReadableStream<T>({
        start(controller) {
            Promise.all(resolvePromises).then(() => {
                controller.close();
            });
            for (const [key, stream] of Object.entries(streams)) {
                (async () => {
                    try {
                        for await (const data of stream) {
                            controller.enqueue(data);
                        }
                        resolvePromises[+key].resolve();

                    } catch (error) {
                        controller.error(error);
                    }
                })();
            }
        },
    });
}



export async function executeCommand(block: Block) {



    const command = block.meta.command?.trim();
    if (!command) {
        return;
    }
    let spinner;
    let output = "";

    // TODO: timeout
    // const timeout = Number(block.meta.timeout) || 0;

    try {
        const displayIndex = getDisplayIndex(block.meta);
        if (displayIndex > DISPLAY_INDEX_MINIMAL) {
            spinner = getCmdSpinner(command).start();
            const cmd = $.raw`${command}`;

            const child = cmd.stderr("piped").stdout('piped').spawn();
            // const stream = child.stdout();
            // TODO: merge stdout and stderr , and print them in order, now with mergeReadableStreams if the command fails it break execution
            const stream = mergeReadableStreams(child.stdout(), child.stderr());
            for await (const chunk of stream) {
                const text = new TextDecoder().decode(chunk);
                if (!output) {
                    console.group();
                    console.info(
                        fmt.dim(`-------  output: ${command} ------- `)
                    );
                }
                output += text;
                console.info(text.replace(/\n$/, ''));
            }
        } else {

            await $.raw`${command}`.quiet()
            // .timeout(timeout);
        }

        if (output) {
            console.info(
                fmt.dim(`-------  output end: ${command} ------- `)
            );
            console.groupEnd();

        }
        spinner?.success(command);
    } catch (error) {

        spinner?.fail(command);
        const err = new Error(`command failed: ${command} \n ${error}`);
        err.cause = error;
        throw err

    }




}