import { runFetch, fetchRequest } from "./fetch.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts";
import { _Request, _Response } from "./types.ts";


Deno.env.get('NO_LOG') && stub(console, 'info')

const HOST = Deno.env.get('HOST') || 'https://httpbin.org'

// console.log('HOST', HOST);

Deno.test("[runFetch] no protocol",
    async () => {
        await runFetch({
            _: ["httpbin.org/get"],
            redirect: "manual",
        });
    })

Deno.test("[runFetch] status/307",
    async () => {
        await runFetch({
            _: [HOST + "/status/307"],
            redirect: "manual",
        });
    })


Deno.test("[runFetch] status/307 follow",
    async () => {
        await runFetch({
            _: [HOST + "/status/307"],
            redirect: "follow",
        });
    })

Deno.test("[runFetch] status/400", async () => {
    await runFetch({
        _: [HOST + "/status/400"],
        redirect: "manual",
    });
})

Deno.test("[runFetch] status/500", async () => {
    await runFetch({
        _: [HOST + "/status/500"],
        redirect: "manual",
    });
})

Deno.test("[runFetch] hideHeaders", async () => {
    await runFetch({
        _: [HOST + "/status/500"],
        hideHeaders: true,
    });
})

Deno.test("[runFetch] hideBody", async () => {
    await runFetch({
        _: [HOST + "/json"],
        hideBody: true,
    });
})

Deno.test("[runFetch] hideResponse", async () => {
    await runFetch({
        _: [HOST + "/json"],
        hideResponse: true,
    });
})

Deno.test("[runFetch] hideRequest", async () => {
    await runFetch({
        _: [HOST + "/json"],
        hideRequest: true,
    });
});

Deno.test("[runFetch] body json", async () => {
    await runFetch({
        _: [HOST + "/json"],
    });
});


Deno.test("[runFetch] body html", async () => {
    await runFetch({
        _: [HOST + "/html"],
    });
});

Deno.test("[runFetch] body xml", async () => {
    await runFetch({
        _: [HOST + "/xml"],
    });
});


Deno.test("[runFetch] body plain", async () => {
    await runFetch({
        _: [HOST + "/robots.txt"],
    });
});


Deno.test("[runFetch] body deny", async () => {
    await runFetch({
        _: [HOST + "/deny"],
        redirect: "error",
    });
});
Deno.test("[runFetch] body gzip",
    async () => {
        await runFetch({
            _: [HOST + "/gzip"],
            redirect: "error",
        });
    });

Deno.test("[runFetch] body encoding/utf8",
    async () => {
        await runFetch({
            _: [HOST + "/encoding/utf8"],
            redirect: "error",
        });
    });


Deno.test("[runFetch] body brotli",

    async () => {
        await runFetch({
            _: [HOST + "/brotli"],
            redirect: "error",
        });
    });


Deno.test("[runFetch] body deflate",
    { ignore: true }, // TODO: fix this test
    async () => {
        await runFetch({
            _: [HOST + "/deflate"],
            redirect: "error",
            headers: ["Accept-Encoding: gzip, br"],
        });
    });





Deno.test("[runFetch] body bytes/8",
    async () => {
        await runFetch({
            _: [HOST + "/bytes/8"],
            redirect: "error",
        });
    });



Deno.test("[runFetch] body drip",
    async () => {
        await runFetch({
            _: [HOST + "/drip"],
            redirect: "error",
        });
    });


Deno.test("[runFetch] body drip",
    async () => {
        await runFetch({
            _: [HOST + "/drip"],
            redirect: "error",
        });
    });


const columns = 30;
const rows = 30;

Deno.test("[runFetch] body image/png",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: [HOST + "/image/png"],
            redirect: "error",
        });
        consoleSize.restore()
    });


Deno.test("[runFetch] body image/jpeg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: [HOST + "/image/jpeg"],
            redirect: "error",
        });
        consoleSize.restore()
    });


Deno.test("[runFetch] body image/svg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: [HOST + "/image/svg"],
            redirect: "error",
        });
        consoleSize.restore()
    });




Deno.test("[runFetch] request body json",
    async () => {
        await runFetch({
            _: [HOST + "/post"],
            method: "POST",
            headers: ["Content-Type: application/json"],
            body: JSON.stringify({ hello: "world" }),
        });
    });


Deno.test("[runFetch] request body text",
    async () => {
        await runFetch({
            _: [HOST + "/post"],
            method: "POST",
            headers: ["Content-Type: text/plain"],
            body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec auctor, nisl eget aliquam ultricies, nunc nisl aliquam nisl, eget aliquam nisl nisl eget nisl. Donec auctor, nisl eget aliquam ultricies, nunc nisl aliquam nisl, eget aliquam nisl nisl eget nisl',
        });
    });


Deno.test("[runFetch] request body text",
    async () => {
        await runFetch({
            _: [HOST + "/post"],
            method: "POST",
            headers: ["Content-Type: application/typescript"],
            body: `
import { hello } from "./hello.js";

const req: Resquest = {
    body: "hello world",
    headers: {
        "content-type": "text/plain",
    },
}

if (true) {
    console.info("hello world")
}
            `,
        });
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


// Deno.test("[runFetch] request body text",
//     { only: true },
//      () => {
//         assertEquals(typeByExtension(".js"), "application/javascript");
//         assertEquals(extension("application/typescript"), ".ts");

//     });