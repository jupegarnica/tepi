import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { blockTextToReqAndRes } from "../http.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

// const http = String.raw
Deno.test("[blockTextToReqAndRes]", () => {
    const { request } = blockTextToReqAndRes(`
    GET http://faker.deno.dev
    `);
    assertEquals(request?.method, "GET", 'invalid method');
    assertEquals(request?.url, "http://faker.deno.dev/");
})


Deno.test("[blockTextToReqAndRes] with headers", () => {
    const { request } = blockTextToReqAndRes(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[blockTextToReqAndRes] with headers and comments", () => {
    const { request } = blockTextToReqAndRes(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
# x-foo: bar
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[blockTextToReqAndRes] without protocol", () => {
    const { request } = blockTextToReqAndRes(
        `GET faker.deno.dev`);
    assertEquals(request?.url, "http://faker.deno.dev/");

})

Deno.test("[blockTextToReqAndRes] with body", async () => {
    const { request } = blockTextToReqAndRes(
        `POST faker.deno.dev
        Content-Type: text/plain

        hola mundo`);
    const body = await request?.text()
    assertEquals(body, 'hola mundo');

})

Deno.test("[blockTextToReqAndRes] with body no headers", async () => {
    const { request } = blockTextToReqAndRes(
        `POST faker.deno.dev

        hola mundo`);
    const body = await request?.text()
    assertEquals(request?.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
    assertEquals(body, 'hola mundo');

})

Deno.test("[blockTextToReqAndRes] with body raw", () => {
    const { request } = blockTextToReqAndRes(
        `POST faker.deno.dev

        hola mundo`);
    const body = request?.bodyRaw;
    assertEquals(body, 'hola mundo');

})


Deno.test("[blockTextToReqAndRes] with comments and body",
    // { only: true },
    async () => {
        const { request } = blockTextToReqAndRes(
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


Deno.test("[blockTextToReqAndRes] response with status",
    // { only: true },
    () => {
        const { response } = blockTextToReqAndRes(
            `POST faker.deno.dev/pong
        Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

    `);

        assertEquals(response?.status, 200);

    })


Deno.test("[blockTextToReqAndRes] response with headers",
    // { only: true },
    () => {
        const { response } = blockTextToReqAndRes(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`);

        assertEquals(response?.headers.get('x-foo'), 'bar');

    })



Deno.test("[blockTextToReqAndRes] response with statusText",
    // { only: true },
    () => {
        const { response } = blockTextToReqAndRes(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`);

        assertEquals(response?.statusText, 'OK');

    })

Deno.test("[blockTextToReqAndRes] response with body ",
    // { only: true },
    async () => {
        const { response } = blockTextToReqAndRes(
            `POST faker.deno.dev/pong
    Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar


    hola mundo

    `);
        assertEquals(await response?.text(), 'hola mundo');

    })

Deno.test("[blockTextToReqAndRes] response without body ",
    // { only: true },
    async () => {
        const { response } = blockTextToReqAndRes(
            `POST faker.deno.dev/pong
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar
`);
        assertEquals(await response?.text(), '');
    })



Deno.test("[blockTextToReqAndRes] response with body multiline ",
    // { only: true },
    async () => {
        const { response } = blockTextToReqAndRes(
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
