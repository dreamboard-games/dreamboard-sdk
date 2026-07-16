import { spawnSync } from "node:child_process";

export type RunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  capture?: boolean;
  quiet?: boolean;
};

export class CommandError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CommandError";
    this.exitCode = exitCode;
  }
}

export function run(
  command: string,
  args: readonly string[],
  options: RunOptions = {},
): string {
  const capture = options.capture === true;
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    stdio: capture || options.quiet ? "pipe" : "inherit",
  });
  if (result.error) {
    throw new CommandError(
      `Unable to run ${formatCommand(command, args)}: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr]
      .filter((value): value is string => Boolean(value?.trim()))
      .join("\n")
      .trim();
    throw new CommandError(
      `${formatCommand(command, args)} failed with exit code ${result.status ?? 1}${detail ? `\n${detail}` : ""}`,
      result.status ?? 1,
    );
  }
  return typeof result.stdout === "string" ? result.stdout : "";
}

export function formatCommand(
  command: string,
  args: readonly string[],
): string {
  return [command, ...args]
    .map((part) =>
      /^[A-Za-z0-9_./:@=-]+$/.test(part) ? part : JSON.stringify(part),
    )
    .join(" ");
}
