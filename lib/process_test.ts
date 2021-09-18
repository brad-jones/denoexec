import { io, testing } from "../deps.ts";
import { exec } from "./process.ts";
import { ExecutableNotFound } from "./errors/executable_not_found.ts";
import { NonEmptyStderrBuffer } from "./errors/non_empty_stderr_buffer.ts";
import { NonZeroExitCode } from "./errors/non_zero_exit_code.ts";

Deno.test("default", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    stdout,
    stderr,
  });

  testing.assertStrictEquals(results.code, 0);
  testing.assertStrictEquals(results.killed, false);
  testing.assertStrictEquals(results.signal, undefined);
  testing.assertStrictEquals(results.success, true);
  testing.assert(results.stdout("bytes").length > 0);
  testing.assertStrictEquals(results.stderr("bytes").length, 0);
  testing.assertEquals(results.stdout("bytes"), results.stdioCombined("bytes"));
  testing.assertEquals(results.stdout("bytes"), stdout.bytes());
  testing.assertEquals(results.stderr("bytes"), stderr.bytes());
  testing.assertStringIncludes(
    results.stdout("string"),
    `deno ${Deno.version.deno}`,
  );
  testing.assertStringIncludes(
    results.stdout("string"),
    `v8 ${Deno.version.v8}`,
  );
  testing.assertStringIncludes(
    results.stdout("string"),
    `typescript ${Deno.version.typescript}`,
  );
});

Deno.test("inheritStdio=false", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    inheritStdio: false,
    stdout,
    stderr,
  });

  testing.assert(results.stdout("bytes").length > 0);
  testing.assertStrictEquals(stdout.bytes().length, 0);
});

Deno.test("captureStdio=false", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  const results = await exec({
    cmd: [Deno.execPath(), "--version"],
    captureStdio: false,
    stdout,
    stderr,
  });

  testing.assert(stdout.bytes().length > 0);
  testing.assertStrictEquals(results.stdout("bytes").length, 0);
});

Deno.test("prefix", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

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
    testing.assert(
      line.startsWith("abc | "),
      `line="${line}", expected to start with "abc | "`,
    );
  }
});

Deno.test("stdin", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

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

    testing.assertStrictEquals(
      new TextDecoder().decode(stdout.bytes()),
      "STDIN: Hello World\n",
    );
  } finally {
    await Deno.remove(tmpScript);
  }
});

Deno.test("kill", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

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
  testing.assertStrictEquals(results.killed, true);
});

Deno.test("throwOnExecutableNotFound", async () => {
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  await testing.assertThrowsAsync(
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
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  await testing.assertThrowsAsync(
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
  const stdout = new io.Buffer();
  const stderr = new io.Buffer();

  await testing.assertThrowsAsync(
    () =>
      exec({
        cmd: [Deno.execPath(), "foobar"],
        throwOnStdErr: true,
        throwOnNonZeroExit: false,
        stdout,
        stderr,
      }),
    NonEmptyStderrBuffer,
  );
});
