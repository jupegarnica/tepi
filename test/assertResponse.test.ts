import { assertThrows } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { assertResponse } from "../src/assertResponse.ts";
import { extractBody } from "../src/fetchBlock.ts";


Deno.test("[assertResponse] with response throws error checking status", () => {
    const response = new Response(null, { status: 400 });
    const actualResponse = new Response(null, { status: 403 });
    assertThrows(() => {

        assertResponse({
            response,
            actualResponse,
        });
    });

});


Deno.test("[assertResponse] with response throws error checking statusText", () => {
    const response = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Forbidden' });
    assertThrows(() => {

        assertResponse({
            response,
            actualResponse,
        });
    });

});
Deno.test("[assertResponse] with no response not throws", () => {
    const response = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    assertResponse({
        response,
        actualResponse,
    });

});

Deno.test("[assertResponse] with response plain test body", () => {
    const response = new Response('foo', { status: 200 });
    const actualResponse = new Response('foo', { status: 200 });
    assertResponse({
        response,
        actualResponse,
    });

});

Deno.test("[assertResponse] with response json body", () => {
    const response = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{ "foo" : "bar" }', { status: 200, headers: { 'content-type': 'application/json' } });
    assertResponse({
        response,
        actualResponse,
    });

});

Deno.test("[assertResponse] with response json test body with regexp", () => {
    const response = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    assertResponse({
        response,
        actualResponse,
    });
});

Deno.test("[assertResponse] must throw with different bodies",
    // { only: true },
    async () => {
        const response = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(response);
        const actualResponse = new Response('{"foo": "baz"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(actualResponse);
        assertThrows(() => {
            assertResponse({
                response,
                actualResponse,
            });
        });


    });


Deno.test("[assertResponse] must not throw with same body",
    // { only: true },
    async () => {
        const response = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(response);
        const actualResponse = new Response('{  "foo" : "bar" } ', { headers: { 'content-type': 'application/json' } });
        await extractBody(actualResponse);
        assertResponse({
            response,
            actualResponse,
        });


    });