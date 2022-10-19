import { assertRejects } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { assertResponse } from "../src/assertResponse.ts";
import { extractBody } from "../src/fetchBlock.ts";


Deno.test("[assertResponse] with expectedResponse throws error checking status", async () => {
    const expectedResponse = new Response(null, { status: 400 });
    const actualResponse = new Response(null, { status: 403 });
    await assertRejects(async () => {
        await assertResponse({
            expectedResponse,
            actualResponse,
        });
    });

});


Deno.test("[assertResponse] with expectedResponse throws error checking statusText", async () => {
    const expectedResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Forbidden' });
    await assertRejects(async () => {
        await assertResponse({
            expectedResponse,
            actualResponse,
        });
    });

});
Deno.test("[assertResponse] with no expectedResponse not throws", async () => {
    const expectedResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    const actualResponse = new Response(null, { status: 400, statusText: 'Bad Request' });
    await assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse plain test body", async () => {
    const expectedResponse = new Response('foo', { status: 200 });
    const actualResponse = new Response('foo', { status: 200 });
    await assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse json body", async () => {
    const expectedResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{ "foo" : "bar" }', { status: 200, headers: { 'content-type': 'application/json' } });
    await assertResponse({
        expectedResponse,
        actualResponse,
    });

});

Deno.test("[assertResponse] with expectedResponse json test body with regexp", async () => {
    const expectedResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    const actualResponse = new Response('{"foo": "bar"}', { status: 200, headers: { 'content-type': 'application/json' } });
    await assertResponse({
        expectedResponse,
        actualResponse,
    });
});

Deno.test("[assertResponse] must throw with different bodies",
    // { only: true },
    async () => {
        const expectedResponse = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        const actualResponse = new Response('{"foo": "baz"}', { headers: { 'content-type': 'application/json' } });
        await assertRejects(async () => {
            await assertResponse({
                expectedResponse,
                actualResponse,
            });
        });


    });


Deno.test("[assertResponse] must not throw with same body",
    // { only: true },
    async () => {
        const expectedResponse = new Response('{"foo": "bar"}', { headers: { 'content-type': 'application/json' } });
        const actualResponse = new Response('{  "foo" : "bar" } ', { headers: { 'content-type': 'application/json' } });
        await assertResponse({
            expectedResponse,
            actualResponse,
        });


    });