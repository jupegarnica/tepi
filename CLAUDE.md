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

1. **`src/cli.ts`** — parses CLI args (`@std/cli`), loads env files, resolves glob patterns to file paths, opens the termdom UI, calls `runner()`, handles `--watch` via chokidar.
2. **`src/runner.ts`** — iterates files and blocks; calls `parseMetaFromText` for all blocks first, then `runBlock` for each. Handles `meta.needs` (run another block first), `meta.only`/`meta.ignore`, `meta.import` (prepend another file). Updates the Zustand store after each block.
3. **`src/parser.ts`** — parses raw `.http` text into `_Request` / `_Response` objects. Uses Eta as a template engine (`<%= %>` / `<% %>`) so blocks can reference previous results and run arbitrary JS assertions. Front matter YAML (`---`) is extracted via `@std/front-matter/yaml`.
4. **`src/fetchBlock.ts`** — executes the HTTP request and attaches `block.actualResponse`.
5. **`src/assertResponse.ts`** — compares `block.actualResponse` vs `block.expectedResponse` (status, headers, body).
6. **`src/types.ts`** — core types: `Block`, `File`, `GlobalData`, `_Request`/`_Response` (extend native `Request`/`Response` with `bodyRaw` and `getBody()`).

### UI layer (`src/ui/`)

The terminal UI is built with [termdom](https://github.com/bikeshaving/termdom) (`@b9g/termdom`, a DOM API for the terminal) and [Zustand](https://github.com/pmndrs/zustand) for state.

- **`store.ts`** — Zustand vanilla store; runner pushes block status updates here; the UI renders from it.
- **`term.ts`** — openTerm layer: TTY sessions get an attached `TermDOM` (mutates `document.body`, termdom repaints); piped sessions write `renderANSI()` **overwriting the previous frame** with cursor controls (`\x1b[NA\x1b[0J`), so redirected stdout shows only the latest frame (ink/log-update parity). A `rawWrite` (dots stream) invalidates the overwrite so streamed output is never clobbered. Every display produces plain `"\n"`-joined lines carrying `@std/fmt` ANSI codes; `src/ui/utils/ansi.ts` converts them to inline-style spans for the termdom document (`ansiToHtml`).
- **`App.ts`** — `buildApp(store)`: switches on `displayMode` to render one of the display builders as a string.
- Display components live in `src/ui/displays/Display*/` — each is a plain function returning text; the pure formatters (`formatVitestOutput`, `formatDotsProgress`, `formatTapOutput`, …) are exported from their `index.ts`.
- **`displays/`** — one builder per display mode: `none`, `minimal`, `default`, `truncate`, `full`, `verbose`, `tap`, `dots`, `interactive`.
- **`shared/Scroll/`** — pure scrolling/anchoring logic (`useScroll` is now a pure function over the rendered string); used by the interactive display.
- **`formatters.ts`** — `DISPLAYS` array (index = verbosity level), `getDisplayIndex()`, text formatting helpers.
- **`serialize.ts`** — converts `_Request`/`_Response` (which hold `ReadableStream` bodies) into plain serializable objects for the store.
- **Tests against hosts:** the original public fixture host `faker.deno.dev` is dead (Deno Deploy sunset). `test/global-setup.ts` starts a local mirror (`test/faker.mock.mjs`) in `vitest` `globalSetup` and points `HOST`/`HOST_HTTPBIN` at it; fixture defaults fall back to `https://faker.garn.dev`.

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

All `@std/*` packages are JSR packages installed via npm as `@jsr/std__*` (e.g. `@std/assert` → `npm:@jsr/std__assert`). Do not use `@std/fs/expand-glob` (uses Deno internals) — use `tinyglobby` instead. Use `node:path` instead of `@std/path/posix` for path resolution.

Resolving `@jsr/*` needs the scoped registry (repo `.npmrc`: `@jsr:registry=https://npm.jsr.io`). So consumers never need it, the published package **bundles** the JSR-backed deps (`package.json` `bundleDependencies`), which keeps `npx @garndev/tepi` working on a clean machine.

### Packaging / publishing

- The package ships TypeScript sources (`files`: `bin`, `src`, `docs`, `README.md`) — no build step is published.
- `bin/tepi.mjs` (`#!/usr/bin/env node`) imports `tsx/esm/api`, calls `register()` and then dynamically imports `../src/cli.ts`. `tsx` is a **runtime dependency** (not dev) and is resolved relative to the bin, so `npx`/global installs work.
- `help`/`readme` read `../docs/usage.md` and `../README.md`, so `docs/` and `README.md` must stay in `files`.

### Releasing

Release by tag; CI does the publish.

```
make release        # vhs + readme + `npm version patch` + make tag + docker image
# or, when the version is already bumped:
make tag            # git tag v<package.json version> && git push origin v<version>
```

Pushing a `v*` tag runs `.github/workflows/test.yml`: it runs `npm ci` + `npm test`, asserts the tag equals `package.json`'s version, and `npm publish --access public` **unless that version is already on npm** (idempotent — re-pushing a tag won't fail). Manual publish is still possible with `make publish-npm`.

Dev notes:

- The lockfile is generated with **npm ≥ 11**. Re-resolving dev deps (e.g. bumping `vitest`) with npm 10.9.0 trips an arborist bug (`Cannot read properties of null (reading 'edgesOut')`) on `vitest@4.1.x`; `npm ci` and `npm install` with the committed lock work fine on npm 10.
- Globbing uses **`tinyglobby`**, not `fast-glob`: `fast-glob` → `micromatch` → `braces` pulls in CVE-2026-93687 (GHSA-vfj7-8cjw-p6xm, high, no upstream patch), which left `npm audit` with 3 high advisories. `tinyglobby` implements braces/extglob itself, so `braces` is gone from the tree and `npm audit` is clean.
- `tinyglobby` does not expand a magic segment right after a `..` segment (e.g. `..` + `/` + `*` + `/http/test*.http` → 0 results). `src/files.ts` works around it with `splitLeadingParentSegments()`, which lifts the leading `..` segments into the glob `cwd`. Keep that in mind before changing the glob options: `expandDirectories: false` is there for `fast-glob` parity (a bare directory pattern must not expand to its contents).
