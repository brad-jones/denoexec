import { Process, ProcessOptions } from "./process.ts";
import { ProcessResults } from "./process_results.ts";

/**
 * This is designed for use with the functional api.
 */
export class ProcessDeferred
  implements ProcessOptions, Promise<ProcessResults> {
  #opts: ProcessOptions;

  #futureFactory: () => Promise<ProcessResults>;
  #future: Promise<ProcessResults> | undefined;
  get #futureGetter() {
    if (typeof this.#future === "undefined") {
      this.#future = this.#futureFactory();
    }
    return this.#future;
  }

  get [Symbol.toStringTag]() {
    return "ProcessDeferred";
  }

  get cmd() {
    return this.#opts.cmd;
  }
  set cmd(v: string[]) {
    this.#opts.cmd = v;
  }

  get cwd() {
    return this.#opts.cwd;
  }
  set cwd(v: string | undefined) {
    this.#opts.cwd = v;
  }

  get env() {
    return this.#opts.env;
  }
  set env(v: Record<string, string> | undefined) {
    this.#opts.env = v;
  }

  get stdin() {
    return this.#opts.stdin;
  }
  set stdin(v: string | Uint8Array | Deno.Reader | undefined) {
    this.#opts.stdin = v;
  }

  get stdout() {
    return this.#opts.stdout;
  }
  set stdout(v: Deno.Writer | undefined) {
    this.#opts.stdout = v;
  }

  get stderr() {
    return this.#opts.stderr;
  }
  set stderr(v: Deno.Writer | undefined) {
    this.#opts.stderr = v;
  }

  get prefix() {
    return this.#opts.prefix;
  }
  set prefix(v: string | undefined) {
    this.#opts.prefix = v;
  }

  get prefixSeparator() {
    return this.#opts.prefixSeparator;
  }
  set prefixSeparator(v: string | undefined) {
    this.#opts.prefixSeparator = v;
  }

  get captureStdio() {
    return this.#opts.captureStdio;
  }
  set captureStdio(v: boolean | undefined) {
    this.#opts.captureStdio = v;
  }

  get inheritStdio() {
    return this.#opts.inheritStdio;
  }
  set inheritStdio(v: boolean | undefined) {
    this.#opts.inheritStdio = v;
  }

  get throwOnNonZeroExit() {
    return this.#opts.throwOnNonZeroExit;
  }
  set throwOnNonZeroExit(v: boolean | undefined) {
    this.#opts.throwOnNonZeroExit = v;
  }

  get throwOnStdErr() {
    return this.#opts.throwOnStdErr;
  }
  set throwOnStdErr(v: boolean | undefined) {
    this.#opts.throwOnStdErr = v;
  }

  constructor(opts: ProcessOptions) {
    this.#opts = opts;
    this.#futureFactory = () => {
      return new Process(this.#opts);
    };
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
