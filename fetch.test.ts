import { fetchRequest } from "./fetch.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts";
import { _Request, _Response } from "./types.ts";


Deno.env.get('NO_LOG') && stub(console, 'info')

const HOST = Deno.env.get('HOST') || 'https://httpbin.org'

// console.log('HOST', HOST);

Deno.test("[fetchRequest] no protocol",
    async () => {
        await fetchRequest(new Request(`${HOST}/get`));
    })

Deno.test("[fetchRequest] status/307",
    async () => {
        await fetchRequest(new Request(`${HOST}/status/307`));
    })


Deno.test("[fetchRequest] status/307 follow",
    async () => {
        await fetchRequest(new Request(`${HOST}/status/307`, { redirect: 'follow' }));
    })

Deno.test("[fetchRequest] status/400",
    async () => {
        await fetchRequest(new Request(`${HOST}/status/400`));
    })

Deno.test("[fetchRequest] status/500",
    async () => {
        await fetchRequest(new Request(`${HOST}/status/500`));
    })

Deno.test("[fetchRequest] hideHeaders",
    async () => {
        await fetchRequest(new Request(`${HOST}/get`), { hideHeaders: true });
    })

Deno.test("[fetchRequest] hideBody",
    async () => {
        await fetchRequest(new Request(`${HOST}/get`), { hideBody: true });
    })

Deno.test("[fetchRequest] hideResponse",
    async () => {
        await fetchRequest(new Request(`${HOST}/get`), { hideResponse: true });
    })

Deno.test("[fetchRequest] hideRequest",
    async () => {
        await fetchRequest(new Request(`${HOST}/get`), { hideRequest: true });
    });

Deno.test("[fetchRequest] body json",
    async () => {
        await fetchRequest(new Request(`${HOST}/post`));
    });


Deno.test("[fetchRequest] request body html",
    async () => {
        await fetchRequest(new Request(`${HOST}/post`, { method: 'POST', body: '<html><h1>hola</h1></html>' }));
    });

Deno.test("[fetchRequest] response body html",
    async () => {
        await fetchRequest(new Request(`${HOST}/html`));
    });


Deno.test("[fetchRequest] response body xml",
    async () => {
        await fetchRequest(new Request(`${HOST}/xml`));
    });


Deno.test("[fetchRequest] response body plain",
    async () => {
        await fetchRequest(new Request(`${HOST}/robots.txt`));
    });


Deno.test("[fetchRequest] body deny",
    async () => {
        await fetchRequest(new Request(`${HOST}/deny`));
    });

Deno.test("[fetchRequest] body gzip",
    async () => {
        await fetchRequest(new Request(`${HOST}/gzip`));
    });

Deno.test("[fetchRequest] body encoding/utf8",
    async () => {
        await fetchRequest(new Request(`${HOST}/encoding/utf8`));
    });


Deno.test("[fetchRequest] body brotli",

    async () => {
        await fetchRequest(new Request(`${HOST}/brotli`));
    });


Deno.test("[fetchRequest] body deflate",
    async () => {
        await fetchRequest(new Request(`${HOST}/deflate`));
    });

Deno.test("[fetchRequest] body bytes/8",
    async () => {
        await fetchRequest(new Request(`${HOST}/bytes/8`));
    });



Deno.test("[fetchRequest] body drip",
    async () => {
        await fetchRequest(new Request(`${HOST}/drip?numbytes=8&duration=1&delay=1&code=200`));
    });



const columns = 30;
const rows = 30;

Deno.test("[fetchRequest] body image/png",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await fetchRequest(new Request(`${HOST}/image/png`));
        consoleSize.restore()
    });


Deno.test("[fetchRequest] body image/jpeg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await fetchRequest(new Request(`${HOST}/image/jpeg`));
        consoleSize.restore()
    });


Deno.test("[fetchRequest] body image/svg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await fetchRequest(new Request(`${HOST}/image/svg`));
        consoleSize.restore()
    });




Deno.test("[fetchRequest] request body json",
    { ignore: true },
    async () => {
        await fetchRequest(new Request(`${HOST}/post`, { method: 'POST', body: JSON.stringify({ a: 1 }), headers: { 'Content-Type': 'application/json' } }));
    });


Deno.test("[fetchRequest] request body text",
    { ignore: true },
    async () => {
        await fetchRequest(new Request(`${HOST}/post`, { method: 'POST', body: 'hola', headers: { 'Content-Type': 'text/plain' } }));
    });


Deno.test("[fetchRequest] request body typescript",
    { ignore: true },
    async () => {
        await fetchRequest(new Request(`${HOST}/post`, { method: 'POST', body: 'const a: number | null = 1', headers: { 'Content-Type': 'application/typescript' } }));
    });



Deno.test("[fetchRequest] must work",
    async () => {
        const request = new Request(HOST + "/post", {
            method: "POST",

        })
        const response = await fetchRequest(request);
        assertEquals(response.status, 200);
    })




Deno.test("[fetchRequest] must work with meta",
    async () => {
        const request = new Request(HOST + "/anything", {
            method: "POST",
            body: JSON.stringify({ hello: "world" }),
            headers: {
                "content-type": "application/json",
            }
        })
        const meta = {
            hideRequest: true,
            hideResponse: true,
            // hideBody: true,
            hideHeaders: true,

        }
        const response = await fetchRequest(request, meta);
        const body = response.bodyExtracted as Record<string, unknown>;
        assertEquals(response.status, 200);
        assertEquals(body.json, { hello: "world" });

    })



Deno.test("[fetchRequest] must work with meta and expectedResponse",
    async () => {

        const bodyExtracted = { hello: "world" };
        const body = JSON.stringify(bodyExtracted);
        const request: _Request = new Request("https://faker.deno.dev/pong", {
            method: "POST",
            body: body,
            headers: {
                "content-type": "application/json",
            }
        })

        const expectedResponse: _Response = new Response(body, {
            status: 200,
            statusText: "OK",
            headers: {
                "content-type": "application/json",
            }

        })

        const meta = {
            hideRequest: true,
            hideResponse: true,
            hideBody: false,
            hideHeaders: true,

        }
        const response = await fetchRequest(request, meta, expectedResponse);
        assertEquals(response.status, 200);
    })


Deno.test("[fetchRequest] must throw and expectedResponse",
    async () => {

        const body = JSON.stringify({ hello: "world" });
        const request: _Request = new Request(HOST + "/anything", {
            method: "POST",
            body: body,
        })
        request.bodyRaw = body;
        const expectedResponse: _Response = new Response(body, {
            status: 200,
            statusText: "ok",
            headers: {
                "content-type": "application/json",
            }

        })
        expectedResponse.bodyExtracted = { data: body };

        const meta = {
            hideRequest: true,
            hideResponse: true,
            hideBody: true,
            hideHeaders: true,

        }
        await assertRejects(async () => await fetchRequest(request, meta, expectedResponse));
    })


// import { extension, typeByExtension } from "https://deno.land/std@0.158.0/media_types/mod.ts?source=cli";


// Deno.test("[fetchRequest] request body text",
//     { only: true },
//      () => {
//         assertEquals(typeByExtension(".js"), "application/javascript");
//         assertEquals(extension("application/typescript"), ".ts");

//     });