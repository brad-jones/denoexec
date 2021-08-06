export class NonZeroExitCode extends Error {
  name = "NonZeroExitCode";
  runOpts: Deno.RunOptions;
  status: Deno.ProcessStatus;
  stderr: string;

  constructor(
    runOpts: Deno.RunOptions,
    status: Deno.ProcessStatus,
    stderr: string,
  ) {
    super(
      `child proc did not exit with a zero exit code:\n\n${
        JSON.stringify(runOpts, null, 4)
      }\n\n---\n${stderr}`,
    );
    this.runOpts = runOpts;
    this.status = status;
    this.stderr = stderr;
  }
}
