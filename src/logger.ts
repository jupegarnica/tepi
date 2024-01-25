
// import { wait } from "https://deno.land/x/wait@0.1.13/mod.ts";
import ora from 'npm:ora@5.4.1';
import { stdout } from 'node:process';
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";

export const REFRESH_INTERVAL = 110;

export function getSpinner(text: string) {



    return ora({
        prefixText: "",
        text,
        spinner: "dots4",
        color: "blue",
        interval: REFRESH_INTERVAL,
        discardStdin: true,
        stream: stdout,
    });

}




export function log(text: string) {
    console.log(fmt.blue(text));

    return getSpinner(text).start();


}
