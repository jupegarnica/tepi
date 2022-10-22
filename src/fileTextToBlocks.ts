import { Block } from "./types.ts";

export function fileTextToBlocks(txt: string, filePath: string): Block[] {
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
      const block = {
        text: currentBlockText,
        startLine: blockStartLine,
        endLine: blockEndLine,
        filePath,
        meta: {}
      };
      blocks.push(block);
      currentBlockText = "";
      blockStartLine = i + 1;
    }
    // final block
    if (i === lines.length - 1 && currentBlockText) {
      blockEndLine = i;
      const block = {
        text: currentBlockText,
        startLine: blockStartLine,
        endLine: blockEndLine,
        filePath,
        meta: {}
      };
      blocks.push(block);
    }
  }
  return blocks;
}
