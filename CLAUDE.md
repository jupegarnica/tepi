# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                          # run all tests (NO_LOG=1 vitest run)
npm run test:watch                # watch mode with color
npx vitest run test/runner.test.ts  # run a single test file
npx tsx src/cli.ts --help         # run CLI from source
npx tsx src/cli.ts http/pass.http  # run a specific .http file
npm run build                     # tsc type-check / compile
```

Set `TEPI_NOT_EXIT=1` to prevent `process.exit()` during development/testing.

## Architecture

tepi is a CLI HTTP testing tool. It reads `.http` files, makes real HTTP requests, and validates responses against expected values defined in those files.

### Core data flow

```
cli.ts  →  runner.ts  →  parser.ts  →  fetchBlock.ts  →  assertResponse.ts
```

1. **`src/cli.ts`** — parses CLI args (`@std/cli`), loads env files, resolves glob patterns to file paths, instantiates the Ink/React UI, calls `runner()`, handles `--watch` via chokidar.
2. **`src/runner.ts`** — iterates files and blocks; calls `parseMetaFromText` for all blocks first, then `runBlock` for each. Handles `meta.needs` (run another block first), `meta.only`/`meta.ignore`, `meta.import` (prepend another file). Updates the Zustand store after each block.
3. **`src/parser.ts`** — parses raw `.http` text into `_Request` / `_Response` objects. Uses Eta as a template engine (`<%= %>` / `<% %>`) so blocks can reference previous results and run arbitrary JS assertions. Front matter YAML (`---`) is extracted via `@std/front-matter/yaml`.
4. **`src/fetchBlock.ts`** — executes the HTTP request and attaches `block.actualResponse`.
5. **`src/assertResponse.ts`** — compares `block.actualResponse` vs `block.expectedResponse` (status, headers, body).
6. **`src/types.ts`** — core types: `Block`, `File`, `GlobalData`, `_Request`/`_Response` (extend native `Request`/`Response` with `bodyRaw` and `getBody()`).

### UI layer (`src/ui/`)

The terminal UI is built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal) and [Zustand](https://github.com/pmndrs/zustand) for state.

- **`store.ts`** — Zustand vanilla store; runner pushes block status updates here; React components subscribe.
- **`App.tsx`** — top-level component; switches on `displayMode` to render one of seven display components.
- **`displays/`** — one component per display mode: `none`, `minimal`, `default`, `truncate`, `full`, `verbose`, `tap`.
- **`formatters.ts`** — `DISPLAYS` array (index = verbosity level), `getDisplayIndex()`, text formatting helpers.
- **`serialize.ts`** — converts `_Request`/`_Response` (which hold `ReadableStream` bodies) into plain serializable objects for the store.

### .http file format

Files are split on `###` separators into `Block`s. Each block may contain:
- Optional YAML front matter (`--- ... ---`) for metadata (`id`, `description`, `display`, `timeout`, `needs`, `only`, `ignore`, `import`, `delay`, `host`)
- An HTTP request line (`GET https://...`) and optional headers/body
- An expected response section starting with `HTTP/1.1 <status>`

Eta template syntax (`<%= %>`, `<% %>`) is available everywhere; the interpolation scope includes `request`, `response`, `body`, `meta`, all `@std/assert` functions, and any block referenced by its `meta.id`.

### README generation

`README.md` is generated — do not edit it directly. It is assembled from three source files:

```
docs/started.md + docs/usage.md + docs/syntax.md → README.md
```

Run `make readme` to regenerate. This also copies the result to `vscode-extension/README.md` and commits both. To update docs, edit the source files in `docs/` instead.

### JSR packages

All `@std/*` packages are JSR packages installed via npm as `@jsr/std__*` (e.g. `@std/assert` → `npm:@jsr/std__assert`). Do not use `@std/fs/expand-glob` (uses Deno internals) — use `fast-glob` instead. Use `node:path` instead of `@std/path/posix` for path resolution.
