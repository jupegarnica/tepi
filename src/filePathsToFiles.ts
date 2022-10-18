import { File } from "./types.ts";
import { fileTextToBlocks } from "./fileTextToBlocks.ts";


export async function filePathsToFiles(filePaths: string[]): Promise<File[]> {

  const files: File[] = [];

  for(const filePath of filePaths) {
    const fileContent = await Deno.readTextFile(filePath);
    const blocks = fileTextToBlocks(fileContent, filePath);
    files.push({ path: filePath, blocks });
  }

  return files;


}
