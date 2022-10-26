import { type Args, parse } from "https://deno.land/std@0.159.0/flags/mod.ts";
import type { Meta } from "./types.ts";
import * as fmt from "https://deno.land/std@0.158.0/fmt/colors.ts";
// import ora from "npm:ora";
import { relative } from "https://deno.land/std@0.159.0/path/posix.ts";
import { globsToFilePaths } from "./globsToFilePaths.ts";
import { config } from "https://deno.land/std@0.160.0/dotenv/mod.ts";
import { runner } from "./runner.ts";
import { DISPLAYS, getDisplayIndex } from "./print.ts";

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
  };
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
    return;
  }
  // --display
  /////////////

  if (args.display === "") {
    args.display = "full";
  }

  const defaultMeta: Meta = {
    timeout: 0,
    display: args.display as string,

  };
  if (getDisplayIndex(defaultMeta) === -1) {
    console.error(
      fmt.brightRed(
        `Invalid display mode ${args.display}\n Must be one of: ${DISPLAYS.map((t) => fmt.bold(t)).join(", ")
        }`,
      ),
    );
    Deno.exit(1);
  }
  // --env-file
  /////////////
  const keysLoaded = [];
  for (const path of args.envFile) {
    const vars = await config({
      export: true,
      path,
      safe: true,
      allowEmptyValues: true,
    });
    for (const key in vars) {
      keysLoaded.push({ key, value: vars[key], path });
    }
  }
  if (keysLoaded.length && getDisplayIndex(defaultMeta) > 0) {
    console.log(
      fmt.gray(
        `Loaded ${keysLoaded.length} environment variables from: \n${keysLoaded.map(({ path }) => path).join(", ")
        }`,
      ),
    );
  }

  // resolves globs to file paths
  /////////////
  const globs: string = args._.length ? args._.join(" ") : "**/*.http";
  const filePathsToRun = await globsToFilePaths(globs.split(" "));

  // runner
  /////////////
  let { exitCode, onlyMode } = await runner(
    filePathsToRun,
    defaultMeta,
    args.failFast,
  );

  // warn only mode
  /////////////
  if (onlyMode.length) {
    if (getDisplayIndex(defaultMeta) > 0) {
      console.warn(
        fmt.yellow(`\n${fmt.bgYellow(fmt.bold(' ONLY MODE '))} ${onlyMode.length} tests are in "only" mode.`),
      );
      if (!exitCode) {
        console.error(fmt.red(`Failed because the ${fmt.bold('"only"')} option was used at ${onlyMode.join(", ")}`))
      }
    }
    exitCode ||= 1;
  }

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
  console.info(fmt.dim("\nWatching and running tests from:"));
  filePaths.map((_filePath) => relative(Deno.cwd(), _filePath)).forEach((
    _filePath,
  ) => console.info(fmt.cyan(`  ${_filePath}`)));
  if (filePathsToJustWatch.length) {
    console.info(fmt.dim("\nRerun when changes from:"));
    filePathsToJustWatch.map((_filePath) => relative(Deno.cwd(), _filePath))
      .forEach((_filePath) => console.info(fmt.cyan(`  ${_filePath}`)));
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
  const codeBlockDelimiter = isReadme ? "\n```" : "";
  const i = fmt.italic;
  const codeBlock = (
    t: string,
    lang = "",
  ) => (i(codeBlockDelimiter + (isReadme ? lang : "") + "\n" + t +
    codeBlockDelimiter))
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
${fmt.bold("Test your HTTP APIs with standard http syntax")}

${g("## Features:")}

- 📝  Write end to end API REST tests in ${c(".http")} files
- 🔎  Validate Response status, headers and/or body.
- 🔥  Interpolate javascript with eta template ${c("<%= %>")}
- 🖊   Write metadata as frontmatter yaml
- 📦  Reference by name another test to run them in advance
- ⏱   Set a timeout for each test or globally in milliseconds. After the timeout, the test will fail.
- 🚨  Stop running tests after the first failure.
- 🔋  Use ${("env files")} to load environment variables
- 😎  Fully featured and colorful display modes. (none, minimal, default and full)
- 👁   Watch files for changes and rerun tests.
- 🍯  Standard Response and Request with a automatic getBody()


${g("## Install:")}

${codeBlock(
    "deno install --unstable --allow-read --allow-env -f -n tepi https://deno.land/x/tepi/cli.ts",
    "bash",
  )
    }

Or run remotely width:
${codeBlock(
      "deno run --unstable --allow-read --allow-env https://deno.land/x/tepi/cli.ts",
      "bash",
    )
    }

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
${d("* ")}-e ${c("--env-file")}     ${d("load environment variables from a .env file")
    }
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

You can use the standard HTTP syntax in your .http files to run a request and response validation.
Use the ${c("###")} to separate the requests.
Use frontmatter yaml to set metadata.


${codeBlock(`
# use yaml front matter before the request
---
ref: loginTest
---
POST https://example.com/onlyAdmin
Authorization: Bearer <%= loginTest.body.jwt %>
Content-Type: application/json

{"name": "Garn"}

# write the expected response to validate the actual response
HTTP/1.1 403 Forbidden

###  requests separator
---
name: optional name
timeout: 500 # must respond in less than 500ms
---
GET /?body=hola&status=400
host: https://faker.deno.dev

`)
    }

${g("## Interpolation:")}

It deno 🔥

Uses eta as template engine, see docs:
${fmt.underline(`https://deno.land/x/eta`)}

Use ${c("<%= %>")} to interpolate values.

All the std assertion module is available:
${fmt.underline(`https://deno.land/std/testing/asserts.ts`)}


Use ${c("<% %>")} to run custom assertions or custom JS.
For example:
${codeBlock(`GET  http://localhost:3000/users

<% assert(response.status === 200) %>
`)}
Or:
${codeBlock(
`    <% if (Math.random() > 0.5) { %>
      GET  http://localhost:3000/users/1
    <% } else { %>
      GET  http://localhost:3000/users/2
    <% } %>
`)}


${g("### Interpolation scope:")}
In the Interpolation ${c("<%= %>")} or ${c("<% %>")} you have access to any Deno API and the following variables:
> request: ${w(`The Request`)} from the actual block.
> meta: ${w(`The metadata`)} from the actual block. and the frontmatter global metadata.
> response: ${w(`The standard Response object from the fetch API`)} from the actual request. (only available in the expected response, after the request)
> body: ${w(`The extracted body`)} from the actual request. (only available in the expected response, after the request)

> [name]: ${w(`the named block already run`)} for example: ${c(`<%= loginTest.body.jwt %>`)} or <%= loginTest.response.status %>

The Block signature is:
${codeBlock(`type Block = {
  meta: {
    [key: string]: any,
  },
  request?: Request,
  response?: Response,
  error?: Error,
  body?: any,
}`, 'ts')}

`;

  console.info(helpText);
  return;
}
