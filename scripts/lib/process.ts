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

export type RunningCommand = {
  completed: Promise<void>;
  stop(signal?: NodeJS.Signals): void;
};

export type CommandStarter = (
  command: string,
  args: readonly string[],
  options?: RunOptions,
) => RunningCommand;

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

/** Long-lived commands own a process group so stopping pnpm also stops its child server. */
export const startCommand: CommandStarter = (command, args, options = {}) => {
  const child = spawn(command, [...args], {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  let settled = false;
  let stopped = false;
  const completed = new Promise<void>((resolve, reject) => {
    child.once("error", (error) => {
      settled = true;
      reject(
        new CommandError(
          `Unable to run ${formatCommand(command, args)}: ${error.message}`,
        ),
      );
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      if (code === 0) resolve();
      else
        reject(
          new CommandError(
            `${formatCommand(command, args)} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 1}`}`,
            code ?? 1,
          ),
        );
    });
  });
  return {
    completed,
    stop(signal = "SIGTERM") {
      if (stopped || child.pid === undefined) return;
      stopped = true;
      try {
        if (process.platform === "win32")
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
          });
        else process.kill(-child.pid, signal);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    },
  };
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
