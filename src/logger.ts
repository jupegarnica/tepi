// TODO: fetch from deno.land/x
// import { wait } from "https://raw.githubusercontent.com/denosaurs/wait/main/mod.ts"
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";


// mock wait
// TODO REMOVE
export function wait(options: any): any {
    const self = {
        start: () => {
            console.log(options.text);
            return self;
        },
        stopAndPersist: (options: any) => {
            console.log(options.text);
        }
    }
    return self
}

export const REFRESH_INTERVAL = 110;

export function getSpinner(text: string) {


    return wait({
        prefix: "",
        text,
        spinner: "dots4",
        color: "blue",
        interval: REFRESH_INTERVAL,
        discardStdin: true,
    });

}


export function getCmdSpinner(text: string) {

    const spinner = wait({

        text: fmt.blue("$") + " " + text,
        spinner: "clock",
        color: "green",
        interval: REFRESH_INTERVAL,
        discardStdin: true,
    });
    const self = {
        start: () => {
            spinner.start();
            return self;
        },
        success: (text: string) => {
            spinner.stopAndPersist({
                symbol: '    ' + fmt.green("$"),

                 text,
            })
        },
        fail: (text: string) => {
            spinner.stopAndPersist({
                symbol: '    ' + fmt.red("$"),
                 text,

            })
        }
    }

    return self

}


export function log(text: string) {

    return getSpinner(text).start();


}
