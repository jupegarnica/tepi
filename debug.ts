import { getImageStrings, printImage } from "https://deno.land/x/terminal_images@3.0.0/mod.ts";

const arrayBuffer = await fetch('https://httpbin.org/image/png')
.then(res => res.arrayBuffer());

const rawFile = new Uint8Array(arrayBuffer);

const options = {
    rawFile,
    rawPixels: {data:rawFile, width: 1000, height: 1000},
}

console.log(
    [...await getImageStrings(options)].join('\n')
    );
