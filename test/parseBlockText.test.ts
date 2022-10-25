import { assertEquals, assertRejects } from "https://deno.land/std@0.158.0/testing/asserts.ts";
import { parseBlockText } from "../src/parseBlockText.ts";
import { stub } from "https://deno.land/std@0.158.0/testing/mock.ts";
import { YAMLError } from "https://deno.land/std@0.160.0/encoding/_yaml/error.ts";

Deno.env.get("NO_LOG") && stub(console, "info");

// const http = String.raw
Deno.test("[parseBlockText request]", async () => {
  const block = {
    meta: {},
    text: `
GET http://faker.deno.dev
`,
  };
  const { request } = await parseBlockText(block);
  assertEquals(request?.method, "GET", "invalid method");
  assertEquals(request?.url, "http://faker.deno.dev/");
});

Deno.test("[parseBlockText request] with headers", async () => {
  const block = {
    meta: {},
    text: `POST http://faker.deno.dev HTTP/1.1
        Host: faker.deno.dev
        User-Agent: curl/7.64.1

        x-foo: bar`,
  };
  const { request } = await parseBlockText(block);
  assertEquals(request?.headers.get("Host"), "faker.deno.dev");
  assertEquals(request?.headers.get("User-Agent"), "curl/7.64.1");
  assertEquals(request?.headers.get("x-foo"), null);
});

Deno.test("[parseBlockText request] with headers not body", async () => {
  const block = {
    meta: {},
    text: `GET http://faker.deno.dev HTTP/1.1
        Host: http://faker.deno.dev`,
  };
  const { request } = await parseBlockText(block);
  assertEquals(request?.bodyRaw, null);
  assertEquals(request?.headers.get("host"), "http://faker.deno.dev");
});

Deno.test("[parseBlockText request] with headers and comments", async () => {
  const block = {
    meta: {},
    text: `POST http://faker.deno.dev HTTP/1.1
Host: faker.deno.dev
# x-foo: bar
User-Agent: curl/7.64.1

x-foo: bar`,
  };
  const { request } = await parseBlockText(block);
  assertEquals(request?.headers.get("Host"), "faker.deno.dev");
  assertEquals(request?.headers.get("User-Agent"), "curl/7.64.1");
  assertEquals(request?.headers.get("x-foo"), null);
});

Deno.test("[parseBlockText request] without protocol", async () => {
  const block = {
    meta: {},
    text: `GET faker.deno.dev`,
  };

  const { request } = await parseBlockText(block);
  assertEquals(request?.url, "http://faker.deno.dev/");
});

Deno.test("[parseBlockText request] with body", async () => {
  const block = {
    meta: {},
    text: `POST faker.deno.dev
        Content-Type: text/plain

        hola mundo`,
  };
  const { request } = await parseBlockText(block);
  const body = await request?.text();
  assertEquals(body, "hola mundo");
});

Deno.test("[parseBlockText request] with body no headers", async () => {
  const block = {
    meta: {},
    text: `POST faker.deno.dev

        hola mundo`,
  };
  const { request } = await parseBlockText(block);
  const body = await request?.text();
  assertEquals(
    request?.headers.get("Content-Type"),
    "text/plain;charset=UTF-8",
  );
  assertEquals(body, "hola mundo");
});

Deno.test("[parseBlockText request] with body raw", async () => {
  const block = {
    meta: {},
    text: `POST faker.deno.dev

        hola mundo`,
  };
  const { request } = await parseBlockText(block);
  const body = request?.bodyRaw;
  assertEquals(body, "hola mundo");
});

Deno.test(
  "[parseBlockText request] with comments and body", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev
#  x-foo: bar
Content-Type: text/plain
# ups

hola mundo
# adios

hola

HTTP/1.1 200 OK
        `,
    };
    const { request } = await parseBlockText(block);

    const body = await request?.text();
    assertEquals(request?.headers.get("x-foo"), null);
    assertEquals(body, "hola mundo\n# adios\n\nhola");
  },
);

Deno.test(
  "[parseBlockText request] with comments and body and final separator",
  //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev
#  x-foo: bar
Content-Type: text/plain
# ups

hola mundo
# adios

hola

###
    `,
    };
    const { request } = await parseBlockText(block);

    const body = await request?.text();
    assertEquals(request?.headers.get("x-foo"), null);
    assertEquals(body, "hola mundo\n# adios\n\nhola");
  },
);

Deno.test(
  "[parseBlockText expectedResponse] with status", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
            Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar

    hola mundo

        `,
    };
    const { expectedResponse } = await parseBlockText(block);

    assertEquals(expectedResponse?.status, 200);
  },
);

Deno.test(
  "[parseBlockText expectedResponse] with headers", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
    Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`,
    };
    const { expectedResponse } = await parseBlockText(block);

    assertEquals(expectedResponse?.headers.get("x-foo"), "bar");
  },
);

Deno.test(
  "[parseBlockText expectedResponse] with statusText", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
Content-Type: text/plain

hola mundo

HTTP/1.1 200 OK
x-foo: bar

hola mundo

`,
    };
    const { expectedResponse } = await parseBlockText(block);

    assertEquals(expectedResponse?.statusText, "OK");
  },
);

Deno.test(
  "[parseBlockText expectedResponse] with body ", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
    Content-Type: text/plain

    hola mundo

    HTTP/1.1 200 OK
    x-foo: bar


    hola mundo

    `,
    };
    const { expectedResponse } = await parseBlockText(block);
    assertEquals(await expectedResponse?.text(), "hola mundo");
  },
);

Deno.test(
  "[parseBlockText expectedResponse] without body ", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
            Content-Type: text/plain

            hola mundo

            HTTP/1.1 200 OK
            x-foo: bar
            `,
    };
    const { expectedResponse } = await parseBlockText(block);
    assertEquals(await expectedResponse?.text(), "");
  },
);

Deno.test(
  "[parseBlockText expectedResponse] with body multiline ", //
  async () => {
    const block = {
      meta: {},
      text: `POST faker.deno.dev/pong
Content-Type: text/plain

hello world

HTTP/1.1 200 OK
x-foo: bar
Content-Type: text/plain


hola
# hello

mundo
###

    `,
    };
    const { expectedResponse } = await parseBlockText(block);
    assertEquals(await expectedResponse?.text(), "hola\n# hello\n\nmundo");
  },
);

Deno.test("[parseBlockText meta] with front matter yml ", async () => {
  const block = {
    meta: {},
    text: `
---
name: test
description: hello world
null:
null2: null

boolean: true
booleanFalse: false

number: 1
array: [1,2,3]
obj: {a: 1}
obj2:
  a: 2
list:
    - 1
    - a
---

GET faker.deno.dev
`,
  };
  const { meta } = await parseBlockText(block);

  assertEquals(meta, {
    name: "test",
    description: "hello world",
    null: null,
    null2: null,
    boolean: true,
    booleanFalse: false,
    array: [1, 2, 3],
    number: 1,
    obj: {a:1},
    list: [1, "a"],
    obj2: {a: 2},
  });
});



Deno.test("[parseBlockText meta] with interpolation", async () => {
  const block = {
    meta: {},
    text: `
---
number: <%= 1 + 1 %>
---

GET faker.deno.dev
# hola

###
`,
  };
  const { meta } = await parseBlockText(block);

  assertEquals(meta, {
    number: 2,
  });
});


Deno.test("[parseBlockText meta] with comments", async () => {
  const block = {
    meta: {},
    text: `
---
number: 100 # this is a comment
ups: text # this is a comment
textWithComment: "hello # this is a comment"
---

GET faker.deno.dev
`,
  };
  const { meta } = await parseBlockText(block);

  assertEquals(meta, {
    number: 100,
    ups: "text",
    textWithComment: "hello # this is a comment",
  });
});


Deno.test("[parseBlockText meta] fail parsing", async () => {
  const block = {
    meta: {},
    text: `
---
number: 100
ups text # this is a comment
---

GET faker.deno.dev
`,
  };
  await assertRejects(async () => await parseBlockText(block), YAMLError);
});
