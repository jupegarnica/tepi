#!/usr/bin/env node
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("tsx/esm", pathToFileURL("./"));
const { cli } = await import("../src/cli.ts");
await cli();
