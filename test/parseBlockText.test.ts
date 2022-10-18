import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { parseBlockText, parseRequestFromText } from "../src/parseBlockText.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')

// const http = String.raw
Deno.test("[parseBlockText request]", () => {
    const block = {
        text: `
GET http://faker.deno.dev
`}
    const { request } = parseBlockText(block);
    assertEquals(request?.method, "GET", 'invalid method');
    assertEquals(request?.url, "http://faker.deno.dev/");
})


Deno.test("[parseBlockText request] with headers", () => {
    const block = {
        text: `POST http://faker.deno.dev HTTP/1.1
        Host: faker.deno.dev
        User-Agent: curl/7.64.1

        x-foo: bar`}
    const { request } = parseBlockText(block);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[parseBlockText request] with headers and comments", () => {
    const block = {
        text:
            `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
# x-foo: bar
User-Agent: curl/7.64.1

x-foo: bar`
    }
    const { request } = parseBlockText(block);
    assertEquals(request?.headers.get('Host'), "faker.deno.dev");
    assertEquals(request?.headers.get('User-Agent'), "curl/7.64.1");
    assertEquals(request?.headers.get('x-foo'), null);
})


Deno.test("[parseBlockText request] without protocol", () => {
    const block = {
        text: `GET faker.deno.dev`
    }

    const { request } = parseBlockText(block
    );
    assertEquals(request?.url, "http://faker.deno.dev/");

})

Deno.test("[parseBlockText request] with body", async () => {
    const block = {
        text:
            `POST faker.deno.dev
        Content-Type: text/plain

        hola mundo`
    }
    const { request } = parseBlockText(block);
    const body = await request?.text()
    assertEquals(body, 'hola mundo');

})

Deno.test("[parseBlockText request] with body no headers", async () => {
    const block = {
        text:
            `POST faker.deno.dev

        hola mundo`
    }
    const { request } = parseBlockText(block);
    const body = await request?.text()
    assertEquals(request?.headers.get('Content-Type'), 'text/plain;charset=UTF-8');
    assertEquals(body, 'hola mundo');

})

Deno.test("[parseBlockText request] with body raw", () => {
    const block = {
        text:
            `POST faker.deno.dev

        hola mundo`
    }
    const { request } = parseBlockText(block);
    const body = request?.bodyRaw;
    assertEquals(body, 'hola mundo');

})


Deno.test("[parseBlockText request] with comments and body",
    // { only: true },
    async () => {
        const block = {
            text:
                `POST faker.deno.dev
#  x-foo: bar
Content-Type: text/plain
# ups

hola mundo
# adios

hola

HTTP/1.1 200 OK
        `
        }
        const { request } = parseBlockText(block);

        const body = await request?.text()
        assertEquals(request?.headers.get('x-foo'), null);
        assertEquals(body, 'hola mundo\n# adios\n\nhola');

    })




Deno.test("[parseBlockText request] with comments and body and final separator",
// { only: true },
async () => {
    const block = {
        text:
            `POST faker.deno.dev
#  x-foo: bar
Content-Type: text/plain
# ups

hola mundo
# adios

hola

###
    `
    }
    const { request } = parseBlockText(block);

    const body = await request?.text()
    assertEquals(request?.headers.get('x-foo'), null);
    assertEquals(body, 'hola mundo\n# adios\n\nhola');

})


Deno.test("[parseBlockText expectedResponse] with status",
    // { only: true },
    () => {
        const block = {
            text: `POST faker.deno.dev/pong
            Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar

    hola mundo

        `
        }
        const { expectedResponse } = parseBlockText(block);

        assertEquals(expectedResponse?.status, 200);

    })


Deno.test("[parseBlockText expectedResponse] with headers",
    // { only: true },
    () => {
        const block = {
            text:
                `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`}
        const { expectedResponse } = parseBlockText(block);

        assertEquals(expectedResponse?.headers.get('x-foo'), 'bar');

    })



Deno.test("[parseBlockText expectedResponse] with statusText",
    // { only: true },
    () => {
        const block = {
            text:
                `POST faker.deno.dev/pong
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`
        }
        const { expectedResponse } = parseBlockText(block);

        assertEquals(expectedResponse?.statusText, 'OK');

    })

Deno.test("[parseBlockText expectedResponse] with body ",
    // { only: true },
    async () => {
        const block = {
            text:
                `POST faker.deno.dev/pong
    Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar


    hola mundo

    `
        }
        const { expectedResponse } = parseBlockText(block);
        assertEquals(await expectedResponse?.text(), 'hola mundo');

    })

Deno.test("[parseBlockText expectedResponse] without body ",
    // { only: true },
    async () => {
        const block = {
            text:
                `POST faker.deno.dev/pong
            Content-Type: text/plain

            hola mundo

            HTTP/1.1 200 OK
            x-foo: bar
            `
        }
        const { expectedResponse } = parseBlockText(block);
        assertEquals(await expectedResponse?.text(), '');
    })



Deno.test("[parseBlockText expectedResponse] with body multiline ",
    // { only: true },
    async () => {
        const block = {
            text: `POST faker.deno.dev/pong
Content-Type: text/plain

hello world

HTTP/1.1 200 OK
x-foo: bar
Content-Type: text/plain


hola
# hello

mundo
###

    `
        }
        const { expectedResponse } = parseBlockText(block);
        assertEquals(await expectedResponse?.text(), 'hola\n# hello\n\nmundo');

    })



Deno.test("[parseBlockText meta] with metadata ",
    () => {
        const block = {
            text: `
# @name=test
# @description hello world
# @boolean
# @boolean2=false

GET faker.deno.dev
# hola

###
`
        }
        const { meta } = parseBlockText(block);

        assertEquals(meta, { name: 'test', description: 'hello world', boolean: true, boolean2: false });

    })
