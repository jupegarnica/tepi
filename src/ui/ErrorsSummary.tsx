import React from "react";
import { Text } from "ink";
import type { BlockState } from "./store.ts";
import { consoleSize, printTitle } from "./formatters.ts";
import * as fmt from "@std/fmt/colors";
import { formatFailureDetailsText } from "./failureDetails.ts";

type Props = {
  blocks: BlockState[];
  style: "compact" | "expanded";
};

export function ErrorsSummary({ blocks, style }: Props) {
  const failedBlocks = blocks.filter((b) => b.status === "failed" && b.error);
  if (!failedBlocks.length) return null;

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
          if (style === "compact") {
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
            const detail = formatFailureDetailsText(block, { indent: "\t   " });
            message = `${separator}${fmt.red("✘")} ${fmt.red(block.description + " => ")}\n${detail}`;
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
