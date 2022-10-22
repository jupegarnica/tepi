import {
    assertEquals,
    AssertionError,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/cli.ts";

Deno.test("[runner] find one file", async () => {
    const files = await runner(["test/data/test1.http"], { displayIndex: 0 });
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 5);
});

Deno.test(
    "[runner] must have found request, expected response, meta and actualResponse",
    // { only: true },
    async () => {
        const files = await runner(["test/data/test2.http"], { displayIndex: 0 });
        const firstBlock = files[0].blocks[0];
        assertEquals(
            firstBlock.request?.url,
            "https://faker.deno.dev/pong?quiet=true&delay=200",
        );
        assertEquals(firstBlock.meta.boolean, true);
        assertEquals(firstBlock.actualResponse?.status, 200);
        assertEquals(firstBlock.expectedResponse?.status, 200);
    },
);

Deno.test("[runner] interpolation", async () => {
    const files = await runner(["test/data/interpolate.http"], {
        displayIndex: 0,
    });
    const firstBlock = files[0].blocks[0];

    assertEquals(
        firstBlock.expectedResponse?.headers.get("content-type"),
        "text/plain;charset=UTF-8",
    );
    await firstBlock.actualResponse?.extractBody();
    assertEquals(firstBlock.actualResponse?.bodyExtracted, "Hola Garn!");

    const secondBlock = files[0].blocks[1];
    assertEquals(secondBlock.request?.headers.get('read-from-name'), 'Garn');
    assertEquals(secondBlock.expectedResponse?.body, undefined);

    const thirdBlock = files[0].blocks[2];
    await thirdBlock.expectedResponse?.extractBody();
    assertEquals(thirdBlock.expectedResponse?.bodyExtracted, undefined);
    assertEquals(thirdBlock.error?.message, "ups");
    const fourthBlock = files[0].blocks[3];
    await fourthBlock.expectedResponse?.extractBody();
    assertEquals(fourthBlock.expectedResponse?.bodyExtracted, "hola");
    assertEquals(fourthBlock.error, undefined);
});

Deno.test("[runner] asserts ", async () => {
    const files = await runner(["test/data/assert.http"], { displayIndex: 0 });
    const firstBlock = files[0].blocks[0];
    assertEquals(firstBlock.error instanceof AssertionError, true);
    const secondBlock = files[0].blocks[1];
    assertEquals(secondBlock.error, undefined);
    const thirdBlock = files[0].blocks[2];
    assertEquals(thirdBlock.error?.message, "failed!");
    const fourthBlock = files[0].blocks[3];
    assertEquals(
        fourthBlock.error?.message.startsWith("Values are not equal"),
        true,
    );
});

Deno.test("[runner] host meta data", async () => {
    const files = await runner(["test/data/host.http"], { displayIndex: 0 });

    const firstBlock = files[0].blocks[0];
    assertEquals(firstBlock.meta.host, "https://faker.deno.dev/");

    const secondBlock = files[0].blocks[1];
    assertEquals(
        secondBlock.request?.url,
        "https://faker.deno.dev/pong?quiet=true",
    );

    const thirdBlock = files[0].blocks[2];
    assertEquals(thirdBlock.request?.url, "https://faker.deno.dev/");

    const fourthBlock = files[0].blocks[3];
    assertEquals(fourthBlock.request?.url, "https://faker.deno.dev/ping");

    const fifthBlock = files[0].blocks[4];
    assertEquals(fifthBlock.request?.url, "http://httpbin.org/get");

    const sixthBlock = files[0].blocks[5];
    assertEquals(sixthBlock.request?.url, "http://httpbin.org/post");
});

Deno.test("[runner] timeout", async () => {
    const files = await runner(["test/data/timeout.http"], {
        displayIndex: 0,
        timeout: 100,
    });

    const firstBlock = files[0].blocks[0];
    assertEquals(firstBlock.meta.timeout, "500");
    assertEquals(firstBlock.error?.message, "Timeout of 500ms exceeded");

    const secondBlock = files[0].blocks[1];
    assertEquals(secondBlock.meta.timeout, "0");
    assertEquals(secondBlock.error, undefined);

    const thirdBlock = files[0].blocks[2];
    assertEquals(thirdBlock.meta.timeout, 100);
    assertEquals(thirdBlock.error?.message, "Timeout of 100ms exceeded");
});



Deno.test("[runner] ref", { only: true }, async () => {
    const files = await runner(["test/data/ref.http"], {
        displayIndex: 0,
    });

    const firstBlock = files[0].blocks[0];
    // console.log(firstBlock);

    assertEquals(firstBlock.meta.isFetchedBlock, true);
    assertEquals(firstBlock.request?.bodyExtracted, "block3?");

    const secondBlock = files[0].blocks[1];
    // assertEquals(secondBlock.meta.timeout, "0");
});
