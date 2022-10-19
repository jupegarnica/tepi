import { assertThrows } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { assertResponse } from "../src/assertResponse.ts";
import { extractBody } from "../src/fetchBlock.ts";


Deno.test("[assertResponse] with expectedResponse throws error checking status", () => {
    const expectedResponse = new Response(null, { status: 400 });
    const actualResponse = new Response(null, { status: 403 });
    assertThrows(() => {

        assertResponse({
            expectedResponse,
            actualResponse,
        });
    });

});


Deno.test("[assertResponse] with expectedResponse throws error checking statusText", () => {
    const expectedResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Forbidden' });
    assertThrows(() => {
        assertResponse({
            expectedResponse,
            actualResponse,
        });
    });

});
Deno.test("[assertResponse] with no expectedResponse not throws", () => {
    const expectedResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse plain test body", () => {
    const expectedResponse = new Response('foo', { status: 200 });
    const actualResponse = new Response('foo', { status: 200 });
    assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse json body", () => {
    const expectedResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{ "foo" : "bar" }', { status: 200, headers: { 'content-type': 'application/json' } });
    assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse json test body with regexp", () => {
    const expectedResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    assertResponse({
        expectedResponse,
        actualResponse,
    });
});

Deno.test("[assertResponse] must throw with different bodies",
    // { only: true },
    async () => {
        const expectedResponse = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(expectedResponse);
        const actualResponse = new Response('{"foo": "baz"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(actualResponse);
        assertThrows(() => {
            assertResponse({
                expectedResponse,
                actualResponse,
            });
        });


    });


Deno.test("[assertResponse] must not throw with same body",
    // { only: true },
    async () => {
        const expectedResponse = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        await extractBody(expectedResponse);
        const actualResponse = new Response('{  "foo" : "bar" } ', { headers: { 'content-type': 'application/json' } });
        await extractBody(actualResponse);
        assertResponse({
            expectedResponse,
            actualResponse,
        });


    });