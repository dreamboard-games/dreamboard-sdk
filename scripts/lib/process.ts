import { spawn, spawnSync } from "node:child_process";

export type RunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  capture?: boolean;
  quiet?: boolean;
};

export type AsyncCommandRunner = (
  command: string,
  args: readonly string[],
  options?: RunOptions,
) => Promise<string>;

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

export const runAsync: AsyncCommandRunner = (command, args, options = {}) => {
  const capture = options.capture === true || options.quiet === true;
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      settled = true;
      reject(
        new CommandError(
          `Unable to run ${formatCommand(command, args)}: ${error.message}`,
        ),
      );
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      if (code === 0) {
        resolve(stdout);
        return;
      }
      const detail = [stdout, stderr]
        .filter((value) => Boolean(value.trim()))
        .join("\n")
        .trim();
      reject(
        new CommandError(
          `${formatCommand(command, args)} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 1}`}${detail ? `\n${detail}` : ""}`,
          code ?? 1,
        ),
      );
    });
  });
};

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
