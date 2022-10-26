import { File } from "./types.ts";
import { Block } from "./types.ts";

export function fileTextToBlocks(txt: string, _filePath: string): Block[] {
  const blocks: Block[] = [];
  const lines = txt.replaceAll("\r", "\n").split("\n");
  let currentBlockText = "";
  let blockStartLine = 0;
  let blockEndLine = NaN;
  const blockSeparator = /^###/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentBlockText += line + "\n";
    if (blockSeparator.test(line)) {
      blockEndLine = i;
      const block = new Block({
        text: currentBlockText,
        meta: {
          _startLine: blockStartLine,
          _endLine: blockEndLine,
          _filePath,
        },
      });
      blocks.push(block);
      currentBlockText = "";
      blockStartLine = i + 1;
    }
    // final block
    if (i === lines.length - 1 && currentBlockText) {
      blockEndLine = i;
      const block = new Block({
        text: currentBlockText,
        meta: {
          _startLine: blockStartLine,
          _endLine: blockEndLine,
          _filePath,
        },
      });
      blocks.push(block);
    }
  }
  return blocks;
}

import { expandGlob } from "https://deno.land/std@0.160.0/fs/mod.ts";

export async function globsToFilePaths(globs: string[]): Promise<string[]> {
  const filePaths: string[] = [];

  for (const glob of globs) {
    for await (const fileFound of expandGlob(glob)) {
      if (fileFound.isFile) {
        filePaths.push(fileFound.path);
      }
    }
  }

  return filePaths;
}

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
