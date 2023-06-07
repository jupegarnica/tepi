
import { wait, type Spinner } from "https://deno.land/x/wait@0.1.12/mod.ts";
// import wait from "npm:ora"

export const REFRESH_INTERVAL = 130;



export const getSpinner = (text = '') => {

    const spinner = wait({
        text,
        spinner: "dots4",
        color: "yellow",
        interval: REFRESH_INTERVAL,
        discardStdin: true
    });

    const info = (...args: unknown[]) => {
        spinner.stop();
        console.log(...args);
        spinner.start();
    }
    globalThis.console.info = info;
    globalThis.console.debug = info;


    return spinner;
}

export const log = (text: string) => getSpinner(text).start();
