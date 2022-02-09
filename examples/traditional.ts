import { exec } from "../mod.ts";
import { io } from "../deps.ts";

// EXECUTE ME: deno run --allow-read --allow-write --allow-run ./traditional.ts

// EXAMPLE: 1
// -----------------------------------------------------------------------------
// By default denoexec will stream all STDIO to the parent process,
// ie: inheritStdio = true.
await example("1", async () => {
  const results = await exec({ cmd: ping("1.1.1.1") });

  // By default after the command has executed
  // you can also access the captured output.
  console.log(results.stdout());
  console.log(results.stderr()); // should be empty if the ping worked
  console.log(results.stdioCombined());

  // By now you would have seen the same output 3 times, sorry for the SPAM :)
});

// EXAMPLE: 2
// -----------------------------------------------------------------------------
// Don't want to stream the STDIO but still want to capture the output.
await example("2", async () => {
  const results = await exec({ cmd: ping("1.0.0.1"), inheritStdio: false });
  console.log(results.stdioCombined());
});

// EXAMPLE: 3
// -----------------------------------------------------------------------------
// Don't need to waste memory capturing output.
await example("3", async () => {
  const results = await exec({ cmd: ping("8.8.8.8"), captureStdio: false });
  console.log(results.stdioCombined().length === 0); // this is empty
});

// EXAMPLE: 4
// -----------------------------------------------------------------------------
// If the exit code is all you care about you could also do this.
await example("4", async () => {
  const results = await exec({
    cmd: ping("8.8.4.4"),
    inheritStdio: false,
    captureStdio: false,
  });
  console.log(results.code);
});

// EXAMPLE: 5
// -----------------------------------------------------------------------------
// Want to do something custom with any of the streams, feel free.
// Just keep in mind if you listen to the process's stdout or stderr then
// `denoexec` cannot. As such `inheritStdio` & `captureStdio` are meaningless.
await example("5", async () => {
  const process = exec({ cmd: ping("127.0.0.1") });

  const tmpFile = await Deno.open("./ping-results.txt", {
    create: true,
    write: true,
    truncate: true,
  });

  await io.copy(process.stdout, tmpFile);
  const results = await process;
  tmpFile.close();

  console.log(results.stdout().length === 0); // this is empty
  console.log(Deno.readFileSync("./ping-results.txt").length > 0); // but this is not
});

// EXAMPLE: 6
// -----------------------------------------------------------------------------
// Here is an example of writing something to STDIN
await example("6", async () => {
  const process = exec({ cmd: ["pwsh", "-C", 'echo "$input";'] });
  await process.stdin.write(new TextEncoder().encode("Hello World"));
  process.stdin.close(); // denoexec will do this for you if you don't.
  await process;

  // For convenience you can also supply stdin like this.
  // Or as a Uint8Array, or any Deno.Reader.
  await exec({ cmd: ["pwsh", "-C", 'echo "$input";'], stdin: "Hello Again" });
});

// EXAMPLE: 7
// -----------------------------------------------------------------------------
// Cancelling a spawned process
// HINT: Our kill method has Windows support baked in.
await example("7", async () => {
  const process = exec({ cmd: ping("www.google.com") });
  setTimeout(() => process.kill(), 1000);
  const results6 = await process;
  console.log(results6.killed); // will be true
});

// EXAMPLE: 8
// -----------------------------------------------------------------------------
// Run many commands at once with interleaved output.
await example("8", async () => {
  await Promise.all([
    exec({ cmd: ping("www.facebook.com"), prefix: "facebook" }),
    exec({ cmd: ping("www.google.com"), prefix: "google" }),
  ]);
});

// EXAMPLE: 9
// -----------------------------------------------------------------------------
// Handling common errors, denoexec can be told to throw a NonZeroExitCode
// error in the event the process exits with a non-zero exit code.
await example("9", async () => {
  try {
    await exec({ cmd: ["ping", "--foo", "1.1.1.1"], throwOnNonZeroExit: true });
  } catch (e) {
    console.log(e);
  }
});

// EXAMPLE: 10
// -----------------------------------------------------------------------------
// denoexec can also be told to throw a NonEmptyStdErrBuffer
// error in the event the process generates any stderr output.
await example("10", async () => {
  try {
    await exec({
      cmd: ["pwsh", "-C", "Write-Error 'Oops...';"],
      throwOnStdErr: true,
    });
  } catch (e) {
    console.log(e);
  }
});

// These are just some helpers for this example,
// not necessarily part of the example.

async function example(name: string, func: () => Promise<void>) {
  console.log(
    `EXAMPLE: ${name}\n-----------------------------------------------------------------------------`,
  );
  await func();
  console.log("");
}

function ping(target: string) {
  if (Deno.build.os === "windows") {
    return ["ping", "-n", "4", target];
  }
  return ["ping", "-c", "4", target];
}
