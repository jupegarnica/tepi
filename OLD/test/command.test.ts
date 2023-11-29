import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.178.0/testing/asserts.ts";

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

Deno.test("[command] must run meta.command", { ignore: true }, async () => {

  const { code, out, success, err } = await run(tepi + "http/command.http");
  console.log(out, err);

  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
});
