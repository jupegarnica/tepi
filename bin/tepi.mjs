#!/usr/bin/env node
// Load TypeScript sources at runtime. `tsx` is resolved relative to THIS file
// (not the caller's cwd) so the CLI works from `npx`, global installs and links.
import { register } from "tsx/esm/api";
register();
const { cli } = await import("../src/cli.ts");
await cli();
