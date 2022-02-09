import {
  $,
  _,
  captureStdio,
  inheritStdio,
  prefix,
  throwOnNonZeroExit,
} from "../mod.ts";

// EXECUTE ME: deno run --allow-read --allow-write --allow-run --allow-env ./functional.ts

// Setting this env var will log the generated command array
// created by parsing a string template literal.
Deno.env.set("DENOEXEC_STRING_LITERAL_DEBUG", "1");

// EXAMPLE: 1
// -----------------------------------------------------------------------------
// The most basic example using the tagged template literal function.
await example("1", async () => {
  await _`ping ${pingCountFlag()} 1 8.8.8.8`;
});

// EXAMPLE: 2
// -----------------------------------------------------------------------------
// The exact same thing as example 1 but building the command array manually.
// Due to the extra complexities of parsing a string into an array of arguments,
// especially around quoting, it's suggested you revert back to explicitly
// defining the array (provided as variadic arguments) like this example.
await example("2", async () => {
  await _("ping", pingCountFlag(), "1", "8.8.8.8");
});

// EXAMPLE: 3
// -----------------------------------------------------------------------------
// Capturing the output instead of streaming to the current console.
// You can think of the `$()` function as analogous with bash command
// substitution or a sub shell.
//
// https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html#Command-Substitution
await example("3", async () => {
  const results = await $(_`ping ${pingCountFlag()} 1 8.8.8.8`);
  console.log("the ping output", results);

  // the above is equivalent to
  const cmd = _`ping ${pingCountFlag()} 1 8.8.8.8`;
  const results2 = await captureStdio(true, inheritStdio(false, cmd));
  console.log("the ping output again", results2.stdioCombined());
});

// EXAMPLE: 4
// -----------------------------------------------------------------------------
// An example of a string literal with a dynamic argument.
await example("4", async () => {
  const ip = "8.8.4.4";
  await _`ping ${pingCountFlag()} 1 ${ip}`;
});

// EXAMPLE: 5
// -----------------------------------------------------------------------------
// An example of a string literal with a partially dynamic argument.
await example("5", async () => {
  const ipPartial = "1.1";
  await _`ping ${pingCountFlag()} 1 1.1.${ipPartial}`;
});

// EXAMPLE: 6
// -----------------------------------------------------------------------------
// An alternative to using the purely functional functional API you may choose
// to modify the returned object directly.
await example("6", async () => {
  const ping = _`ping ${pingCountFlag()} 1 8.8.8.8`;
  ping.prefix = "dns";
  await ping;

  // the above is equivalent to
  await prefix("dns", _`ping ${pingCountFlag()} 1 8.8.8.8`);
});

// EXAMPLE: 7
// -----------------------------------------------------------------------------
// While we totally expect the following ping commands to fail due to the
// non-existent hostname, this example is here to demonstrate how arguments
// are parsed with using string literals. Play close attention to the debug
// output of the `Parsed Command Array`.
await example("7", async () => {
  const domain = "example.com";

  // this will fail because it produces the wrong argument array
  await throwOnNonZeroExit(
    false,
    _`ping ${pingCountFlag()} 1 hostname with spaces.${domain}`,
  );

  // assuming such a host name actually existed this would succeed
  // as it produces the correct arguments to pass to the ping command
  await throwOnNonZeroExit(
    false,
    _`ping ${pingCountFlag()} 1 ${"hostname with spaces." + domain}`,
  );
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

function pingCountFlag() {
  if (Deno.build.os === "windows") {
    return "-n";
  }
  return "-c";
}
