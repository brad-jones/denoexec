export class ExecutableNotFound extends Error {
  name = "ExecutableNotFound";
  innerError: Error;
  cmd: string;

  constructor(cmd: string, innerError: Error) {
    super(`executable not found: ${cmd}`);
    this.innerError = innerError;
    this.cmd = cmd;
  }
}
