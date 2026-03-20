import { cli } from "./src/cli.ts";
import { fileURLToPath } from "node:url";

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  await cli();
}
