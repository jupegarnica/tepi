
import ora from 'npm:ora@5.4.1';
import { stdout } from 'node:process';
import * as fmt from "jsr:@std/fmt/colors";

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
