![Example demo](./.github/demo/demo.gif)


Test your HTTP APIs with standard http syntax

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

## Usage:

tepi [OPTIONS] [FILES|GLOBS...]

## Options:

* -w `--watch`           Watch files for changes and rerun tests.
*    `--watch-no-clear`  same but without clearing the screen.
* -t `--timeout`         Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* -f `--fail-fast`       Stop running tests after the first failure.
* -d `--display`         Set the display mode. (none, minimal, default, truncate, full and verbose)
       -  none:     display nothing
       -  minimal:  display only a minimal summary
       -  default:  list results and full error summary
       -  truncate: list results and full error summary but truncate data
       -  full:     display also all HTTP requests and responses and not truncate data
       -  verbose:  display also all metadata
* -e `--env-file`       load environment variables from a .env file
*    `--no-color`       output without color
*    `--no-animation`   output without terminal animations
*    `--upgrade`        upgrade to the latest version
*    `--version`        output the version number
* -h `--help`           output help index information
* -r `--readme`         output usage information

## Examples:

`tepi`
> Run all .http in the current directory and folders. (same as tepi ./**/*.http)

`tepi test.http ./test2.http`
> Run test.http and test2.http

`tepi **/*.http`
> Run all .http in the current directory and folders.

`tepi rest.http --watch`
> Run rest.http and rerun when it changes

`tepi rest.http  --watch "src/**/*.ts"`
> Run rest.http and rerun when any .ts file in the src folder changes.

`tepi rest.http  --watch "src/**/*.json" --watch "src/**/*.ts"`
> You can use multiple --watch flags.
> Note: You can use globs here too, but use quotes to avoid the shell expanding them.

`tepi --timeout 10000`
> Set the timeout for each test in milliseconds. After the timeout, the test will fail.

`tepi --fail-fast`
> Stop running tests after the first failure.

`tepi --display minimal`
> Set the display mode. (none, minimal, default and full)

`tepi --env-file .env --env-file .env.test`
> Load environment variables from a .env and .env.test

