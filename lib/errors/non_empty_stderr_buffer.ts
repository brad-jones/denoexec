export class NonEmptyStderrBuffer extends Error {
  name = "NonEmptyStderrBuffer";
  runOpts: Deno.RunOptions;
  stderr: string;

  constructor(
    runOpts: Deno.RunOptions,
    stderr: string,
  ) {
    super(
      `child proc did not produce an empty stderr buffer:\n\n${
        JSON.stringify(runOpts, null, 4)
      }\n\n---\n${stderr}`,
    );
    this.runOpts = runOpts;
    this.stderr = stderr;
  }
}
