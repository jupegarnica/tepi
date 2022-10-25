import { type Args, parse } from "https://deno.land/std@0.159.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";
import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { config } from "https://deno.land/std@0.160.0/dotenv/mod.ts";
import { runner } from "./runner.ts";

if (import.meta.main) {
  await cli();
}

async function cli() {
  const options = {
    default: {
      display: "default",
      help: false,
    },
    collect: ["watch", "envFile"],
    boolean: ["help", "failFast", "noColor"],
    string: ["display", "envFile"],

    alias: {
      h: "help",
      w: "watch",
      t: "timeout",
      f: "failFast",
      d: "display",
      e: "envFile",
      envFile: "env-file",
      noColor: "no-color",
      failFast: "fail-fast",
    },
  }
  const args: Args = parse(Deno.args, options);

  // --no-color
  /////////////
  if (args.noColor) {
    fmt.setColorEnabled(false);
  }

  // --help
  /////////////
  if (args.help) {
    help();
    return
  }
  // --display
  /////////////
  const displays = [
    "none",
    "minimal",
    "default",
    "full",
  ];
  if (args.display === "") {
    args.display = "full";
  }

  const defaultMeta: Meta = {
    timeout: 0,
    display: args.display as string,
    get displayIndex(): number {
      return displays.indexOf(this.display as string);
    },
  };
  if (defaultMeta.displayIndex === -1) {
    console.error(
      fmt.brightRed(`Invalid display mode ${args.display}\n Must be one of: ${displays.map(t => fmt.bold(t)).join(", ")
        }`),
    );
    Deno.exit(1);
  }
  // --env-file
  /////////////
  const keysLoaded = []
  for (const path of args.envFile) {
    const vars = await config({ export: true, path, safe: true, allowEmptyValues: true });
    for (const key in vars) {
      keysLoaded.push({ key, value: vars[key], path })
    }
  }
  if (keysLoaded.length && defaultMeta.displayIndex as number > 0) {
    console.log(fmt.gray(`Loaded ${keysLoaded.length} environment variables from: \n${keysLoaded.map(({ path }) => path).join(', ')}`));
  }

  // runner
  /////////////
  const globs: string = args._.length ? args._.join(" ") : "**/*.http";
  const filePathsToRun = await globsToFilePaths(globs.split(" "));

  const { exitCode } = await runner(filePathsToRun, defaultMeta, args.failFast);


  // --watch
  /////////////
  if (args.watch) {
    const filePathsToJustWatch = await globsToFilePaths(
      args.watch.filter((i: boolean | string) => typeof i === "string"),
    );
    watchAndRun(filePathsToRun, filePathsToJustWatch, defaultMeta).catch(
      console.error,
    );
  } else {
    Deno.exit(exitCode);
  }
}

function logWatchingPaths(filePaths: string[], filePathsToJustWatch: string[]) {
  console.info(fmt.dim("\nWatching and Running tests from:"));
  filePaths.map((filePath) => relative(Deno.cwd(), filePath)).forEach((
    filePath,
  ) => console.info(fmt.cyan(`  ${filePath}`)));
  if (filePathsToJustWatch.length) {
    console.info(fmt.dim("\nRerun when changes from:"));
    filePathsToJustWatch.map((filePath) => relative(Deno.cwd(), filePath))
      .forEach((filePath) => console.info(fmt.cyan(`  ${filePath}`)));
  }
}

async function watchAndRun(
  filePaths: string[],
  filePathsToJustWatch: string[],
  defaultMeta: Meta,
) {
  const allFilePaths = filePaths.concat(filePathsToJustWatch);
  const watcher = Deno.watchFs(allFilePaths);
  logWatchingPaths(filePaths, filePathsToJustWatch);

  for await (const event of watcher) {
    if (event.kind === "access") {
      if (event.paths.some((path) => filePathsToJustWatch.includes(path))) {
        // run all
        console.clear();
        await runner(filePaths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      } else {
        // run just this file
        console.clear();
        await runner(event.paths, defaultMeta);
        logWatchingPaths(filePaths, filePathsToJustWatch);
      }
    }
  }
}


function help() {
  // const { ascii } = await generateFromString("HTTest");
  const isReadme = !!Deno.env.get("NO_COLOR");

  // const b = fmt.cyan;
  const w = fmt.brightWhite;
  // const d = (t:string) => isReadme ? '> '+ t : fmt.dim('> '+ t);
  const d = fmt.dim;
  const g = fmt.brightGreen;
  const orange = (t: string) => fmt.rgb24(t, 0xFF6600);
  const codeDelimiter = isReadme ? "`" : "";
  const c = (t: string) => orange(codeDelimiter + t + codeDelimiter);
  const codeBlockDelimiter = isReadme ? "```" : "";
  const codeBlock = (
    t: string,
    lang = "",
  ) => (codeBlockDelimiter + (isReadme ? lang : '') + t + codeBlockDelimiter);
  // const httpHighlight = (t: string) => highlight(t, { language: "http" });

  const title = `
${g(`-------------------------`)}
${g(`--------- ${fmt.bold("TEPI")} ----------`)}
${g(`-------------------------`)}
${g(`-- A .http Test Runner --`)}
${g(`-------------------------`)}

`;
  const helpText = `
${(codeBlock(title, ""))}

${fmt.bold("Test your HTTP APIs with ease")}


${g("## Features:")}
  - ${g("📝")} Write end to end API REST tests in ${c(".http")} files
  - ${g("🏃")} Run GET, POST, PUT, PATCH, DELETE requests
  - ${g("🔎")} Validate response status, headers and body.
  - ${g("🔥")} Interpolate js or ts in requests and responses with eta template ${c("<%= %>")}
  - ${g("📦")} Reference by name another tests to run them in advance
  - ${g("⏱")}  Set a timeout for each test in milliseconds. After the timeout, the test will fail.
  - ${g("🚨")} Stop running tests after the first failure.
  - ${g("🍯")} Use ${("env files")} to load environment variables
  - ${g("👓")} Set the display mode. (none, minimal, default and full)
  - ${g("♻")} Watch files for changes and rerun tests.

  `;`

${g("## Install:")}

${w("deno install --allow-read --allow-env -f -n tepi https://deno.land/x/tepi/cli.ts")}


${g("## Usage:")}

${w(`tepi [OPTIONS] [FILES|GLOBS...]`)}

${g("## Options:")}

${d("* ")}-w ${c("--watch")}         ${d("Watch files for changes and rerun tests.")
    }
${d("* ")}-t ${c("--timeout")}       ${d("Set the timeout for each test in milliseconds. After the timeout, the test will fail.")
    }
${d("* ")}-f ${c("--fail-fast")}     ${d("Stop running tests after the first failure.")
    }
${d("* ")}-d ${c("--display")}       ${d("Set the display mode. (none, minimal, default and full)")
    }
${d("         * ")} none: ${d(`display nothing`)}
${d("         * ")} minimal: ${d(`display only a minimal summary`)}
${d("         * ")} default: ${d(`list results and full error summary`)}
${d("         * ")} full: ${d(`display also all HTTP requests and responses`)}
${d("* ")}-h ${c("--help")}          ${d("output usage information")}
${d("* ")}-e ${c("--env-file")}     ${d("load environment variables from a .env file")}
${d("* ")}   ${c("--no-color")}     ${d("output without color")}

${g("## Examples:")}

${c(`tepi`)}
${d(`> Run all .http in the current directory and folders. (same as tepi ./**/*.http)`)}

${c(`tepi test.http ./test2.http`)}
${d(`> Run test.http and test2.http`)}


${c(`tepi **/*.http`)}
${d(`> Run all .http in the current directory and folders.`)}


${c(`tepi rest.http --watch`)}
${d(`> Run rest.http and rerun when it changes`)}



${c(`tepi rest.http  --watch "src/**/*.ts"`)}
${d(`> Run rest.http and rerun when any .ts file in the src folder changes.`)}


${c(`tepi rest.http  --watch "src/**/*.json" --watch "src/**/*.ts"`)}
${d(`> You can use multiple --watch flags.`)}
${d(`> Note: You can use globs here too, but use quotes to avoid the shell expanding them.`)}

${c(`tepi --timeout 10000`)}
${d(`> Set the timeout for each test in milliseconds. After the timeout, the test will fail.`)}

${c(`tepi --fail-fast`)}
${d(`> Stop running tests after the first failure.`)}

${c(`tepi --display minimal`)}
${d(`> Set the display mode. (none, minimal, default and full)`)}

${c(`tepi --env-file .env --env-file .env.test`)}
${d(`> Load environment variables from a .env and .env.test`)}


${g("## HTTP syntax:")}

${(`You can use the standard HTTP syntax in your .http files as follow:`)}

${codeBlock(`
POST https://httpbin.org/status/401
Authorization: Bearer 123
Content-Type: application/json

{"name": "Garn"}

# write the expected response to validate the actual response
HTTP/1.1 401 Unauthorized


###  requests separator

# use yaml front matter before the request to include metadata
---
name: optional name
---
GET /?body=hola&status=400
host: https://faker.deno.dev

`)}






`;

  console.info(helpText);
  return;
}