

```

-------------------------
--------- TEPI ----------
-------------------------
-- A .http Test Runner --
-------------------------

```
Test your HTTP APIs with standard http syntax

## Features:

- 📝  Write end to end API REST tests in `.http` files
- 🔎  Validate Response status, headers and/or body.
- 🔥  Interpolate javascript with eta template `<%= %>`
- 🖊   Write metadata as frontmatter yaml
- 📦  Reference by name another test to run them in advance
- ⏱   Set a timeout for each test or globally in milliseconds. After the timeout, the test will fail.
- 🚨  Stop running tests after the first failure.
- 🔋  Use env files to load environment variables
- 😎  Fully featured and colorful display modes. (none, minimal, default and full)
- 👁   Watch files for changes and rerun tests.
- 🍯  Standard Response and Request with a automatic getBody()


## Install:


```bash
deno install --unstable --allow-read --allow-env --reload -f -n tepi https://deno.land/x/tepi/src/cli.ts
```

Or run remotely width:

```bash
deno run --unstable --allow-read --allow-env https://deno.land/x/tepi/src/cli.ts
```

## Usage:

tepi [OPTIONS] [FILES|GLOBS...]

## Options:

* -w `--watch`         Watch files for changes and rerun tests.
* -t `--timeout`       Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* -f `--fail-fast`     Stop running tests after the first failure.
* -d `--display`       Set the display mode. (none, minimal, default and full)
         *  none: display nothing
         *  minimal: display only a minimal summary
         *  default: list results and full error summary
         *  full: display also all HTTP requests and responses
* -h `--help`          output usage information
* -e `--env-file`     load environment variables from a .env file
*    `--no-color`     output without color

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


## HTTP syntax:

You can use the standard HTTP syntax in your .http files to run a request and response validation.
Use the `###` to separate the requests.
Use frontmatter yaml to set metadata.



```

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


```

## Interpolation:

It deno 🔥

Uses eta as template engine, see docs:
https://deno.land/x/eta

Use `<%= %>` to interpolate values.

All the std assertion module is available:
https://deno.land/std/testing/asserts.ts


Use `<% %>` to run custom assertions or custom JS.
For example:

```
GET  http://localhost:3000/users

<% assert(response.status === 200) %>

```
Or:

```
    <% if (Math.random() > 0.5) { %>
      GET  http://localhost:3000/users/1
    <% } else { %>
      GET  http://localhost:3000/users/2
    <% } %>

```


### Interpolation scope:
In the Interpolation `<%= %>` or `<% %>` you have access to any Deno API and the following variables:
> request: The Request from the actual block.
> meta: The metadata from the actual block. and the frontmatter global metadata.
> response: The standard Response object from the fetch API from the actual request. (only available in the expected response, after the request)
> body: The extracted body an alias of `await response.getBody()` (only available in the expected response, after the request)

> [name]: the named block already run for example: `<%= loginTest.body.jwt %>` or `<%= loginTest.response.status %>`

The Block signature is:

```ts
type Block = {
  meta: {
    [key: string]: any,
  },
  request?: Request,
  response?: Response,
  expectedResponse?: Response,
  error?: Error,
  body?: any,
}
```
