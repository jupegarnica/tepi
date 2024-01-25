
// import { wait } from "https://deno.land/x/wait@0.1.13/mod.ts";
import ora from 'npm:ora@5.4.1';
import * as fmt from "https://deno.land/std@0.178.0/fmt/colors.ts";

export const REFRESH_INTERVAL = 110;

export function getSpinner(text: string) {


    return ora({
        // prefix: "",
        text,
        spinner: "dots4",
        color: "blue",
        interval: REFRESH_INTERVAL,
        discardStdin: true,
    });

}


export function getCmdSpinner(text: string) {

    const spinner = ora({

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
