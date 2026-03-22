import React from "react";
import { Box, Text } from "ink";
import type { BlockState, FileState } from "../../../../store/store.ts";
import { BlockLine } from "../../../../BlockLine/index.ts";
import { InteractiveFileLine } from "../InteractiveFileLine.tsx";

type Props = {
  fileOrder: string[];
  files: Record<string, FileState>;
  blocks: Record<string, BlockState>;
  noAnimation: boolean;
};

export function RunningView({ fileOrder, files, blocks, noAnimation }: Props) {
  return (
    <>
      {fileOrder.map((id) => {
        const file = files[id];
        if (!file) return null;

        if (file.status === "done") {
          return (
            <InteractiveFileLine
              key={id}
              file={file}
              blocks={blocks}
              isSelected={false}
              isExpanded={false}
              noAnimation={noAnimation}
            />
          );
        }

        if (noAnimation) return null;

        const fileBlocks = file.blockIds
          .map((bid) => blocks[bid])
          .filter((b): b is BlockState => !!b && !b.isFirstBlock);

        if (file.status === "running") {
          return (
            <Box key={id} flexDirection="column">
              <InteractiveFileLine
                file={file}
                blocks={blocks}
                isSelected={false}
                isExpanded={false}
                noAnimation={noAnimation}
              />
              <Box flexDirection="column" marginLeft={6}>
                {fileBlocks.map((b) => (
                  <BlockLine key={b.id} block={b} noAnimation={false} />
                ))}
              </Box>
            </Box>
          );
        }

        return (
          <Box key={id} flexDirection="column">
            <Text dimColor>{`  · ${file.relativePath}`}</Text>
            <Box flexDirection="column" marginLeft={6}>
              {fileBlocks.map((b) => (
                <BlockLine key={b.id} block={b} noAnimation={false} />
              ))}
            </Box>
          </Box>
        );
      })}
    </>
  );
}
