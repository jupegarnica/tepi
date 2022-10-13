import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { parseHttpBlock } from "../http.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

// const http = String.raw
Deno.test("[parseHttpBlock]", () => {
    const { request } = parseHttpBlock(`
    GET http://faker.deno.dev
    `);
    assertEquals(request?.method, "GET", 'invalid method');
    assertEquals(request?.url, "http://faker.deno.dev/");
})


Deno.test("[parseHttpBlock] with headers", () => {
    const { request } = parseHttpBlock(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[parseHttpBlock] with headers and comments", () => {
    const { request } = parseHttpBlock(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
# x-foo: bar
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[parseHttpBlock] without protocol", () => {
    const { request } = parseHttpBlock(
        `GET faker.deno.dev`);
    assertEquals(request?.url, "http://faker.deno.dev/");

})

Deno.test("[parseHttpBlock] with body", async () => {
    const { request } = parseHttpBlock(
        `POST faker.deno.dev
        Content-Type: text/plain

        hola mundo`);
    const body = await request?.text()
    assertEquals(body, 'hola mundo');

})

Deno.test("[parseHttpBlock] with body no headers", async () => {
    const { request } = parseHttpBlock(
        `POST faker.deno.dev

        hola mundo`);
    const body = await request?.text()
    assertEquals(request?.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
    assertEquals(body, 'hola mundo');

})

Deno.test("[parseHttpBlock] with body raw", () => {
    const { request } = parseHttpBlock(
        `POST faker.deno.dev

        hola mundo`);
    const body = request?.bodyRaw;
    assertEquals(body, 'hola mundo');

})


Deno.test("[parseHttpBlock] with comments and body",
    // { only: true },
    async () => {
        const { request } = parseHttpBlock(
            `POST faker.deno.dev
            #  x-foo: bar
            Content-Type: text/plain


hola mundo

hola

HTTP/1.1 200 OK
        `);

        const body = await request?.text()
        assertEquals(request?.headers.get('x-foo'), null);
        assertEquals(body, 'hola mundo\n\nhola');

    })


Deno.test("[parseHttpBlock] response with status",
    // { only: true },
    () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
        Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

    `);

        assertEquals(response?.status, 200);

    })


Deno.test("[parseHttpBlock] response with headers",
    // { only: true },
    () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`);

        assertEquals(response?.headers.get('x-foo'), 'bar');

    })



Deno.test("[parseHttpBlock] response with statusText",
    // { only: true },
    () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`);

        assertEquals(response?.statusText, 'OK');

    })

Deno.test("[parseHttpBlock] response with body ",
    // { only: true },
    async () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar


    hola mundo

    `);
        assertEquals(await response?.text(), 'hola mundo');

    })

Deno.test("[parseHttpBlock] response without body ",
    // { only: true },
    async () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar
`);
        assertEquals(await response?.text(), '');
    })



Deno.test("[parseHttpBlock] response with body multiline ",
    // { only: true },
    async () => {
        const { response } = parseHttpBlock(
            `POST faker.deno.dev/pong
Content-Type: text/plain

hello world

HTTP/1.1 200 OK
x-foo: bar
Content-Type: text/plain


hola

mundo


    `);
        assertEquals(await response?.text(), 'hola\n\nmundo');

    })
