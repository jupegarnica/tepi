import React from "react";
import { Text } from "ink";
import * as fmt from "@std/fmt/colors";
import type { BlockState } from "../../../store/store.ts";
import { ms } from "../../../utils/formatters.ts";
import { selector } from "../utils/interactiveFormatters.ts";

type Props = {
  block: BlockState;
  isSelected: boolean;
  anchorPrefix?: string;
};

export function InteractiveBlockLine({
  block,
  isSelected,
  anchorPrefix = "",
}: Props) {
  const sel = selector(isSelected);
  const elapsed = block.status === "ignored" ? "" : ` ${fmt.gray(ms(block.elapsedTime))}`;
  const differentFile = block.neededFrom ? fmt.dim(` needed -> ${block.neededFrom}`) : "";
  const httpStatus = block.httpStatus ? ` ${block.httpStatus}` : "";
  const desc = fmt.white(block.description);
  const link = fmt.dim(block.blockLink);

  let inner = "";
  if (block.status === "passed") {
    inner = `${fmt.green("✓")} ${link} ${desc}${fmt.bold(httpStatus)}${elapsed}${differentFile}`;
  } else if (block.status === "failed") {
    const statusText = block.httpStatus ? ` ${block.httpStatus}` : " ERR";
    inner = `${fmt.red("✘")} ${link} ${desc}${fmt.bold(statusText)}${elapsed}${differentFile}`;
  } else if (block.status === "ignored") {
    inner = `${fmt.yellow("-")} ${link} ${desc}   ${elapsed}${differentFile}`;
  } else {
    inner = `${fmt.dim("·")} ${link} ${fmt.dim(block.description)}   ${elapsed}${differentFile}`;
  }

  return <Text>{`${anchorPrefix}    ${sel} ${inner}`}</Text>;
}