import {
    assertEquals,
    AssertionError,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/runner.ts";

Deno.test("[runner] find one file", async () => {
    const { files } = await runner(["test/data/test1.http"], { displayIndex: 0 });
    assertEquals(files.length, 1);
    assertEquals(files[0].blocks.length, 6);
});

Deno.test(
    "[runner] must have found request, expected response, meta and actualResponse",
    // { only: true },
    async () => {
        const { files } = await runner(["test/data/test2.http"], { displayIndex: 0 });
        const firstBlock = files[0].blocks[1];
        assertEquals(
            firstBlock.request?.url,
            "https://faker.deno.dev/pong?quiet=true&delay=0",
        );
        assertEquals(firstBlock.meta.boolean, true);
        assertEquals(firstBlock.actualResponse?.status, 200);
        assertEquals(firstBlock.expectedResponse?.status, 200);
    },
);

Deno.test("[runner] interpolation", async () => {
    const { files } = await runner(["test/data/interpolate.http"], {
        displayIndex: 0,
    });
    const firstBlock = files[0].blocks[1];

    assertEquals(
        firstBlock.expectedResponse?.headers.get("content-type"),
        "text/plain;charset=UTF-8",
    );
    assertEquals(await firstBlock.actualResponse?.getBody(), "Hola Garn!");
    const secondBlock = files[0].blocks[1 + 1];
    assertEquals(secondBlock.request?.headers.get('read-from-name'), 'Garn');
    assertEquals(secondBlock.expectedResponse?.body, undefined);

    const thirdBlock = files[0].blocks[1 + 2];
    assertEquals(await thirdBlock.expectedResponse?.getBody(), undefined);
    assertEquals(thirdBlock.error?.message, "ups");
    const fourthBlock = files[0].blocks[1 + 3];
    assertEquals(await fourthBlock.expectedResponse?.getBody(), "hola");
    assertEquals(fourthBlock.error, undefined);

    const fifthBlock = files[0].blocks[1 + 4];
    assertEquals(fifthBlock.request?.headers.get('x-payload'), "Garn?");
    assertEquals(fifthBlock.error, undefined);
    assertEquals(await fifthBlock.expectedResponse?.getBody(), "Garn!");

    const sixthBlock = files[0].blocks[1 + 5];
    assertEquals(sixthBlock.error, undefined);
    assertEquals(await sixthBlock.request?.getBody(), "body");
    assertEquals(await sixthBlock.expectedResponse?.getBody(), "body");

    const seventhBlock = files[0].blocks[1 + 6];
    assertEquals(seventhBlock.expectedResponse?.status, 200);
    assertEquals(seventhBlock.expectedResponse?.statusText, 'OK');
    assertEquals(seventhBlock.expectedResponse?.headers.get('hola'), "mundo");
    assertEquals(seventhBlock.expectedResponse?.headers.get('adios'), "mundo");
});

Deno.test("[runner] asserts ", async () => {
    const { files } = await runner(["test/data/assert.http"], { displayIndex: 0 });
    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.error instanceof AssertionError, true);
    const secondBlock = files[0].blocks[1 + 1];
    assertEquals(secondBlock.error, undefined);
    const thirdBlock = files[0].blocks[1 + 2];
    assertEquals(thirdBlock.error?.message, "failed!");
    const fourthBlock = files[0].blocks[1 + 3];
    assertEquals(
        fourthBlock.error?.message.startsWith("Values are not equal"),
        true,
    );
});

Deno.test("[runner] host meta data", async () => {
    const { files } = await runner(["test/data/host.http"], { displayIndex: 0 });

    const firstBlock = files[0].blocks[0];
    assertEquals(firstBlock.meta.host, "https://faker.deno.dev");

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
    const { files } = await runner(["test/data/timeout.http"], {
        displayIndex: 0,
        timeout: 100,
    });

    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.meta.timeout, "100");
    assertEquals(firstBlock.error?.message, "Timeout of 100ms exceeded");

    const secondBlock = files[0].blocks[2];
    assertEquals(secondBlock.meta.timeout, "0");
    assertEquals(secondBlock.error, undefined);

    const thirdBlock = files[0].blocks[3];
    assertEquals(thirdBlock.meta.timeout, 100);
    assertEquals(thirdBlock.error?.message, "Timeout of 100ms exceeded");
});



Deno.test("[runner] ref", async () => {
    const { files } = await runner(["test/data/ref.http"], {
        displayIndex: 0,
    });

    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.meta.name, 'block1');
    assertEquals(firstBlock.meta.isDoneBlock, true);
    assertEquals(firstBlock.error, undefined);
    assertEquals(await firstBlock.request?.getBody(), "RESPONSE!?");

});



Deno.test("[runner] ref loop", async () => {
    const { files } = await runner(["test/data/ref.loop.http"], {
        displayIndex: 0,
    });

    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.meta.name, 'block1');
    assertEquals(firstBlock.meta.isDoneBlock, true);
    assertEquals(firstBlock.error, undefined);
    assertEquals(await firstBlock.request?.getBody(), "block2?");

    const secondBlock = files[0].blocks[1 + 1];
    assertEquals(secondBlock.meta.name, 'block2');
    assertEquals(secondBlock.meta.isDoneBlock, true);
    assertEquals(secondBlock.error, undefined);
    assertEquals(await secondBlock.request?.getBody(), "block1??");

});


Deno.test("[runner] redirect ", async () => {
    const { files } = await runner(["test/data/redirect.http"], { displayIndex: 0 });
    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.response?.status, 200);
    assertEquals(firstBlock.response?.headers.get('content-type'), 'image/jpeg');
    const secondBlock = files[0].blocks[1 + 1];
    assertEquals(secondBlock.response?.status, 307);
    assertEquals(secondBlock.response?.headers.get('Location')?.startsWith('http'), true);

});
