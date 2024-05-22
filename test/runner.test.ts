import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "jsr:@std/assert";

import { stub } from "jsr:@std/testing/mock";
import { runner } from "../src/runner.ts";

const HOST = Deno.env.get("HOST") || "https://faker.deno.dev";
const HOST_HTTPBIN = Deno.env.get("HOST_HTTPBIN") || "http://httpbin.org";

// console.debug(`HOST: ${HOST}`);
// console.debug(`HOST_HTTPBIN: ${HOST_HTTPBIN}`);

Deno.test("[runner] find one file", async () => {
  const { files } = await runner(["http/test1.http"], { display: "none" });
  assertEquals(files.length, 1);
  assertEquals(files[0].blocks.length, 6);
});

Deno.test(
  "[runner] must have found request, expected response, meta and actualResponse",
  async () => {
    const { files } = await runner(["http/test2.http"], {
      display: "none",
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
    display: "none",
  });
  const firstBlock = files[0].blocks[1];

  assertEquals(
    firstBlock.expectedResponse?.headers.get("content-type"),
    "text/plain;charset=UTF-8",
  );
  assertEquals(await firstBlock.actualResponse?.getBody(), "Hola Garn!");
  const secondBlock = files[0].blocks[1 + 1];
  assertEquals(secondBlock.request?.headers.get("read-from-id"), "Garn");
  assertEquals(secondBlock.expectedResponse?.body, undefined);

  const thirdBlock = files[0].blocks[1 + 2];
  assertEquals(await thirdBlock.expectedResponse?.getBody(), undefined);
  assertEquals(thirdBlock.error?.message, "Error while parsing request: ups");
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
  assertEquals(eighthBlock.meta.id, "must interpolate ts");
  assertEquals(eighthBlock.error, undefined);
  assertEquals(await eighthBlock.request?.getBody(), "1");
});

Deno.test("[runner] asserts ", async () => {
  const { files } = await runner(["http/assert.http"], {
    display: "none",
  });
  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.error?.name, "ExpectedResponseError");
  const secondBlock = files[0].blocks[1 + 1];
  assertEquals(secondBlock.error, undefined);
  const thirdBlock = files[0].blocks[1 + 2];
  assertEquals(
    thirdBlock.error?.message,
    "Error while parsing response: failed!",
  );
  const fourthBlock = files[0].blocks[1 + 3];
  assertStringIncludes(
    fourthBlock.error?.message || "",
    "Values are not equal",
  );
});

Deno.test("[runner] host meta data", async () => {
  const { files } = await runner(["http/host.http"], { display: "none" });

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
    display: "none",
    timeout: 100,
  });

  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.meta.timeout, 50);
  assertEquals(firstBlock.error?.message, "Timeout of 50ms exceeded");

  const secondBlock = files[0].blocks[2];
  assertEquals(secondBlock.meta.timeout, 0);
  assertEquals(secondBlock.error, undefined);

  const thirdBlock = files[0].blocks[3];
  assertEquals(thirdBlock.meta.timeout, 100);
  assertEquals(thirdBlock.error?.message, "Timeout of 100ms exceeded");
});

Deno.test(
  "[runner] redirect ",
  { ignore: true },
  async () => {
    const { files } = await runner(["http/redirect.http"], {
      display: "none",
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
    Deno.env.set("TEST_ONLY", "true");
    const { files, exitCode, onlyMode } = await runner(["http/only.http"], {
      display: "none",
    });
    assertEquals(files[0].blocks.length, 4);
    assertEquals(files[0].blocks[1].meta.ignore, true);
    assertEquals(files[0].blocks[1].meta.only, false);

    assertEquals(files[0].blocks[2].meta.ignore, undefined);
    assertEquals(files[0].blocks[2].meta.only, true);

    assertEquals(exitCode, 0);
    assertEquals(onlyMode, new Set(["./http/only.http:13"]));
  },
);

Deno.test(
  "[runner] only mode do not ignore needed blocks",
  async () => {
    Deno.env.set("TEST_ONLY", "true");
    const { blocksDone } = await runner(["http/needs.only.http"], {
      display: "none",
    });
    assertEquals(blocksDone.size, 4);
    const blocks = Array.from(blocksDone);

    assertEquals(blocks[0].meta.ignore, true);
    assertEquals(blocks[1].meta.ignore, true);

    assertEquals(blocks[2].description, "no ignored");
    assertEquals(blocks[2].meta.ignore, false);

    assertEquals(blocks[3].meta.needs, "no ignored");
  },
);

Deno.test(
  "[runner] only mode do not fail parse request if the block is ignored",
  async () => {
    Deno.env.set("TEST_ONLY", "true");
    const { exitCode, blocksDone } = await runner(["http/only.http"], {
      display: "none",
    });
    assertEquals(blocksDone.size, 4);
    const blocks = Array.from(blocksDone);
    // console.log(blocks.map((b) => b.description));

    assertEquals(blocks[3].meta.ignore, true);
    assertEquals(blocks[3].error, undefined);
    assertEquals(exitCode, 0);
  },
);

Deno.test(
  "[runner] global vars",
  async () => {
    const { files } = await runner(["http/globalVars.http"], {
      display: "none",
    });
    assertEquals(files[0].blocks.length, 3);
    assertEquals(files[0].blocks[1].error, undefined);
    assertEquals(
      files[0].blocks[1].request?.url,
      HOST + "/?body=2",
    );

    assertEquals(files[0].blocks[2].error, undefined);
    assertEquals(
      files[0].blocks[2].request?.url,
      HOST + "/?body=2",
    );
  },
);

Deno.test("[runner] needs", async () => {
  const { files, blocksDone } = await runner(["http/needs.http"], {
    display: "none",
  });

  const secondBlock = files[0].blocks[2];
  assertEquals(secondBlock.meta.id, "block1");
  assertEquals(secondBlock.meta._isDoneBlock, true);
  assertEquals(secondBlock.error, undefined);
  assertEquals(await secondBlock.request?.getBody(), "RESPONSE!?");
  const blockInOrder = [...blocksDone];

  assertEquals(blockInOrder[0].description, "./http/needs.http:0");
  assertEquals(blockInOrder[1].description, "block3");
  assertEquals(blockInOrder[2].description, "block2");
  assertEquals(blockInOrder[3].description, "block1");
  assertEquals(blockInOrder[4].description, "block4");
  assertEquals(blockInOrder[4].meta._isIgnoredBlock, true);
  assertEquals(blockInOrder[5].description, "block5");
});

Deno.test("[runner] needs loop", async () => {
  const { files, blocksDone } = await runner(["http/needs.loop.http"], {
    display: "none",
  });

  const firstBlock = files[0].blocks[1];
  assertEquals(firstBlock.meta.id, "block_1");
  assertEquals(firstBlock.meta._isDoneBlock, true);
  assertEquals(firstBlock.error?.message.startsWith("Infinite loop"), true);

  const secondBlock = files[0].blocks[2];
  assertEquals(secondBlock.meta.id, "block_2");
  assertEquals(secondBlock.meta._isDoneBlock, true);
  assertEquals(secondBlock.error, undefined);
  assertEquals(await secondBlock.request?.getBody(), "block_1??");
  assertEquals(secondBlock.request?.headers.get("x-body-block1"), "not found");

  const blockInOrder = [...blocksDone];
  // console.log(blockInOrder.map((b) => b.description));
  assertEquals(blockInOrder[0].description, "./http/needs.loop.http:0");
  assertEquals(blockInOrder[1].description, "block_1");
  assertEquals(blockInOrder[2].description, "block_2");
  assertEquals(blockInOrder[3].description, "block_3");
  assertEquals(blockInOrder[4]?.description, "block_4");
  assertEquals(blockInOrder[5]?.description, undefined);
});

Deno.test("[runner] needs crossed", async () => {
  const { blocksDone } = await runner([
    "http/needs.http",
    "http/needs.loop.http",
  ], {
    display: "none",
  });

  const blockInOrder = [...blocksDone];
  // console.log(blockInOrder.map((b) => b.description));
  assertEquals(blockInOrder[0].description, "./http/needs.http:0");
  assertEquals(blockInOrder[1].description, "block3");
  assertEquals(blockInOrder[2].description, "block2");
  assertEquals(blockInOrder[3].description, "block1");
  assertEquals(blockInOrder[4]?.description, "block4");
  assertEquals(blockInOrder[5]?.description, "block_4");
  assertEquals(blockInOrder[6]?.description, "block5");
  assertEquals(blockInOrder[7]?.description, "./http/needs.loop.http:0");
  assertEquals(blockInOrder[8]?.description, "block_1");
  assertEquals(blockInOrder[9]?.description, "block_2");
  assertEquals(blockInOrder[10]?.description, "block_3");
  assertEquals(blockInOrder[11]?.description, undefined);
});

Deno.test(
  "[runner] meta.import must import",
  async () => {
    const { files, exitCode } = await runner([
      Deno.cwd() + "/http/import.http",
    ], {
      display: "none",
    });
    assert(files.some((f) => f.path.includes("import.http")));
    assert(files.some((f) => f.path.includes("pass.http")));
    assertEquals(exitCode, 0);
  },
);

Deno.test(
  "[runner] meta.import must run imported files before actual file without using needs",
  async () => {
    const { files, exitCode } = await runner([
      Deno.cwd() + "/http/import.http",
      Deno.cwd() + "/http/pass.http",
    ], {
      display: "none",
    });
    assert(files.some((f) => f.path.includes("import.http")));
    assert(files.some((f) => f.path.includes("pass.http")));
    assertEquals(exitCode, 0);
  },
);

Deno.test(
  "[runner] meta.import must handle infinite loop",
  async () => {
    const error = stub(console, "error");
    const { exitCode } = await runner([
      Deno.cwd() + "/http/import1.http",
    ], {
      display: "none",
    });
    error.restore();
    assertEquals(exitCode, 1);
  },
);

Deno.test(
  "[runner] logger",
  async () => {
    const { exitCode } = await runner([
      Deno.cwd() + "/http/timeout.http",
    ], {
      display: "none",
    });
    assertEquals(exitCode, 1);
  },
);

Deno.test(
  "[runner] parser",
  async () => {
    const { blocksDone } = await runner([
      Deno.cwd() + "/http/parseConditional.http",
    ], {
      display: "none",
    });
    const blockInOrder = [...blocksDone];
    assertEquals(blockInOrder[0].description, "./http/parseConditional.http:0");
    assertEquals(blockInOrder[1].description, "response conditional");
    try {
      assertEquals(blockInOrder[1].body, "1");
    } catch {
      assertEquals(blockInOrder[1].body, "2");
    }
    assertEquals(blockInOrder[2].description, "request conditional");
    try {
      assertEquals(blockInOrder[2].request?.url.endsWith("/pong?body=2"), true);
    } catch {
      assertEquals(blockInOrder[2].request?.url.endsWith("/pong?body=3"), true);
    }
    assertEquals(blockInOrder[3].description, "meta conditional");
    try {
      assertEquals(blockInOrder[3].meta.rnd, 1);
    } catch {
      assertEquals(blockInOrder[3].meta.rnd, 2);
    }
  },
);

Deno.test(
  "[runner] run a line than needs another block",
  async () => {
    const { exitCode, blocksDone } = await runner([
      Deno.cwd() + "/http/line.http:6",
    ], {
      display: "none",
    });
    const blockInOrder = [...blocksDone];
    assertEquals(blockInOrder[1].description, "404");
    assertEquals(blockInOrder[1].meta.only, false);
    assertEquals(blockInOrder[1].meta.ignore, false);
    assertEquals(blockInOrder[1].meta._isSuccessfulBlock, true);

    assertEquals(blockInOrder[2].description, "needs404");
    assertEquals(blockInOrder[2].meta._isSuccessfulBlock, true);
    assertEquals(blockInOrder[2].meta.only, true);
    assertEquals(blockInOrder[2].meta.ignore, undefined);

    assertEquals(blockInOrder[3].meta.only, false);
    assertEquals(blockInOrder[3].meta.ignore, true);
    assertEquals(exitCode, 0);
  },
);

Deno.test(
  "[runner] run a line than does not need another block",
  async () => {
    const { exitCode, blocksDone } = await runner([
      Deno.cwd() + "/http/line.http:30",
    ], {
      display: "none",
    });
    const blockInOrder = [...blocksDone];
    assertEquals(blockInOrder[1].description, "needs404");
    assertEquals(blockInOrder[1].meta._isIgnoredBlock, true);
    assertEquals(blockInOrder[1].meta.only, false);

    assertEquals(blockInOrder[2].description, "404");
    assertEquals(blockInOrder[2].meta._isSuccessfulBlock, true);
    assertEquals(blockInOrder[2].meta._isIgnoredBlock, undefined);
    assertEquals(blockInOrder[2].meta.only, false);

    assertEquals(blockInOrder[3].description, "400");
    assertEquals(blockInOrder[3].meta._isIgnoredBlock, undefined);
    assertEquals(blockInOrder[3].meta.only, true);
    assertEquals(blockInOrder[3].meta._isSuccessfulBlock, true);
    assertEquals(exitCode, 0);
  },
);

Deno.test("[runner] must fail if no test has been run", async () => {
  const { exitCode } = await runner([
    Deno.cwd() + "/http/noTests.http",
  ], {
    display: "none",
  });
  assertEquals(exitCode, 1);
  // console.log([...blocksDone].map((b) => b.meta._isFetchedBlock));
});
