import type { Message } from "../store/store.ts";
import * as fmt from "@std/fmt/colors";

type Props = {
  messages: Message[];
};

function colorMessage(msg: Message): string {
  switch (msg.level) {
    case "error":
      return fmt.red(msg.text);
    case "warn":
      return fmt.yellow(msg.text);
    default:
      return fmt.gray(msg.text);
  }
}

export function MessagesPanel({ messages }: Props): string {
  if (!messages.length) return "";
  return messages.map((msg) => colorMessage(msg)).join("\n");
}
