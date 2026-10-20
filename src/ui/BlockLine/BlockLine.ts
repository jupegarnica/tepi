import { Spinner } from "./spinner.ts";
import type { BlockState } from "../store/store.ts";
import { ms } from "../utils/formatters.ts";
import * as fmt from "@std/fmt/colors";

type Props = {
  block: BlockState;
  noAnimation: boolean;
};

export function BlockLine({ block, noAnimation }: Props): string {
  const elapsed = block.status === "running" || block.status === "ignored"
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
      return ` ${link} ${desc}   ${fmt.gray("running...")}`;
    }
    return `${fmt.blue(Spinner())} ${link} ${desc}   ${fmt.gray("running...")}`;
  }

  if (block.status === "passed") {
    const symbol = fmt.green("✓");
    const text = ` ${link} ${desc}${fmt.bold(httpStatus)}${elapsed}${differentFile}`;
    return `${symbol}${text}`;
  }

  if (block.status === "failed") {
    const symbol = fmt.red("✘");
    const statusText = block.httpStatus
      ? ` ${block.httpStatus}`
      : " ERR";
    const text = ` ${link} ${desc}${fmt.bold(statusText)}${elapsed}${differentFile}`;
    return `${symbol}${text}`;
  }

  if (block.status === "ignored") {
    const symbol = fmt.yellow("-");
    const text = ` ${link} ${desc}   ${elapsed}${differentFile}`;
    return `${symbol}${text}`;
  }

  if (block.status === "empty") {
    const symbol = fmt.dim("·");
    const text = ` ${link} ${fmt.dim(block.description)}   ${elapsed}${differentFile}`;
    return `${symbol}${text}`;
  }

  if (block.status === "pending") {
    if (block.isFirstBlock) {
      return "";
    }

    const symbol = fmt.dim("·");
    const text = ` ${link} ${fmt.dim(block.description)}   ${fmt.gray("pending...")}${differentFile}`;
    return `${symbol}${text}`;
  }

  return "";
}
