import { assertEquals, assertRejects } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runHttp } from "./http.ts";

import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
Deno.env.get('NO_LOG') && stub(console, 'info')



Deno.test("[runHttp] with response throws error checking status",
    // { only: true },
    async () => {
        await assertRejects(async () => {
            await runHttp(
                `
GET http://httpbin.org/status/400

HTTP/1.1 403 Forbidden
`);
        });

    })



Deno.test("[runHttp] with response throws error checking statusText",
    // { only: true },
    async () => {
        await assertRejects(async () => {
            await runHttp(
                `
GET http://httpbin.org/status/400

HTTP/1.1 400 Forbidden
`);
        });

    })


Deno.test("[runHttp] with response not throws",
    // { only: true },
    async () => {
        await runHttp(
            `
GET http://httpbin.org/status/400

HTTP/1.1 400 Bad Request
`);

    })


Deno.test("[runHttp] with response plain test body",
    // { only: true },
    async () => {
        const response = await runHttp(
            `
POST https://faker.deno.dev/pong?quite=true
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
Content-Type: text/plain

hola mundo

`);
        assertEquals(response?.status, 200);

    })



Deno.test("[runHttp] with response json body",
    // { only: true },
    // { ignore: true },
    async () => {
        const response = await runHttp(
            `
POST https://faker.deno.dev/pong?quite=true
Content-Type: application/json

{"foo":"bar"}

HTTP/1.1 200 OK
Content-Type: application/json

{"foo":"bar"}

`);
        // assertEquals(response?.bodyRaw, '{"foo":"bar"}');
        assertEquals(response?.bodyExtracted, { foo: "bar" });
        assertEquals(response?.status, 200);

    })





Deno.test("[runHttp] with response json body throws",
    // { only: true },
    async () => {
        await assertRejects(async () => {
            await runHttp(
                `
    POST https://faker.deno.dev/pong?quite=true
    Content-Type: application/json

    {"foo":"bar"}

    HTTP/1.1 200 OK
    Content-Type: application/json

    {"hey":"bar"}

    `);
        });

    })


Deno.test("[runHttp] with response json body contains",
    // { only: true },
    // { ignore: true },
    async () => {
        const response = await runHttp(
            `
POST https://faker.deno.dev/pong?quite=true
Content-Type: application/json

{ "foo":"bar" ,  "bar": "foo" }

HTTP/1.1 200 OK
Content-Type: application/json

{"foo":"bar"}

`);
        assertEquals(response?.status, 200);

    })


Deno.test("[runHttp] with response json body contains throws",
    // { only: true },
    async () => {
        await assertRejects(async () => {
            await runHttp(
                `
POST https://faker.deno.dev/pong?quite=true
Content-Type: application/json

{ "foo":"bar" ,  "bar": "foo" }

HTTP/1.1 200 OK
Content-Type: application/json

{"foo":"bar", "b": "f"}

    `);
        });

    })
