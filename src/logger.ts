// TODO: fecth from deno.land/x
import { wait } from "https://raw.githubusercontent.com/denosaurs/wait/main/mod.ts"

export const REFRESH_INTERVAL = 110;

export function getSpinner(text: string) {


    return wait({
        prefix: "",
        text,
        spinner: "dots4",
        color: "yellow",
        interval: REFRESH_INTERVAL,
        discardStdin: true,
    });

}


export function log(text: string) {

    return getSpinner(text).start();


}
