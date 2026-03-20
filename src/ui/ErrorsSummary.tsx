import React from "npm:react";
import { Text } from "npm:ink";
import type { BlockState } from "./store.ts";
import {
  DISPLAY_INDEX_MINIMAL,
  consoleSize,
  getDisplayIndex,
  printTitle,
} from "./formatters.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";

type Props = {
  blocks: BlockState[];
  globalDisplayMode: string;
};

export function ErrorsSummary({ blocks, globalDisplayMode }: Props) {
  const failedBlocks = blocks.filter((b) => b.status === "failed" && b.error);
  if (!failedBlocks.length) return null;

  const displayIndex = getDisplayIndex(globalDisplayMode);
  const maximumLength = consoleSize().columns / 2;

  return (
    <Text>
      {"\n"}
      {printTitle("⬇   Failures Summary   ⬇", "brightRed")}
      {"\n"}
      {failedBlocks.map((block, i) => {
        if (!block.error) return null;
        const path = block.blockLink;
        const messagePath = `${fmt.dim("at:")} ${fmt.cyan(path)}`;
        let message = "";

        if (!block.errorDisplayed) {
          const separator = i > 0 ? fmt.dim("------------------") + "\n" : "";
          if (displayIndex === DISPLAY_INDEX_MINIMAL) {
            const descriptionMaybeTruncated =
              block.description.length > maximumLength - 20
                ? `${block.description.slice(0, maximumLength - 20)}...`
                : block.description;
            const messageText = fmt.stripAnsiCode(
              `${descriptionMaybeTruncated} => ${block.error.name}: ${block.error.message}`
            );
            const trimmedMessage = messageText.trim().replaceAll(/\s+/g, " ");
            const messageLength = trimmedMessage.length;
            const needsToTruncate = messageLength > maximumLength;
            const truncatedMessage = needsToTruncate
              ? `${trimmedMessage.slice(0, maximumLength - 4)} ...`
              : trimmedMessage;
            const messagePadded = truncatedMessage.padEnd(maximumLength);
            const finalMsg = messagePadded.replace(/.+=>/, fmt.red("$&"));
            message = `${separator}${fmt.red("✘")}  ${finalMsg} ${messagePath}`;
          } else {
            message = `${separator}${fmt.red("✘")} ${fmt.red(block.description + " => ")} ${fmt.bold(
              block.error.name
            )}\n${fmt.white(block.error.message)} \n${messagePath}`;
          }
        } else {
          message = `${fmt.red(block.description + " => ")} ${fmt
            .bold(block.error.name)
            .padEnd(maximumLength)} ${messagePath}`;
        }

        return <Text key={block.id}>{message + "\n"}</Text>;
      })}
    </Text>
  );
}
