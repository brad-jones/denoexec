export class FailedToKillProc extends Error {
  name = "FailedToKillProc";
  runOpts: Deno.RunOptions;
  pid: number;
  stderr: string;

  constructor(
    runOpts: Deno.RunOptions,
    pid: number,
    stderr: string,
  ) {
    super(
      `failed to kill child proc (pid=${pid}):\n\n${
        JSON.stringify(runOpts, null, 4)
      }\n\n---\n${stderr}`,
    );
    this.runOpts = runOpts;
    this.stderr = stderr;
    this.pid = pid;
  }
}
