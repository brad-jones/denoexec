import { ProcessDeferred } from "./process_deferred.ts";

/**
 * `_` is a short cut for `exec({ cmds: [...args] })`.
 *
 * This returns a `ProcessDeferred` object, which does absolutely nothing until
 * it is awaited. This allows you to modify the `ProcessDeferred` instance with
 * the rest of the functional API. And then finally execute the configured child
 * process and await it's results.
 *
 * Example Usage:
 *
 * ```ts
 * await _("ping", "-c", "4", "1.1.1.1"); // streams the io to your console
 * ```
 *
 * Alternatively use as a template literal tag function.
 *
 * Example Usage:
 *
 * ```ts
 * const ip = '1.1.1.1';
 * await _`ping -c 4 ${ip}`;
 * ```
 *
 * > TIP: If you ever struggle with argument quoting, we suggest avoiding the
 * >      tagged template literal function and simply supplying an array of
 * >      strings, this avoids all confusion & the complexities of parsing a
 * >      template literal into a command array. It is only provided as a
 * >      convenience for simple cases.
 */
export function _(
  strings: TemplateStringsArray,
  ...values: string[]
): ProcessDeferred;
export function _(...args: string[]): ProcessDeferred;
export function _(...args: unknown[]): ProcessDeferred {
  if (Array.isArray(args[0])) {
    const strings = args[0] as unknown as TemplateStringsArray;
    const values = args.slice(1) as string[];
    const cmd = parseStringLiteral(strings, ...values);
    if (typeof Deno.env.get("DENOEXEC_STRING_LITERAL_DEBUG") === "string") {
      console.log("Parsed Command Array", cmd);
    }
    return new ProcessDeferred({ cmd });
  }

  return new ProcessDeferred({ cmd: args as string[] });
}

/**
 * credit: https://github.com/Minigugus/bazx/blob/95c104e8ade296f8e64343074415baae6291429d/src/mod.ts#L78-L100
 */
export function parseStringLiteral(
  xs: TemplateStringsArray,
  ...args: unknown[]
) {
  if (!Array.isArray(xs) || !Array.isArray(xs.raw)) {
    throw new Error("$ can only be used as a template string tag");
  }
  const cmd: string[] = [];
  let left = "";
  let i = 0;
  for (let part of xs) {
    for (
      let index;
      (index = part.indexOf(" ")) !== -1;
      part = part.slice(index + 1)
    ) {
      left += part.slice(0, index);
      if (left) cmd.push(left);
      left = "";
    }
    left += part;
    left += i === args.length ? "" : args[i++];
  }
  if (left) cmd.push(left);
  if (cmd.length < 1) throw new Error("Missing command name");
  return cmd as [string, ...string[]];
}

/**
 * `$` emulates a sub shell, essentially it sets `inheritStdio` to `false` &
 * `captureStdio` to `true` and then returns the result of `stdioCombined()`.
 *
 * Example Usage:
 *
 * ```ts
 * const branch = await $(_`git rev-parse --abbrev-ref HEAD`);
 * ```
 *
 * Also accepts a string template literal directly:
 *
 * ```ts
 * const branch = await $`git rev-parse --abbrev-ref HEAD`;
 * ```
 *
 * Or an list of arguments:
 *
 * ```ts
 * const branch = await $("git", "rev-parse", "--abbrev-ref", "HEAD");
 * ```
 */
export async function $(...args: string[]): Promise<string>;
export async function $(proc: ProcessDeferred): Promise<string>;
export async function $(
  strings: TemplateStringsArray,
  ...values: string[]
): Promise<string>;
export async function $(...args: unknown[]): Promise<string> {
  let proc: ProcessDeferred;

  if (args[0] instanceof ProcessDeferred) {
    proc = args[0];
  } else {
    if (Array.isArray(args[0])) {
      const strings = args[0] as unknown as TemplateStringsArray;
      const values = args.slice(1) as string[];
      proc = _(strings, ...values);
    } else {
      proc = _(...args as string[]);
    }
  }

  proc.inheritStdio = false;
  proc.captureStdio = true;

  return (await proc).stdioCombined();
}

/** Set a custom current working directory for the child process. */
export function cwd(v: string, proc: ProcessDeferred): ProcessDeferred {
  proc.cwd = v;
  return proc;
}

/** Set a custom environment for the child process. */
export function env(
  v: Record<string, string>,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.env = v;
  return proc;
}

/** Send data to the child process via the STDIN stream. */
export function stdin(
  v: string | Uint8Array | Deno.Reader,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.stdin = v;
  return proc;
}

/** Provide an alternative Writer for the STDOUT stream. */
export function stdout(v: Deno.Writer, proc: ProcessDeferred): ProcessDeferred {
  proc.stdout = v;
  return proc;
}

/** Provide an alternative Writer for the STDERR stream. */
export function stderr(v: Deno.Writer, proc: ProcessDeferred): ProcessDeferred {
  proc.stderr = v;
  return proc;
}

/** If `inheritStdio=true` & a value is provided here, each line of output will be prefixed with this value. */
export function prefix(v: string, proc: ProcessDeferred): ProcessDeferred {
  proc.prefix = v;
  return proc;
}

/** If `prefix` is set then this will be suffixed on to the prefix. Defaults to ` | `. */
export function prefixSeparator(
  v: string,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.prefixSeparator = v;
  return proc;
}

/** If set to `true`, the default; then output from STDOUT & STDERR will be captured into buffers for later use. */
export function captureStdio(
  v: boolean,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.captureStdio = v;
  return proc;
}

/** If set to `true`, the default; then output from STDOUT & STDERR will be copied on to the Writers set by `stdout` & `stderr`. */
export function inheritStdio(
  v: boolean,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.inheritStdio = v;
  return proc;
}

/** If set to `true` then a `NonZeroExitCode` error will be thrown when the process exists with a non-zero exit code. */
export function throwOnNonZeroExit(
  v: boolean,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.throwOnNonZeroExit = v;
  return proc;
}

/** If set to `true` then a `NonEmptyStderrBuffer` error will be thrown when the stderr buffer contains data. */
export function throwOnStdErr(
  v: boolean,
  proc: ProcessDeferred,
): ProcessDeferred {
  proc.throwOnStdErr = v;
  return proc;
}
