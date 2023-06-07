import { Block } from "./types.ts";
import $ from "https://deno.land/x/dax/mod.ts";
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";
import { DISPLAY_INDEX_MINIMAL, getDisplayIndex } from "./print.ts";



export async function executeCommand(block: Block) {

    const command = block.meta.command?.trim();
    if (!command) {
        return;
    }
    const timeout = Number(block.meta.timeout) || 0;

    const displayIndex = getDisplayIndex(block.meta);
    const cmd = $.raw`${command}`;
    cmd.timeout(timeout);

    if (displayIndex > DISPLAY_INDEX_MINIMAL) {
        console.info(
            fmt.dim(`-------  command output ------- `)
        );
        cmd.printCommand();
        cmd.stderr("inheritPiped");
        cmd.stdout("inheritPiped");
    } else {
        cmd.stderr("null");
        cmd.stdout("null");
    }
    await cmd

    if (displayIndex > DISPLAY_INDEX_MINIMAL) {
        console.info(
            fmt.dim(`-------  command output end ------- `)
        );
    }




}