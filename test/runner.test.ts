import {
  assertEquals,
  AssertionError,
} from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { runner } from "../src/runner.ts";

const HOST = Deno.env.get("HOST") || "https://faker.deno.dev";
const HOST_HTTPBIN = Deno.env.get("HOST_HTTPBIN") || "http://httpbin.org";

// console.debug(`HOST: ${HOST}`);
// console.debug(`HOST_HTTPBIN: ${HOST_HTTPBIN}`);

Deno.test("[runner] find one file", async () => {
  const { files } = await runner(["http/test1.http"], { _displayIndex: 0 });
  assertEquals(files.length, 1);
  assertEquals(files[0].blocks.length, 6);
});

Deno.test(
  "[runner] must have found request, expected response, meta and actualResponse",
  // { only: true },
  async () => {
    const { files } = await runner(["http/test2.http"], {
      _displayIndex: 0,
    });
    const firstBlock = files[0].blocks[1];
    assertEquals(
      firstBlock.request?.url,
      HOST + "/pong?quiet=true&delay=0",
    );
    assertEquals(firstBlock.meta.boolean, true);
    assertEquals(firstBlock.actualResponse?.status, 200);
    assertEquals(firstBlock.expectedResponse?.status, 200);
  },
);

Deno.test("[runner] interpolation", async () => {
  const { files } = await runner(["http/interpolate.http"], {
    _displayIndex: 0,
  });
  const firstBlock = files[0].blocks[1];

  assertEquals(
    firstBlock.expectedResponse?.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assertEquals(await firstBlock.actualResponse?.getBody(), "Hola Garn!");
  const secondBlock = files[0].blocks[1 + 1];
  assertEquals(secondBlock.request?.headers.get("read-from-name"), "Garn");
  assertEquals(secondBlock.expectedResponse?.body, undefined);

  const thirdBlock = files[0].blocks[1 + 2];
  assertEquals(await thirdBlock.expectedResponse?.getBody(), undefined);
  assertEquals(thirdBlock.error?.message, "ups");
  const fourthBlock = files[0].blocks[1 + 3];
  assertEquals(await fourthBlock.expectedResponse?.getBody(), "hola");
  assertEquals(fourthBlock.error, undefined);

  const fifthBlock = files[0].blocks[1 + 4];
  assertEquals(fifthBlock.request?.headers.get("x-payload"), "Garn?");
  assertEquals(fifthBlock.error, undefined);
  assertEquals(await fifthBlock.expectedResponse?.getBody(), "Garn!");

  const sixthBlock = files[0].blocks[1 + 5];
  assertEquals(sixthBlock.error, undefined);
  assertEquals(await sixthBlock.request?.getBody(), "body");
  assertEquals(await sixthBlock.expectedResponse?.getBody(), "body");

  const seventhBlock = files[0].blocks[1 + 6];
  assertEquals(seventhBlock.expectedResponse?.status, 200);
  assertEquals(seventhBlock.expectedResponse?.statusText, "OK");
  assertEquals(seventhBlock.expectedResponse?.headers.get("hola"), "mundo");
  assertEquals(seventhBlock.expectedResponse?.headers.get("adios"), "mundo");

  const eighthBlock = files[0].blocks[1 + 7];
  assertEquals(eighthBlock.meta.name, "must interpolate ts");
  assertEquals(eighthBlock.error, undefined);
  assertEquals(await eighthBlock.request?.getBody(), "1");
});

Deno.test("[runner] asserts ", async () => {
  const { files } = await runner(["http/assert.http"], {
    _displayIndex: 0,
  });
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
  const { files } = await runner(["http/host.http"], { _displayIndex: 0 });

  const firstBlock = files[0].blocks[0];
  assertEquals(firstBlock.meta.host, HOST);

  const secondBlock = files[0].blocks[1];
  assertEquals(
    secondBlock.request?.url,
    HOST + "/pong?quiet=true",
  );

  const thirdBlock = files[0].blocks[2];
  assertEquals(thirdBlock.request?.url, HOST + "/", "thirdBlock");

  const fourthBlock = files[0].blocks[3];
  assertEquals(fourthBlock.request?.url, HOST + "/ping", "fourthBlock");

  const fifthBlock = files[0].blocks[4];
  assertEquals(fifthBlock.request?.url, HOST_HTTPBIN + "/get", "fifthBlock");

  const sixthBlock = files[0].blocks[5];
  assertEquals(sixthBlock.request?.url, HOST_HTTPBIN + "/post", "sixthBlock");
});

Deno.test("[runner] timeout", async () => {
  const { files } = await runner(["http/timeout.http"], {
    _displayIndex: 0,
    timeout: 100,
  });

  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.meta.timeout, 100);
  assertEquals(firstBlock.error?.message, "Timeout of 100ms exceeded");

  const secondBlock = files[0].blocks[2];
  assertEquals(secondBlock.meta.timeout, 0);
  assertEquals(secondBlock.error, undefined);

  const thirdBlock = files[0].blocks[3];
  assertEquals(thirdBlock.meta.timeout, 100);
  assertEquals(thirdBlock.error?.message, "Timeout of 100ms exceeded");
});

Deno.test("[runner] ref", async () => {
  const { files } = await runner(["http/ref.http"], {
    _displayIndex: 0,
  });

  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.meta.name, "block1");
  assertEquals(firstBlock.meta._isDoneBlock, true);
  assertEquals(firstBlock.error, undefined);
  assertEquals(await firstBlock.request?.getBody(), "RESPONSE!?");
});

Deno.test("[runner] ref loop", async () => {
  const { files } = await runner(["http/ref.loop.http"], {
    _displayIndex: 0,
  });

  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.meta.name, "block1");
  assertEquals(firstBlock.meta._isDoneBlock, true);
  assertEquals(firstBlock.error, undefined);
  assertEquals(await firstBlock.request?.getBody(), "block2?");

  const secondBlock = files[0].blocks[1 + 1];
  assertEquals(secondBlock.meta.name, "block2");
  assertEquals(secondBlock.meta._isDoneBlock, true);
  assertEquals(secondBlock.error, undefined);
  assertEquals(await secondBlock.request?.getBody(), "block1??");
});

Deno.test(
  "[runner] redirect ",
  async () => {
    const { files } = await runner(["http/redirect.http"], {
      _displayIndex: 0,
    });

    const firstBlock = files[0].blocks[1];
    assertEquals(firstBlock.request?.url, HOST + "/image/avatar");
    assertEquals(firstBlock.meta?.redirect, "follow");
    assertEquals(
      firstBlock.response?.headers.get("content-type"),
      "image/jpeg",
    );
    assertEquals(
      firstBlock.response?.redirected,
      false,
      "NOT REDIRECTED BECAUSE WHERE ARE EVALUATING THE FINAL RESPONSE",
    );
    assertEquals(firstBlock.response?.status, 200);
    assertEquals(firstBlock.response?.type, "default");

    const secondBlock = files[0].blocks[2];
    assertEquals(secondBlock.response?.type, "default");
    assertEquals(secondBlock.meta?.redirect, "manual");
    assertEquals(secondBlock.response?.redirected, false);
    assertEquals(
      secondBlock.response?.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    assertEquals(secondBlock.response?.status, 307);
    assertEquals(
      secondBlock.response?.headers.get("Location")?.startsWith("http"),
      true,
    );
  },
);

Deno.test(
  "[runner] only mode",
  async () => {
    const { files, exitCode, onlyMode } = await runner(["http/only.http"], {
      _displayIndex: 0,
    });
    assertEquals(files[0].blocks.length, 3);
    assertEquals(files[0].blocks[1].meta.ignore, true);
    assertEquals(files[0].blocks[1].meta.only, undefined);

    assertEquals(files[0].blocks[2].meta.ignore, undefined);
    assertEquals(files[0].blocks[2].meta.only, true);

    assertEquals(exitCode, 0);
    assertEquals(onlyMode, ["http/only.http:13"]);
  },
);
