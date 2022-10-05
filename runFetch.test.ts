import { runFetch } from "./main.ts";
import { stub } from "https://deno.land/std/testing/mock.ts";


Deno.env.set('FORCE_COLOR', 'true');

Deno.test("runFetch status/307", async () => {
    await runFetch({
        _: ["https://httpbin.org/status/307"],
        redirect: "manual",
    });
})


Deno.test("runFetch status/400", async () => {
    await runFetch({
        _: ["https://httpbin.org/status/400"],
        redirect: "manual",
    });
})

Deno.test("runFetch status/500", async () => {
    await runFetch({
        _: ["https://httpbin.org/status/500"],
        redirect: "manual",
    });
})

Deno.test("runFetch hideHeaders", async () => {
    await runFetch({
        _: ["https://httpbin.org/status/500"],
        hideHeaders: true,
    });
})

Deno.test("runFetch hideBody", async () => {
    await runFetch({
        _: ["https://httpbin.org/json"],
        hideBody: true,
    });
})

Deno.test("runFetch hideResponse", async () => {
    await runFetch({
        _: ["https://httpbin.org/json"],
        hideResponse: true,
    });
})

Deno.test("runFetch hideRequest", async () => {
    await runFetch({
        _: ["https://httpbin.org/json"],
        hideRequest: true,
    });
});

Deno.test("runFetch body json", async () => {
    await runFetch({
        _: ["https://httpbin.org/json"],
    });
});


Deno.test("runFetch body html", async () => {
    await runFetch({
        _: ["https://httpbin.org/html"],
    });
});

Deno.test("runFetch body xml", async () => {
    await runFetch({
        _: ["https://httpbin.org/xml"],
    });
});


Deno.test("runFetch body plain", async () => {
    await runFetch({
        _: ["https://httpbin.org/robots.txt"],
    });
});


Deno.test("runFetch body deny", async () => {
    await runFetch({
        _: ["https://httpbin.org/deny"],
        redirect: "error",
    });
});
Deno.test("runFetch body gzip",
    // { only: true },
    async () => {
        await runFetch({
            _: ["https://httpbin.org/gzip"],
            redirect: "error",
        });
    });

Deno.test("runFetch body encoding/utf8",
    async () => {
        await runFetch({
            _: ["https://httpbin.org/encoding/utf8"],
            redirect: "error",
        });
    });


Deno.test("runFetch body brotli",
    // { only: true },

    async () => {
        await runFetch({
            _: ["https://httpbin.org/brotli"],
            redirect: "error",
        });
    });


Deno.test("runFetch body deflate",
    { ignore: true }, // TODO: fix this test
    async () => {
        await runFetch({
            _: ["https://httpbin.org/deflate"],
            redirect: "error",
            headers: ["Accept-Encoding: gzip, br"],
        });
    });





Deno.test("runFetch body bytes/8",
    async () => {
        await runFetch({
            _: ["https://httpbin.org/bytes/8"],
            redirect: "error",
        });
    });



Deno.test("runFetch body drip",
    async () => {
        await runFetch({
            _: ["https://httpbin.org/drip"],
            redirect: "error",
        });
    });


Deno.test("runFetch body drip",
    async () => {
        await runFetch({
            _: ["https://httpbin.org/drip"],
            redirect: "error",
        });
    });


const columns = 30;
const rows = 30;

Deno.test("runFetch body image/png",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: ["https://httpbin.org/image/png"],
            redirect: "error",
        });
        consoleSize.restore()
    });


Deno.test("runFetch body image/jpeg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: ["https://httpbin.org/image/jpeg"],
            redirect: "error",
        });
        consoleSize.restore()
    });


Deno.test("runFetch body image/svg",
    async () => {
        const consoleSize = stub(Deno, "consoleSize", () => ({ columns, rows }));
        await runFetch({
            _: ["https://httpbin.org/image/svg"],
            redirect: "error",
        });
        consoleSize.restore()
    });




Deno.test("runFetch request body json",
    { only: true },
    async () => {
        await runFetch({
            _: ["https://httpbin.org/post"],
            method: "POST",
            headers: ["Content-Type: application/json"],
            body: JSON.stringify({ hello: "world" }),
        });
    });
