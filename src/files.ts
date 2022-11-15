import { File } from "./types.ts";
import { Block } from "./types.ts";

function shouldBeOnly(
  lineNumberOnly: number | undefined,
  blockStartLine: number,
  blockEndLine: number,
) {
  const shouldBeOnly = lineNumberOnly !== undefined &&
    lineNumberOnly >= blockStartLine && lineNumberOnly <= blockEndLine;
  return shouldBeOnly;
}

export function fileTextToBlocks(
  txt: string,
  _filePath: string,
  lineSpec = "",
): Block[] {
  const blocks: Block[] = [];
  const lines = txt.replaceAll("\r", "\n").split("\n");
  let currentBlockText = "";
  let blockStartLine = 0;
  let blockEndLine = NaN;
  const blockSeparator = /^###/;

  let lineNumberNotIgnored: number | undefined = undefined;

  if (lineSpec) {
    lineNumberNotIgnored = Number(lineSpec);
  }

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
          only: shouldBeOnly(
            lineNumberNotIgnored,
            blockStartLine,
            blockEndLine,
          ),
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
          only: shouldBeOnly(
            lineNumberNotIgnored,
            blockStartLine,
            blockEndLine,
          ),
        },
      });
      blocks.push(block);
    }
  }
  return blocks;
}

import { expandGlob } from "https://deno.land/std@0.164.0/fs/mod.ts";

export const checkGlobHasLineSpec = (glob: string) =>
  new RegExp(":[0-9]+").test(glob);

export async function globsToFilePaths(globs: string[]): Promise<string[]> {
  const filePaths: string[] = [];

  for (let glob of globs) {
    let lineSpec = "";
    if (checkGlobHasLineSpec(glob)) {
      [glob, lineSpec] = glob.split(":");
      lineSpec = ":" + lineSpec;
    }
    for await (const fileFound of expandGlob(glob)) {
      if (fileFound.isFile) {
        filePaths.push(fileFound.path + lineSpec);
      }
    }
  }

  return filePaths;
}

export async function filePathsToFiles(filePaths: string[]): Promise<File[]> {
  const files: File[] = [];

  for (let _filePath of filePaths) {
    let fileContent = "";
    let lineSpec = "";
    if (checkGlobHasLineSpec(_filePath)) {
      [_filePath, lineSpec] = _filePath.split(":");
    }
    try {
      fileContent = await Deno.readTextFile(_filePath);
    } catch {
      // console.error(error.message);
      throw new Error("File not found: " + _filePath);
    }
    const blocks = fileTextToBlocks(fileContent, _filePath, lineSpec);
    files.push({ path: _filePath, blocks });
  }

  return files;
}
