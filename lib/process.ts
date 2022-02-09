import { io, streams } from "../deps.ts";
import { ExecutableNotFound } from "./errors/executable_not_found.ts";
import { FailedToKillProc } from "./errors/failed_to_kill_proc.ts";
import { NonEmptyStderrBuffer } from "./errors/non_empty_stderr_buffer.ts";
import { NonZeroExitCode } from "./errors/non_zero_exit_code.ts";
import { ProcessResults } from "./process_results.ts";

/**
 * This is the primary export of the `denoexec` module
 * & a factory method for a new `Process` instance.
 *
 * See detailed usage examples at:
 * <https://github.com/brad-jones/denoexec/blob/master/example/main.ts>
 */
export function exec(opts: ProcessOptions): Process {
  return new Process(opts);
}

export interface ProcessOptions {
  /** The first element is the process to execute followed by it's arguments. */
  cmd: string[];

  /** Set a custom current working directory for the child process. */
  cwd?: string;

  /** Set a custom environment for the child process. */
  env?: Record<string, string>;

  /** Send data to the child process via the STDIN stream. */
  stdin?: string | Uint8Array | Deno.Reader;

  /** Provide an alternative Writer for the STDOUT stream. */
  stdout?: Deno.Writer;

  /** Provide an alternative Writer for the STDERR stream. */
  stderr?: Deno.Writer;

  /** If `inheritStdio=true` & a value is provided here, each line of output will be prefixed with this value. */
  prefix?: string;

  /** If `prefix` is set then this will be suffixed on to the prefix. Defaults to ` | `. */
  prefixSeparator?: string;

  /** If set to `true`, the default; then output from STDOUT & STDERR will be captured into buffers for later use. */
  captureStdio?: boolean;

  /** If set to `true`, the default; then output from STDOUT & STDERR will be copied on to the Writers set by `stdout` & `stderr`. */
  inheritStdio?: boolean;

  /** If set to `true` then a `NonZeroExitCode` error will be thrown when the process exists with a non-zero exit code. */
  throwOnNonZeroExit?: boolean;

  /** If set to `true` then a `NonEmptyStderrBuffer` error will be thrown when the stderr buffer contains data. */
  throwOnStdErr?: boolean;
}

/**
 * This looks like an initiated `Deno.Process<Deno.RunOptions>` object as well
 * as a `Promise<ProcessResults>` object at the same time.
 *
 * It implements both interfaces.
 *
 * Ported from <https://github.com/brad-jones/dexeca/blob/master/lib/src/process.dart>
 * which in turn was originally inspired by <https://github.com/sindresorhus/execa>.
 */
export class Process
  implements Deno.Process<Deno.RunOptions>, Promise<ProcessResults> {
  #pOpts: Deno.RunOptions;
  #p: Deno.Process<Deno.RunOptions>;

  #killing = false;
  #killed = false;

  #futureFactory: () => Promise<ProcessResults>;
  #future: Promise<ProcessResults> | undefined;
  get #futureGetter() {
    if (typeof this.#future === "undefined") {
      this.#future = this.#futureFactory();
    }
    return this.#future;
  }

  get [Symbol.toStringTag]() {
    return "Process";
  }

  get rid() {
    return this.#p.rid;
  }

  get pid() {
    return this.#p.pid;
  }

  get stdin() {
    return this.#p.stdin!;
  }

  get stdout() {
    return this.#p.stdout!;
  }

  get stderr() {
    return this.#p.stderr!;
  }

  constructor({
    cmd,
    cwd,
    env,
    stdin,
    stdout = Deno.stdout,
    stderr = Deno.stderr,
    prefix,
    prefixSeparator = " | ",
    captureStdio = true,
    inheritStdio = true,
    throwOnNonZeroExit = true,
    throwOnStdErr = false,
  }: ProcessOptions) {
    this.#pOpts = {
      cmd,
      cwd,
      env,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    };

    try {
      this.#p = Deno.run(this.#pOpts);
    } catch (e) {
      if (e?.name === "NotFound") {
        throw new ExecutableNotFound(cmd[0], e);
      }
      throw e;
    }

    prefix = prefix === "" || typeof prefix === "undefined"
      ? ""
      : `${prefix}${prefixSeparator}`;

    this.#futureFactory = async () => {
      const combinedBuffer = new io.Buffer();
      const stdoutBuffer = new io.Buffer();
      const stderrBuffer = new io.Buffer();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const reader = async (
        r: Deno.Reader & Deno.Closer,
        w: Deno.Writer,
        b: io.Buffer,
      ) => {
        try {
          if (prefix === "") {
            for await (const chunk of streams.iterateReader(r)) {
              const jobs = [];
              if (inheritStdio) {
                jobs.push(w.write(chunk));
              }
              if (captureStdio) {
                jobs.push(b.write(chunk));
                jobs.push(combinedBuffer.write(chunk));
              }
              await Promise.all(jobs);
            }
          } else {
            for await (const line of io.readLines(r)) {
              const jobs = [];
              if (inheritStdio) {
                jobs.push(w.write(encoder.encode(`${prefix}${line}\n`)));
              }
              if (captureStdio) {
                const newLine = encoder.encode(`${line}\n`);
                jobs.push(b.write(newLine));
                jobs.push(combinedBuffer.write(newLine));
              }
              await Promise.all(jobs);
            }
          }
          r.close();
        } catch (e) {
          if (!(e instanceof Error) || e.message !== "Bad resource ID") {
            throw e;
          }
        }
      };

      try {
        if (typeof stdin !== "undefined") {
          if (typeof stdin === "string") {
            stdin = encoder.encode(stdin);
          }
          if (stdin instanceof Uint8Array) {
            stdin = new io.Buffer(stdin);
          }
          await streams.copy(stdin, this.stdin);
        }

        try {
          this.stdin.close();
        } catch (e) {
          if (!(e instanceof Error) || e.message !== "Bad resource ID") {
            throw e;
          }
        }

        if (captureStdio || inheritStdio) {
          await Promise.all([
            reader(this.stdout, stdout, stdoutBuffer),
            reader(this.stderr, stderr, stderrBuffer),
          ]);
        }

        const status = await this.#p.status();

        // If someone has killed or is killing a process they will be expecting
        // to check the killed property on the ProcessResults so we don't
        // consider a non-zero exit code in this case to be exceptional.
        if (this.#killed !== true && this.#killing !== true) {
          if (throwOnNonZeroExit && status.code !== 0) {
            throw new NonZeroExitCode(
              this.#pOpts,
              status,
              decoder.decode(
                // some poorly written processes send error messages to stdout
                stderrBuffer.length === 0
                  ? stdoutBuffer.bytes()
                  : stderrBuffer.bytes(),
              ),
            );
          }
        }

        if (throwOnStdErr && stderrBuffer.length > 0) {
          throw new NonEmptyStderrBuffer(
            this.#pOpts,
            decoder.decode(stderrBuffer.bytes()),
          );
        }

        while (this.#killing) {
          await new Promise((r) => setTimeout(r, 1));
        }

        return new ProcessResults(
          status,
          stdoutBuffer,
          stderrBuffer,
          combinedBuffer,
          this.#killed,
        );
      } finally {
        this.close();
      }
    };
  }

  status() {
    return this.#p.status();
  }

  output() {
    return this.#p.output();
  }

  stderrOutput() {
    return this.#p.stderrOutput();
  }

  close() {
    this.#p.close();
  }

  /**
   * **UNSTABLE**: The `signo` argument may change to require the `Deno.Signal`
   * enum.
   *
   * `signo` is only used on Linux & MacOS and totally ignored by Windows.
   * This version of `kill` supports Windows by shelling out to `taskkill`.
   */
  async kill(signo: Deno.Signal = "SIGKILL") {
    this.#killing = true;

    if (Deno.build.os === "windows") {
      const p = Deno.run({
        cmd: ["taskkill", "/F", "/pid", this.#p.pid.toString()],
        stdin: "null",
        stdout: "null",
        stderr: "piped",
      });

      const [status, stderr] = await Promise.all([
        p.status(),
        p.stderrOutput(),
      ]);

      p.close();

      if (!status.success || stderr.length > 0) {
        throw new FailedToKillProc(
          this.#pOpts,
          this.#p.pid,
          new TextDecoder().decode(stderr),
        );
      }
    } else {
      this.#p.kill(signo);
    }

    this.#killed = true;
    this.#killing = false;
  }

  then<TResult1 = ProcessResults, TResult2 = never>(
    onfulfilled?:
      | ((value: ProcessResults) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      // deno-lint-ignore no-explicit-any
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.#futureGetter.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      // deno-lint-ignore no-explicit-any
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<ProcessResults | TResult> {
    return this.#futureGetter.catch(onrejected);
  }

  finally(
    onfinally?: (() => void) | undefined | null,
  ): Promise<ProcessResults> {
    return this.#futureGetter.finally(onfinally);
  }
}
