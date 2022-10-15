import { expandGlob } from "https://deno.land/std@0.159.0/fs/mod.ts";



export async function globsToFilePaths(globs: string[]): Promise<string[]> {

  const filePaths: string[] = [];

  for(const glob of globs) {

    for await(const fileFound of expandGlob(glob)) {
      if(fileFound.isFile) {
        filePaths.push(fileFound.path);
      }
    }
  }

  return filePaths;
}
