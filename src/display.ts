import { Meta } from "./types.ts";

export const DISPLAYS = [
    "none",     // 0
    "minimal",  // 1
    "default",  // 2
    "truncate", // 3
    "full",     // 4
    "verbose",  // 5
];


export function getDisplayIndex(meta: Meta): number {
    const display = meta.display as string;
    const index = DISPLAYS.indexOf(display);
    if (index === -1) {
        return Infinity;
    }
    return index;
}

// function getDisplayIndexNamed(name: string): number {
//     const index = DISPLAYS.indexOf(name);
//     if (index === -1) {
//         return Infinity;
//     }
//     return index;
// }
