import { io } from "../deps.ts";

/** This wraps `Deno.ProcessStatus` and provides some additional data and functionality. */
export class ProcessResults {
  #ps: Deno.ProcessStatus;
  #stdout: io.Buffer;
  #stderr: io.Buffer;
  #combined: io.Buffer;
  #killed: boolean;

  get success() {
    return this.#ps.success;
  }

  get code() {
    return this.#ps.code;
  }

  get signal() {
    return this.#ps.signal;
  }

  get killed() {
    return this.#killed;
  }

  constructor(
    ps: Deno.ProcessStatus,
    stdout: io.Buffer,
    stderr: io.Buffer,
    combined: io.Buffer,
    killed: boolean,
  ) {
    this.#ps = ps;
    this.#stdout = stdout;
    this.#stderr = stderr;
    this.#combined = combined;
    this.#killed = killed;
  }

  stdout(): string;
  stdout(format: "string"): string;
  stdout(format: "bytes"): Uint8Array;
  stdout(format: "string" | "bytes" = "string") {
    switch (format) {
      case "string":
        return new TextDecoder().decode(this.#stdout.bytes());
      case "bytes":
        return this.#stdout.bytes();
      default:
        throw new Error("unexpected format");
    }
  }

  stderr(): string;
  stderr(format: "string"): string;
  stderr(format: "bytes"): Uint8Array;
  stderr(format: "string" | "bytes" = "string") {
    switch (format) {
      case "string":
        return new TextDecoder().decode(this.#stderr.bytes());
      case "bytes":
        return this.#stderr.bytes();
      default:
        throw new Error("unexpected format");
    }
  }

  stdioCombined(): string;
  stdioCombined(format: "string"): string;
  stdioCombined(format: "bytes"): Uint8Array;
  stdioCombined(format: "string" | "bytes" = "string") {
    switch (format) {
      case "string":
        return new TextDecoder().decode(this.#combined.bytes());
      case "bytes":
        return this.#combined.bytes();
      default:
        throw new Error("unexpected format");
    }
  }
}
