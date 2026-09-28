import { parseArgs } from "node:util";
import type { EventEmitter } from "node:events";
import { rootDir } from "../lib/paths.ts";
import {
  CommandError,
  runAsync,
  startCommand,
  type AsyncCommandRunner,
  type CommandStarter,
  type RunningCommand,
} from "../lib/process.ts";
import { discoverReferenceGames } from "../reference/games.ts";

export class UIUsageError extends Error {
  readonly exitCode = 2;
}
export function uiHelp(): string {
  return `Usage:
  pnpm ui storybook
  pnpm ui dev --game <id>
  pnpm ui test [--game <id>]

Local game URLs accept ?scenario=<id>&at=<checkpoint>&as=<player-id>.
Unfiltered tests run registry installation/Storybook proofs and both actual game browser suites.
`;
}
export async function runUi(
  argv: readonly string[],
  run: AsyncCommandRunner = runAsync,
  start: CommandStarter = startCommand,
  signals: Pick<EventEmitter, "on" | "off"> = process,
): Promise<void> {
  const [command, ...args] = argv;
  if (
    !command ||
    command === "--help" ||
    command === "-h" ||
    args[0] === "--help"
  ) {
    process.stdout.write(uiHelp());
    return;
  }
  if (!["storybook", "dev", "test"].includes(command))
    throw new UIUsageError(`Unknown UI command '${command}'.\n${uiHelp()}`);
  let game: string | undefined;
  try {
    const parsed = parseArgs({
      args: [...args],
      options: command === "storybook" ? {} : { game: { type: "string" } },
      strict: true,
      allowPositionals: false,
    });
    game = parsed.values.game as string | undefined;
  } catch (error) {
    throw new UIUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
  if (command === "dev" && !game)
    throw new UIUsageError("Local development requires --game <id>.");
  const games =
    command === "storybook"
      ? []
      : await discoverReferenceGames({ root: rootDir, gameId: game });
  await run("pnpm", ["--dir", "packages/sdk", "build"], { cwd: rootDir });
  if (command === "storybook") {
    await runLiveUi(
      { args: ["--dir", "registry", "storybook"], cwd: rootDir },
      start,
      signals,
    );
    return;
  }
  if (command === "dev") {
    await runLiveUi(
      { args: ["run", "dev"], cwd: games[0].dir },
      start,
      signals,
    );
    return;
  }
  if (!game) {
    for (const script of [
      "check",
      "smoke",
      "smoke:bound",
      "storybook:build",
      "browser:smoke",
    ]) {
      await run("pnpm", ["--dir", "registry", script], { cwd: rootDir });
    }
  }
  for (const game of games)
    await run("pnpm", ["run", "test:browser"], { cwd: game.dir });
}

async function runLiveUi(
  server: { args: readonly string[]; cwd: string },
  start: CommandStarter,
  signals: Pick<EventEmitter, "on" | "off">,
): Promise<void> {
  const children: RunningCommand[] = [];
  const stopping = new Set<RunningCommand>();
  let interrupted: NodeJS.Signals | undefined;
  const stopChildren = (signal: NodeJS.Signals) => {
    for (const child of children) {
      if (stopping.has(child)) continue;
      stopping.add(child);
      child.stop(signal);
    }
  };
  const interrupt = (signal: NodeJS.Signals) => {
    interrupted = signal;
    stopChildren(signal);
  };
  const onSigint = () => interrupt("SIGINT");
  const onSigterm = () => interrupt("SIGTERM");
  signals.on("SIGINT", onSigint);
  signals.on("SIGTERM", onSigterm);
  try {
    children.push(
      start("pnpm", ["--dir", "packages/sdk", "exec", "tsup", "--watch"], {
        cwd: rootDir,
      }),
    );
    children.push(start("pnpm", server.args, { cwd: server.cwd }));
    const first = await Promise.race(
      children.map((child, index) =>
        child.completed.then(
          () => ({ index }),
          (error: unknown) => ({ index, error }),
        ),
      ),
    );
    if (interrupted) return;
    if ("error" in first) throw first.error;
    throw new CommandError(
      `${first.index === 0 ? "SDK watcher" : "UI server"} exited unexpectedly.`,
    );
  } finally {
    signals.off("SIGINT", onSigint);
    signals.off("SIGTERM", onSigterm);
    stopChildren(interrupted ?? "SIGTERM");
    await Promise.allSettled(children.map((child) => child.completed));
    if (interrupted && signals === process)
      process.exitCode = interrupted === "SIGINT" ? 130 : 143;
  }
}
