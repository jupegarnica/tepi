import { runFetch } from "./main.ts";

Deno.test("runFetch", async () => {
    await runFetch({
        _: ["https://httpbin.org/get"],
        method: "GET",
        headers: ["Accept: application/json"],
    });
})