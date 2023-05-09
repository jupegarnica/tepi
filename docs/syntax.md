
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

You can set global metadata in the first block of the file. This metadata will be available in all the blocks.

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