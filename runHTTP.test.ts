import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { parseHttp } from "./runHTTP.ts";

// const http = String.raw
Deno.test("parseHttp", () => {
    const { request } = parseHttp(`
    GET http://faker.deno.dev
    `);
    assertEquals(request.method, "GET", 'invalid method');
    assertEquals(request.url, "http://faker.deno.dev/");
})


Deno.test("parseHttp with headers", () => {
    const { request } = parseHttp(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request.headers.get('Host'), "faker.deno.dev");
    assertEquals(request.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request.headers.get('x-foo'), null);
})


Deno.test("parseHttp with headers and comments", () => {
    const { request } = parseHttp(
        `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
# x-foo: bar
User-Agent: curl/7.64.1

x-foo: bar`);
    assertEquals(request.headers.get('Host'), "faker.deno.dev");
    assertEquals(request.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request.headers.get('x-foo'), null);
})


Deno.test("parseHttp without protocol", () => {
    const { request } = parseHttp(
        `GET faker.deno.dev`);
    assertEquals(request.url, "http://faker.deno.dev/");

})

Deno.test("parseHttp with body", async () => {
    const { request } = parseHttp(
        `POST faker.deno.dev
        Content-Type: text/plain

        hola mundo`);
    const body = await request.text()
    assertEquals(body, 'hola mundo');

})

Deno.test("parseHttp with body no headers", async () => {
    const { request } = parseHttp(
        `POST faker.deno.dev

        hola mundo`);
    const body = await request.text()
    assertEquals(request.headers.get('Content-Type'), 'text/plain;charset=UTF-8');

    assertEquals(body, 'hola mundo');

})

Deno.test("parseHttp with comments and body",
    // { only: true },
    async () => {
        const { request } = parseHttp(
            `POST faker.deno.dev
            #  x-foo: bar
            Content-Type: text/plain


hola mundo

hola

HTTP/1.1 200 OK
        `);

        const body = await request.text()
        assertEquals(request.headers.get('x-foo'), null);
        assertEquals(body, 'hola mundo\n\nhola');

    })


Deno.test("parseHttp with response",
    // { only: true },
    () => {
        const { response } = parseHttp(
            `POST faker.deno.dev/pong
        Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

    `);

        assertEquals(response?.headers.get('x-foo'), 'bar');
        assertEquals(response?.status, 200);

    })