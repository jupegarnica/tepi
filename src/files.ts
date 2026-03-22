import { File } from "./types.ts";
import { Block } from "./types.ts";
import { isRequestStartLine } from "./parser.ts";

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
  let currentLines: string[] = [];
  let blockStartLine = 0;
  // Tracks whether the current block already contains an HTTP request line.
  // Implicit splitting only triggers on the *second* request in a block.
  let seenRequestInBlock = false;
  // True until the first ### is encountered. Used to detect the global-meta
  // pattern: the very first block in a file is pure frontmatter followed by
  // request lines (no explicit ### separator).
  let isFirstBlockOfFile = true;
  const blockSeparator = /^###/;

  let lineNumberNotIgnored: number | undefined = undefined;
  if (lineSpec) {
    lineNumberNotIgnored = Number(lineSpec);
  }

  function pushBlock(endLine: number, blockLines: string[], startLine: number) {
    const text = blockLines.join("\n") + "\n";
    if (text.trim()) {
      blocks.push(
        new Block({
          text,
          meta: {
            _startLine: startLine,
            _endLine: endLine,
            _filePath,
            only: shouldBeOnly(lineNumberNotIgnored, startLine, endLine),
          },
        }),
      );
    }
  }

  // Returns the last non-blank line in accLines, or "" if all blank.
  function lastNonBlankLine(accLines: string[]): string {
    for (let i = accLines.length - 1; i >= 0; i--) {
      if (accLines[i].trim() !== "") return accLines[i];
    }
    return "";
  }

  // Returns the index in accLines where a trailing frontmatter block (---...---) starts,
  // or -1 if none is found. Skips trailing blank lines before looking.
  function findTrailingFrontmatterStart(accLines: string[]): number {
    let j = accLines.length - 1;
    while (j >= 0 && accLines[j].trim() === "") j--;
    if (j >= 0 && accLines[j].trim() === "---") {
      const closeIdx = j;
      let k = closeIdx - 1;
      while (k >= 0 && accLines[k].trim() !== "---") k--;
      if (k >= 0) {
        return k;
      }
    }
    return -1;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Explicit ### separator: include it in the current block, then flush.
    if (blockSeparator.test(line)) {
      currentLines.push(line);
      pushBlock(i, currentLines, blockStartLine);
      currentLines = [];
      blockStartLine = i + 1;
      seenRequestInBlock = false;
      isFirstBlockOfFile = false;
      continue;
    }

    // Implicit split: HTTP method lines can start a new block.
    if (isRequestStartLine(line)) {
      // Lines inside Eta template conditionals are not real requests — the
      // preceding non-blank line will be an Eta tag starting with "<%".
      // Only applicable when there are accumulated lines to look back into.
      if (currentLines.length > 0 && lastNonBlankLine(currentLines).trimStart().startsWith("<%")) {
        currentLines.push(line);
        continue;
      }

      if (!seenRequestInBlock) {
        // Special case: first block of file is pure frontmatter — flush as global meta.
        if (isFirstBlockOfFile && currentLines.length > 0) {
          const fmStart = findTrailingFrontmatterStart(currentLines);
          if (fmStart === 0) {
            const prevEndLine = blockStartLine + currentLines.length - 1;
            pushBlock(prevEndLine, currentLines, blockStartLine);
            blockStartLine = prevEndLine + 1;
            currentLines = [line];
            seenRequestInBlock = true;
            continue;
          }
        }
        // First request in this block — record it but don't split yet.
        seenRequestInBlock = true;
        currentLines.push(line);
        continue;
      }

      // Second+ request in this block — split here, with frontmatter look-back.
      const fmStart = findTrailingFrontmatterStart(currentLines);

      if (fmStart > 0) {
        // Frontmatter found — split before it so it belongs to the new block.
        const prevLines = currentLines.slice(0, fmStart);
        const fmLines = currentLines.slice(fmStart);
        const prevEndLine = blockStartLine + fmStart - 1;
        pushBlock(prevEndLine, prevLines, blockStartLine);
        blockStartLine = prevEndLine + 1;
        currentLines = [...fmLines, line];
        seenRequestInBlock = true;
      } else {
        // No attachable frontmatter — split at the trailing-blank boundary.
        let blankStart = currentLines.length;
        while (blankStart > 0 && currentLines[blankStart - 1].trim() === "") {
          blankStart--;
        }
        if (blankStart === 0) {
          // Only blank lines accumulated — absorb them into the new block.
          currentLines.push(line);
          seenRequestInBlock = true;
        } else {
          // Keep real content in previous block; trailing blanks go with the new block.
          const prevLines = currentLines.slice(0, blankStart);
          const blankLines = currentLines.slice(blankStart);
          const prevEndLine = blockStartLine + blankStart - 1;
          pushBlock(prevEndLine, prevLines, blockStartLine);
          blockStartLine = prevEndLine + 1;
          currentLines = [...blankLines, line];
          seenRequestInBlock = true;
        }
      }
      continue;
    }

    currentLines.push(line);
  }

  // Final block.
  if (currentLines.length > 0) {
    const endLine = blockStartLine + currentLines.length - 1;
    pushBlock(endLine, currentLines, blockStartLine);
  }

  return blocks;
}

import fg from "fast-glob";
import { readFile } from "node:fs/promises";

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
    const found = await fg(glob, { absolute: true, onlyFiles: true });
    for (const path of found) {
      filePaths.push(path + lineSpec);
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
      fileContent = await readFile(_filePath, "utf-8");
    } catch {
      // console.error(error.message);
      throw new Error("File not found: " + _filePath);
    }
    const blocks = fileTextToBlocks(fileContent, _filePath, lineSpec);
    files.push({ path: _filePath, blocks });
  }

  return files;
}
