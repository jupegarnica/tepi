# TEPI
### -- HTTP Test Runner --

https://tepi.deno.dev

**Tepi is a test runner for .http files.**

Write your tests in .http files and run them with `tepi`.

```bash

$ cat test.http

GET http://localhost:3000  # fetch a GET Request

HTTP/1.1 200 OK # assert a 200 OK response
Content-Type: text/plain # assert a text/plain content type header

Hola mundo! # assert a body with the text "Hola mundo!"
```

```bash
$ tepi test.http
```
Test your HTTP APIs with standard http syntax

## Demo:

![Example demo](./.github/demo/demo.gif)


## Features:

- 📝  Write end to end API REST tests in `.http` files
- 🔎  Validate Response status, headers and/or body.
- 🔥  Interpolate javascript with [eta](http://eta.js.org/) template `<%= %>` eta url:
- 🖊   Write metadata as frontmatter yaml
- 📦  Reference by id another test to run them in advance
- ⏱   Set a timeout for each test or globally in milliseconds. After the timeout, the test will fail.
- 🚨  Stop running tests after the first failure.
- 🔋  Use env files to load environment variables
- 😎  Fully featured and colorful display modes. (none, minimal, default and full)
- 👁   Watch files for changes and rerun tests.
- 🍯  Standard Response and Request with a automatic getBody()

## Install:


```bash
deno install --reload  --allow-read --allow-env --allow-net --allow-run -f -n tepi https://tepi.deno.dev/src/cli.ts
```

Or run remotely with:

```bash
deno run --allow-read --allow-env --allow-net --allow-run https://tepi.deno.dev/src/cli.ts
```

### Permissions:

* `--allow-read`  Needed to read files from the file system.
* `--allow-net`   Needed to make HTTP requests.
* `--allow-env`   (optional) Needed to load and read environment variables. Required if you use the --env-file option.
* `--allow-run`   (optional) Needed to run the upgrade command. Required if you use the --upgrade option.
