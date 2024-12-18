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

![Example demo](./vhs/demo.gif)


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
deno install --global --reload  --allow-read --allow-env --allow-net --allow-run -f -n tepi https://tepi.deno.dev/src/cli.ts
```

Or run remotely with:

```bash
deno run --allow-read --allow-env --allow-net --allow-run https://tepi.deno.dev/src/cli.ts
```

### Permissions:

* `--allow-read`  Needed to read files from the file system.
* `--allow-net`   Needed to make HTTP requests.
* `--allow-env`   (optional) Needed to load and read environment variables. Required if you use the --env-file option.
* `--allow-run`   (optional) Required if you use the --upgrade option.

## Usage:

tepi [OPTIONS] [FILES|GLOBS...]

### Options:

* `-w` `--watch`           Watch files for changes and rerun tests.
* `  ` `--watch-no-clear`  same but without clearing the screen.
* `-t` `--timeout`         Set the timeout for each test in milliseconds. After the timeout, the test will fail.
* `-f` `--fail-fast`       Stop running tests after the first failure.
* `-d` `--display`         Set the display mode. (none, minimal, default, truncate, full and verbose)
       -  _none_:     display nothing
       -  _minimal_:  display only a minimal summary
       -  _default_:  list results and full error summary
       -  _truncate_: list results and full error summary but truncate data
       -  _full_:     display also all HTTP requests and responses and not truncate data
       -  _verbose_:  display also all metadata
* `-e` `--env-file`       load environment variables from a .env file
* `    --no-color`       output without color
* `    --no-animation`   output without terminal animations
* `    --upgrade`        upgrade to the latest version
* `    --version`        output the version number
* `-h` `--help`           output help minimal information
* `-r` `--readme`         output usage full information

### Examples:

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

* You can use the standard HTTP syntax in your .http files to run a request and response validation.
* Use the `###` to separate the requests.
* Use `#` to comment.
* Use front matter yaml to set metadata.

For example, validate the headers, status code, status text and body:

```http
GET https://faker.deno.dev/?body=hola&status=400

HTTP/1.1 400 Bad Request
content-type: text/plain; charset=utf-8

hola

```

## Interpolation:

It's deno 🔥

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
* request: The Request from the actual block.
* meta: The metadata from the actual block.
* response: The standard Response object from the fetch API from the actual request. (only available in the expected response, after the request)
* body: The extracted body an alias of `await response.getBody()` (only available in the expected response, after the request)
* [id]: the id of a block already run for example: `<%= login.body.jwt %>` or `<%= login.response.status %>`

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

The request, response and expectedResponse has a custom method `async getBody()` to extract the body as json, text or blob depending on the content-type.

The `body` is an alias for `await response.getBody()`.

For example:

```

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

```

## Front matter, Adding Metadata:

You can add metadata to your tests using front matter yaml.

For example:

```
---
id: hello
description: This is a test
needs: login
---

GET https://faker.deno.dev/?body=hola
```

This metadata is available in the interpolation scope as `meta` and in the `meta` property of the block.

### Global metadata:

You can set global metadata in the first block of the file. This metadata will be available in all the blocks. This apllies to all the properties except `meta.id` and `meta.description`, `meta.ignore` and `meta.only`.

For example:

```http
---
display: verbose
timeout: 1000
host: https://example.com
---
###

GET /  # this request will have the host https://example.com and will display the verbose output and will timeout in 1000ms.


###

POST /  # This too
```





### Special metadata keys:

There are some especial metadata keys used by tepi, as:  meta.needs, meta.id, meta.description, meta.display, meta.timeout and meta.import

#### meta.delay:
The meta.delay allows you to delay the execution of the request fetch for a specific time in milliseconds.

#### meta.timeout:
The meta.timeout allows you to override the global timeout for a specific test.
If the request takes longer than the timeout, the test will fail.
The delay is not included in the timeout.


#### meta.needs

The meta.needs is a special metadata value that allows you to run a test in advance and use the result in the current test if needed.

For example:

```
---
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

```

#### meta.id and meta.description

The meta.id allows you to identify a test for reference.
The meta.description it's used to display the test name in the console if not set, it will use the meta.id.

#### meta.import:

The meta.import allows you to import a file before running the test.
The imported file will run before the file that imports it.


#### meta.display:

The meta.display allows you to override the global display mode for a specific test.

For example:

```
---
display: verbose
---
GET https://example.com/get

```




## VScode extension

You can use the vscode extension to run the tests from the editor.

Just install the extension and open a .http file and click the hover button to run the test.

https://marketplace.visualstudio.com/items?itemName=jupegarnica.tepi