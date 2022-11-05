import * as fmt from "https://deno.land/std@0.160.0/fmt/colors.ts";

export const installCommand =
  "deno install --reload  --unstable --allow-read --allow-env --allow-net --allow-run -f -n tepi https://tepi.deno.dev/src/cli.ts";

export const runRemoteCommand =
  "deno run --unstable --allow-read --allow-env --allow-net --allow-run https://tepi.deno.dev/src/cli.ts";

export function help(): void {
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
  ) => (i(
    codeBlockDelimiter + (isReadme ? lang : "") + "\n" + t +
      codeBlockDelimiter,
  ));
  // const httpHighlight = (t: string) => highlight(t, { language: "http" });
  const title = `
${g(`# ${fmt.bold("TEPI")}`)}
${g(`### -- A .http Test Runner --`)}
`;
  const helpText = `
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

${
    codeBlock(
      installCommand,
      "bash",
    )
  }

Or run remotely with:
${
    codeBlock(
      runRemoteCommand,
      "bash",
    )
  }

${g("## Usage:")}

${w(`tepi [OPTIONS] [FILES|GLOBS...]`)}

${g("## Options:")}

${d("* ")}-w ${c("--watch")}           ${
    d("Watch files for changes and rerun tests.")
  }
${d("* ")}   ${c("--watch-no-clear")}  ${
    d("same but without clearing the screen.")
  }
${d("* ")}-t ${c("--timeout")}         ${
    d("Set the timeout for each test in milliseconds. After the timeout, the test will fail.")
  }
${d("* ")}-f ${c("--fail-fast")}       ${
    d("Stop running tests after the first failure.")
  }
${d("* ")}-d ${c("--display")}         ${
    d("Set the display mode. (none, minimal, default and full)")
  }
${d("       - ")} none: ${d(`display nothing`)}
${d("       - ")} minimal: ${d(`display only a minimal summary`)}
${d("       - ")} default: ${d(`list results and full error summary`)}
${d("       - ")} full: ${d(`display also all HTTP requests and responses`)}
${d("       - ")} verbose: ${
    d(`display also all metadata and not truncate data`)
  }
${d("* ")}-h ${c("--help")}           ${d("output usage information")}
${d("* ")}-e ${c("--env-file")}       ${
    d("load environment variables from a .env file")
  }
${d("* ")}   ${c("--no-color")}       ${d("output without color")}
${d("* ")}   ${c("--upgrade")}        ${d("upgrade to the latest version")}

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
`;

  const referenceText = `
${g("## HTTP syntax:")}

* You can use the standard HTTP syntax in your .http files to run a request and response validation.
* Use the ${c("###")} to separate the requests.
* Use frontmatter yaml to set metadata.

For example, validate the headers, status code, status text and body:
${
    codeBlock(`
GET https://faker.deno.dev/?body=hola&status=400

HTTP/1.1 400 Bad Request
content-type: text/plain; charset=utf-8

hola
`)
  }

${g("## Interpolation:")}

It's deno 🔥

Uses eta as template engine, see docs:
${fmt.underline(`https://deno.land/x/eta`)}

Use ${c("<%= %>")} to interpolate values.

All the std assertion module is available:
${fmt.underline(`https://deno.land/std/testing/asserts.ts`)}


Use ${c("<% %>")} to run custom assertions or custom JS.
For example:
${
    codeBlock(`GET  http://localhost:3000/users

<% assert(response.status === 200) %>
`)
  }
Or:
${
    codeBlock(
      `    <% if (Math.random() > 0.5) { %>
      GET  http://localhost:3000/users/1
    <% } else { %>
      GET  http://localhost:3000/users/2
    <% } %>
`,
    )
  }

${g("### Interpolation scope:")}

In the Interpolation ${c("<%= %>")} or ${
    c("<% %>")
  } you have access to any Deno API and the following variables:
* request: ${w(`The Request`)} from the actual block.
* meta: ${
    w(`The metadata`)
  } from the actual block. and the frontmatter global metadata.
* response: ${
    w(`The standard Response object from the fetch API`)
  } from the actual request. (only available in the expected response, after the request)
* body: ${w(`The extracted body`)} an alias of ${
    c("await response.getBody()")
  } (only available in the expected response, after the request)
* [id]: ${w(`the id of a block already run`)} for example: ${
    c(`<%= login.body.jwt %>`)
  } or ${c(`<%= login.response.status %>`)}

The Block signature is:
${
    codeBlock(
      `type Block = {
  meta: {
    [key: string]: any,
  },
  request?: Request,
  response?: Response,
  expectedResponse?: Response,
  error?: Error,
  body?: any,
}`,
      "ts",
    )
  }


The request, response and expectedResponse has a custom method ${
    c("async getBody()")
  } to extract the body as json, text or blob depending on the content-type.

The ${c("body")} is an alias for ${c("await response.getBody()")}.

For example:
${
    codeBlock(
      `
---
id: hello
---
GET https://faker.deno.dev/?body=hola

HTTP/1.1 200

hola

###
POST https://faker.deno.dev/

<%= hello.body %>

HTTP/1.1 200 OK

hola
`,
      "",
    )
  }

${g("## Special metadata keys:")}

There are some especial metadata keys used by tepi, as:  meta.needs, meta.id, meta.description, meta.display, meta.timeout and meta.import

${g("### meta.delay:")}
The meta.delay allows you to delay the execution of the request fetch for a specific time in milliseconds.

${g("### meta.timeout:")}
The meta.timeout allows you to override the global timeout for a specific test.
If the request takes longer than the timeout, the test will fail.
The delay is not included in the timeout.


${g("### meta.needs")}

The meta.needs is a special metadata value that allows you to run a test in advance and use the result in the current test if needed.

For example:
${
    codeBlock(
      `---
needs: login
# will run the login test before this one
---
GET https://example.com/onlyAdmin
Authorization: Bearer <%= login.body.jwt %>
Content-Type: application/json

###
---
id: login
---
POST https://example.com/login
Content-Type: application/json

{"user": "Garn", "password": "1234"}

HTTP/1.1 200 OK
`,
      "",
    )
  }

${g("### meta.id and meta.description")}

The meta.id allows you to identify a test for reference.
The meta.description it's used to display the test name in the console if not set, it will use the meta.id.

${g("### meta.import:")}

The meta.import allows you to import a file before running the test.
The imported file will run before the file that imports it.


${g("### meta.display:")}

The meta.display allows you to override the global display mode for a specific test.

For example:
${
    codeBlock(
      `---
display: verbose
---
GET https://example.com/get
`,
    )
  }
`;

  console.info(title + helpText + referenceText);
  return;
}
