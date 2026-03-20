import React from "react";
import { Text } from "ink";
import Spinner from "ink-spinner";
import type { BlockState } from "./store.ts";
import { ms } from "./formatters.ts";
import * as fmt from "jsr:@std/fmt@0.225.1/colors";

type Props = {
  block: BlockState;
  noAnimation: boolean;
};

export function BlockLine({ block, noAnimation }: Props) {
  const elapsed = block.status === "running"
    ? ""
    : ` ${fmt.gray(ms(block.elapsedTime))}`;
  const differentFile = block.neededFrom
    ? fmt.dim(` needed -> ${block.neededFrom}`)
    : "";
  const httpStatus = block.httpStatus ? ` ${block.httpStatus}` : "";
  const desc = fmt.white(block.description);
  const link = fmt.dim(block.blockLink);

  if (block.status === "running") {
    if (noAnimation) {
      return <Text>{` ${link} ${desc}   ${fmt.gray("running...")}`}</Text>;
    }
    return (
      <Text>
        <Text color="blue"><Spinner type="dots4" /></Text>
        {` ${link} ${desc}   ${fmt.gray("running...")}`}
      </Text>
    );
  }

  if (block.status === "passed") {
    const symbol = fmt.green("✓");
    const text = ` ${link} ${desc}${fmt.bold(httpStatus)}${elapsed}${differentFile}`;
    return <Text>{`${symbol}${text}`}</Text>;
  }

  if (block.status === "failed") {
    const symbol = fmt.red("✘");
    const statusText = block.httpStatus
      ? ` ${block.httpStatus}`
      : " ERR";
    const text = ` ${link} ${desc}${fmt.bold(statusText)}${elapsed}${differentFile}`;
    return <Text>{`${symbol}${text}`}</Text>;
  }

  if (block.status === "ignored") {
    const symbol = fmt.yellow("-");
    const text = ` ${link} ${desc}   ${elapsed}${differentFile}`;
    return <Text>{`${symbol}${text}`}</Text>;
  }

  if (block.status === "empty") {
    const symbol = fmt.dim("·");
    const text = ` ${link} ${fmt.dim(block.description)}   ${elapsed}${differentFile}`;
    return <Text>{`${symbol}${text}`}</Text>;
  }

  return null;
}
