import { File } from "./types.ts";
import { expandGlob } from "https://deno.land/std@0.159.0/fs/mod.ts";
import { fileTextToBlocks } from "./fileTextToBlocks.ts";


export async function globsToFiles(inputText: string): Promise<File[]> {

  const globs = inputText.split(' ');
  const files: File[] = [];

  for(const glob of globs) {

    for await(const fileFound of expandGlob(glob)) {
      if(fileFound.isFile) {
        const fileContent = await Deno.readTextFile(fileFound.path);
        const blocks = fileTextToBlocks(fileContent);
        files.push({ path: fileFound.path, blocks });
      }
    }
  }
  // console.log(files);
  return files;


}
