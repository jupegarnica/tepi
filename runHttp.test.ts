import { assertEquals } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import {  runHttp } from "./http.ts";


Deno.test("[runHttp] with response",
    // { only: true },
    async () => {
        const response = await runHttp(
            `
POST http://httpbin.org/anything
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
Content-Type: application/json

hola mundo

`);
        assertEquals(response?.status, 200);

    })


Deno.test("[runHttp] with response throws error checking status",
    // { only: true },
    async () => {
        const response = await runHttp(
            `
GET http://httpbin.org/status/400

HTTP/1.1 403 hello
`);
        assertEquals(response?.status, 200);

    })