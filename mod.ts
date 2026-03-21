import { cli } from "./src/cli.ts";
import { fileURLToPath } from "node:url";

const isMain = import.meta.url.startsWith("file:")
  ? process.argv[1] === fileURLToPath(import.meta.url)
  : (import.meta as { main?: boolean }).main ?? false;
if (isMain) {
  await cli();
}
