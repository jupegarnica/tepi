import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { installCommand, runRemoteCommand } from "../src/help.ts";

function textDecode(buffer: Uint8Array) {
  return new TextDecoder().decode(buffer);
}

async function run(command: string) {
  const [cmd, ...args] = command.split(/\s+/);
  const { code, stdout, stderr, success } = await new Deno.Command(cmd, { args }).output();
  const out = textDecode(stdout);
  const err = textDecode(stderr);

  return { code, err, out, success };
}
const tepi = "deno run -A ./src/cli.ts ";

Deno.test("[e2e] must return code 0 when all tests pass", async () => {
  const { code, out, success,err } = await run(tepi + "http/pass.http");
  // console.log(out, out.length);

  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
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
  { ignore: !!Deno.env.get("IGNORE_TEST") || Math.random() < 0.95 },
  async () => {
    const { code, err, out, success } = await run(tepi + "--display none");
    assertEquals(err, "");
    assertEquals(out, "");
    assertEquals(success, false);
    assertEquals(code >= 10, true);
  },
);
Deno.test("[e2e] display none", async () => {
  const { code, err, out, success } = await run(
    tepi + "--display none http/parser.http",
  );
  assertEquals(code, 3);
  assertEquals(success, false);
  assertEquals(err, "");
  assertEquals(out, "");
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

const mustInstall = !!Deno.env.get("IGNORE_TEST") || Math.random() < 0.95;

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
  ignore: !!Deno.env.get("IGNORE_TEST") || Math.random() < 0.95,
}, async () => {
  const { out, success } = await run(runRemoteCommand);
  assert(out.length > 0);
  //   assertEquals(code, 17);
  assertEquals(success, false);
});
