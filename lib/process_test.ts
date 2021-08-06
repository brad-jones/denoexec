import { exec } from "./process.ts";
import { ExecutableNotFound } from "./errors/executable_not_found.ts";
import { NonEmptyStderrBuffer } from "./errors/non_empty_stderr_buffer.ts";
import { NonZeroExitCode } from "./errors/non_zero_exit_code.ts";
import { Buffer } from "https://deno.land/std@0.103.0/io/mod.ts";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertStringIncludes,
  assertThrowsAsync,
} from "https://deno.land/std@0.103.0/testing/asserts.ts";

Deno.test("default", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    stdout,
    stderr,
  });

  assertStrictEquals(results.code, 0);
  assertStrictEquals(results.killed, false);
  assertStrictEquals(results.signal, undefined);
  assertStrictEquals(results.success, true);
  assert(results.stdout("bytes").length > 0);
  assertStrictEquals(results.stderr("bytes").length, 0);
  assertEquals(results.stdout("bytes"), results.stdioCombined("bytes"));
  assertEquals(results.stdout("bytes"), stdout.bytes());
  assertEquals(results.stderr("bytes"), stderr.bytes());
  assertStringIncludes(results.stdout("string"), `deno ${Deno.version.deno}`);
  assertStringIncludes(results.stdout("string"), `v8 ${Deno.version.v8}`);
  assertStringIncludes(
    results.stdout("string"),
    `typescript ${Deno.version.typescript}`,
  );
});

Deno.test("inheritStdio=false", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    inheritStdio: false,
    stdout,
    stderr,
  });

  assert(results.stdout("bytes").length > 0);
  assertStrictEquals(stdout.bytes().length, 0);
});

Deno.test("captureStdio=false", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    captureStdio: false,
    stdout,
    stderr,
  });

  assert(stdout.bytes().length > 0);
  assertStrictEquals(results.stdout("bytes").length, 0);
});

Deno.test("prefix", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  await exec({
    cmd: [Deno.execPath(), "--version"],
    prefix: "abc",
    prefixSeparator: " | ",
    stdout,
    stderr,
  });

  const lines = new TextDecoder().decode(stdout.bytes())
    .split("\n")
    .filter((_) => _.length > 0);

  for (const line of lines) {
    assert(
      line.startsWith("abc | "),
      `line="${line}", expected to start with "abc | "`,
    );
  }
});

Deno.test("stdin", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const tmpScript = await Deno.makeTempFile({
    prefix: "denoexec",
    suffix: ".ts",
  });
  await Deno.writeTextFile(
    tmpScript,
    `
      import { copy, Buffer } from "https://deno.land/std@0.103.0/io/mod.ts";
      const buf = new Buffer();
      await copy(Deno.stdin, buf);
      const input = new TextDecoder().decode(buf.bytes());
      console.log('STDIN: ' + input);
    `,
  );

  try {
    await exec({
      cmd: [Deno.execPath(), "run", tmpScript],
      stdin: "Hello World",
      stdout,
      stderr,
    });

    assertStrictEquals(
      new TextDecoder().decode(stdout.bytes()),
      "STDIN: Hello World\n",
    );
  } finally {
    await Deno.remove(tmpScript);
  }
});

Deno.test("kill", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  function ping(target: string) {
    if (Deno.build.os === "windows") {
      return ["ping", "-n", "4", target];
    }
    return ["ping", "-c", "4", target];
  }

  const process = exec({
    cmd: ping("127.0.0.1"),
    stdout,
    stderr,
  });

  setTimeout(() => process.kill(), 1000);

  const results = await process;
  assertStrictEquals(results.killed, true);
});

Deno.test("throwOnExecutableNotFound", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  await assertThrowsAsync(
    () =>
      exec({
        cmd: ["foobar", "--version"],
        throwOnNonZeroExit: true,
        stdout,
        stderr,
      }),
    ExecutableNotFound,
  );
});

Deno.test("throwOnNonZeroExit", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  await assertThrowsAsync(
    () =>
      exec({
        cmd: [Deno.execPath(), "foobar"],
        throwOnNonZeroExit: true,
        stdout,
        stderr,
      }),
    NonZeroExitCode,
  );
});

Deno.test("throwOnStdErr", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  await assertThrowsAsync(
    () =>
      exec({
        cmd: [Deno.execPath(), "foobar"],
        throwOnStdErr: true,
        stdout,
        stderr,
      }),
    NonEmptyStderrBuffer,
  );
});
