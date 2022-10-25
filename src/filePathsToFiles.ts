import { File } from "./types.ts";
import { fileTextToBlocks } from "./fileTextToBlocks.ts";

export async function filePathsToFiles(filePaths: string[]): Promise<File[]> {
  const files: File[] = [];

  for (const _filePath of filePaths) {
    let fileContent = "";
    try {
      fileContent = await Deno.readTextFile(_filePath);
    } catch (error) {
      console.error("File not found:", _filePath);
      console.error(error.message);
    }
    const blocks = fileTextToBlocks(fileContent, _filePath);
    files.push({ path: _filePath, blocks });
  }

  return files;
}
