import { spawnSync } from "node:child_process";

export type RunCommandOptions = {
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdio?: "inherit" | "pipe";
};

export type CommandRunner = (
  command: string,
  args: readonly string[],
  options: RunCommandOptions,
) => string;

export const runCommand: CommandRunner = (command, args, options) => {
  const stdio = options.stdio ?? "inherit";
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output =
      stdio === "pipe"
        ? `\n${result.stdout ?? ""}${result.stderr ?? ""}`.trimEnd()
        : "";
    throw new Error(
      `${command} ${args.join(" ")} failed in ${options.cwd} with exit code ${result.status ?? 1}${output}`,
    );
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : "";
};
