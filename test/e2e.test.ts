import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.160.0/testing/asserts.ts";
import { installCommand, runRemoteCommand } from "../src/help.ts";

function textDecode(buffer: Uint8Array) {
  return new TextDecoder().decode(buffer);
}

async function run(command: string) {
  const [cmd, ...args] = command.split(/\s+/);
  const { code, stdout, stderr, success } = await Deno.spawn(cmd, { args });
  const out = textDecode(stdout);
  const err = textDecode(stderr);

  return { code, err, out, success };
}
const tepi = "deno run -A --unstable ./src/cli.ts ";

Deno.test("[e2e] must return code 0 when all tests pass", async () => {
  const { code, err, out, success } = await run(tepi + "http/pass.http");
  assertEquals(err, "");
  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
});

Deno.test("[e2e] must return the code of failing tests", async () => {
  const { code } = await run(tepi + "http/failFast.http");
  assertEquals(code, 2);
});

Deno.test("[e2e] must return code 1 when fails on failFast mode", async () => {
  const { code } = await run(tepi + "http/failFast.http --failFast");
  assertEquals(code, 1);
});

Deno.test(
  "[e2e] display none all tests",
  { ignore: Math.random() < 0.95 },
  async () => {
    const { code, err, out, success } = await run(tepi + "--display none");
    assertEquals(err, "");
    assertEquals(out, "");
    assertEquals(code, 0);
    assertEquals(success, true);
  },
);
Deno.test("[e2e] display none", async () => {
  const { code, err, out, success } = await run(
    tepi + "--display none http/parser.http",
  );
  assertEquals(err, "");
  assertEquals(out, "");
  assertEquals(code, 2);
  assertEquals(success, false);
});


Deno.test("[e2e] run help", async () => {
    const { code, err, out, success } = await run(
      tepi + "--help",
    );
    assertEquals(err, "");
    assertEquals(out.length > 0, true);
    assertEquals(code, 0);
    assertEquals(success, true);
  });

const mustInstall = Math.random() < 0.95;

Deno.test("[e2e] help commands must work: installCommand", {
  ignore: mustInstall,
}, async () => {
  const { code, out, success } = await run(installCommand);
  assertEquals(code, 0);
  assertEquals(success, true);
  assert(out.length > 0);
});

Deno.test("[e2e] keep install local", { ignore: mustInstall }, async () => {
  const { code, out, success } = await run("deno task install");
  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
});

Deno.test("[e2e] help commands must work: runRemoteCommand", {
  // only: true,
  ignore: Math.random() < 0.95,
}, async () => {
  const {  out, success } = await run(runRemoteCommand);
  assert(out.length > 0);
//   assertEquals(code, 17);
  assertEquals(success, false);
});
