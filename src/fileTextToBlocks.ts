import { Block } from "./types.ts";
import { extractReqAndResAndMeta } from "./extractReqAndResAndMeta.ts";





export function fileTextToBlocks(txt: string): Block[] {

  const blocks: Block[] = [];
  const lines = txt.replaceAll('\r', '\n').split("\n");
  let currentBlockText = '';
  let blockStartLine = 0;
  let blockEndLine = NaN;
  const blockSeparator = /^###/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    currentBlockText += line + '\n';
    if (blockSeparator.test(line)) {
      blockEndLine = i;
      const block = {
        text: currentBlockText,
        startLine: blockStartLine,
        endLine: blockEndLine,
      };
      extractReqAndResAndMeta(block);
      blocks.push(block);
      currentBlockText = '';
      blockStartLine = i + 1;
    }
    // final block
    if (i === lines.length - 1 && currentBlockText) {
      blockEndLine = i;
      const block = {
        text: currentBlockText,
        startLine: blockStartLine,
        endLine: blockEndLine,
      };
      extractReqAndResAndMeta(block);
      blocks.push(block);
    }
  }
  return blocks;

}
