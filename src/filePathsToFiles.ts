import { File } from "./types.ts";
import { fileTextToBlocks } from "./fileTextToBlocks.ts";

export async function filePathsToFiles(filePaths: string[]): Promise<File[]> {
  const files: File[] = [];

  for (const filePath of filePaths) {
    let fileContent = "";
    try {
      fileContent = await Deno.readTextFile(filePath);
    } catch (error) {
      console.error("File not found:", filePath);
      console.error(error.message);
    }
    const blocks = fileTextToBlocks(fileContent, filePath);
    files.push({ path: filePath, blocks });
  }

  return files;
}
