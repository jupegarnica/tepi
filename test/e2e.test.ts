import { test } from "vitest";
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { installCommand, runRemoteCommand } from "../src/help.ts";
import { exec as _exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(_exec);

async function run(command: string) {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { code: 0, out: stdout, err: stderr, success: true };
  } catch (e: any) {
    return {
      code: e.code ?? 1,
      out: e.stdout ?? "",
      err: e.stderr ?? "",
      success: false,
    };
  }
}

const tsxBin = "node_modules/.bin/tsx";
const tepi = `${tsxBin} ./src/cli.ts `;

test("[e2e] must return code 0 when all tests pass", async () => {
  const { code, out, success, err } = await run(tepi + "http/pass.http");

  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
});

test("[e2e] must return the code of failing tests", async () => {
  const { code } = await run(tepi + "http/failFast.http");
  assertEquals(code, 2);
});

test("[e2e] must return code 1 when fails on failFast mode", async () => {
  const { code } = await run(tepi + "http/failFast.http --failFast");
  assertEquals(code, 1);
});

const ignoreDisplayNone = !!process.env.IGNORE_TEST || Math.random() < 0.95;
test.skipIf(ignoreDisplayNone)(
  "[e2e] display none all tests",
  async () => {
    const { code, err, out, success } = await run(tepi + "--display none");
    assertEquals(err, "");
    assertEquals(out, "");
    assertEquals(success, false);
    assertEquals(code >= 10, true);
  }
);
test("[e2e] display none", async () => {
  const { code, err, out, success } = await run(
    tepi + "--display none http/parser.http"
  );
  assertEquals(code, 3);
  assertEquals(success, false);
  assertEquals(err, "");
  assertEquals(out, "");
});

test("[e2e] display dots prints progress and summary", async () => {
  const { code, err, out, success } = await run(
    tepi + "--display dots --no-color --no-animation http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
  assertStringIncludes(out, ".");
  assertStringIncludes(out, "Test Files");
  assertStringIncludes(out, "Tests");
});

test("[e2e] display dots prints failure details", async () => {
  const { code, err, out, success } = await run(
    tepi + "--display dots --no-color --no-animation http/failFast.http"
  );

  assertEquals(code, 2);
  assertEquals(success, false);
  assertEquals(err, "");
  assertStringIncludes(out, "x");
  assertStringIncludes(out, "FAIL http/failFast.http");
  assertStringIncludes(out, "Tests");
});

test("[e2e] --no-animation omits running state in default display", async () => {
  const { code, err, out } = await run(
    tepi + "--no-animation --no-color http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(err, "");
  assert(!out.includes("running..."), "output must not contain 'running...'");
  assertStringIncludes(out, "✓");
});

test("[e2e] --no-animation omits running state with failures", async () => {
  const { code, err, out } = await run(
    tepi + "--no-animation --no-color http/failFast.http"
  );

  assertEquals(code, 2);
  assertEquals(err, "");
  assert(!out.includes("running..."), "output must not contain 'running...'");
  assertStringIncludes(out, "✗");
});

test("[e2e] --no-animation works with display truncate", async () => {
  const { code, err, out } = await run(
    tepi + "--no-animation --no-color --display truncate http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(err, "");
  assert(!out.includes("running..."), "output must not contain 'running...'");
});

test("[e2e] --no-animation works with display dots", async () => {
  const { code, err, out } = await run(
    tepi + "--no-animation --no-color --display dots http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(err, "");
  assert(!out.includes("running..."), "output must not contain 'running...'");
  assertStringIncludes(out, ".");
});

test("[e2e] threads defaults to 1 when omitted", async () => {
  const withoutThreads = await run(
    tepi + "--display none http/pass.http"
  );
  const withThreads = await run(
    tepi + "--display none --threads=1 http/pass.http"
  );

  assertEquals(withoutThreads.code, 0);
  assertEquals(withThreads.code, 0);
  assertEquals(withoutThreads.code, withThreads.code);
  assertEquals(withoutThreads.success, withThreads.success);
});

test("[e2e] threads accepts values greater than 1", async () => {
  const { code, err, success } = await run(
    tepi + "--display none --threads=2 http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
});

test("[e2e] threads accepts the -p alias", async () => {
  const { code, err, success } = await run(
    tepi + "--display none -p=2 http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
});

test("[e2e] threads accepts the --parallelization alias", async () => {
  const { code, err, success } = await run(
    tepi + "--display none --parallelization=2 http/pass.http"
  );

  assertEquals(code, 0);
  assertEquals(success, true);
  assertEquals(err, "");
});

test("[e2e] threads rejects invalid values", async () => {
  const { code, err, success } = await run(
    tepi + "--display none --threads=0 http/pass.http"
  );

  assertEquals(code, 1);
  assertEquals(success, false);
  assertStringIncludes(err, "Invalid threads value: 0");
});

test("[e2e] timeout accepts the -t alias", async () => {
  const { code, success } = await run(
    tepi + "--display none -t=100 http/timeout.http"
  );

  assertEquals(code, 2);
  assertEquals(success, false);
});

test("[e2e] run help", async () => {
  const { code, err, out, success } = await run(tepi + "--help");
  assertEquals(err, "");
  assertEquals(out.length > 0, true);
  assertEquals(code, 0);
  assertEquals(success, true);
});

const mustInstall = !!process.env.IGNORE_TEST || Math.random() < 0.95;

test.skipIf(mustInstall)(
  "[e2e] help commands must work: installCommand",
  async () => {
    const { code, out, success } = await run(installCommand);
    assertEquals(code, 0);
    assertEquals(success, true);
    assert(out.length > 0);
  }
);

test.skipIf(mustInstall)("[e2e] keep install local", async () => {
  const { code, out, success } = await run("npm link");
  assert(out.length > 0);
  assertEquals(code, 0);
  assertEquals(success, true);
});

const ignoreRunRemote = !!process.env.IGNORE_TEST || Math.random() < 0.95;
test.skipIf(ignoreRunRemote)(
  "[e2e] help commands must work: runRemoteCommand",
  async () => {
    const { out, success } = await run(runRemoteCommand);
    assert(out.length > 0);
    assertEquals(success, false);
  }
);

test("[e2e] allow empty status code", {}, async () => {
  const { out, success, code } = await run(tepi + "http/emptyStatusCode.http");
  assert(out.length > 0);
  assertEquals(code, 2);
  assertEquals(success, false);
});
