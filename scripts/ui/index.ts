import { parseArgs } from "node:util";
import { rootDir } from "../lib/paths.ts";
import { runAsync, type AsyncCommandRunner } from "../lib/process.ts";
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
    await run("pnpm", ["--dir", "registry", "storybook"], { cwd: rootDir });
    return;
  }
  if (command === "dev") {
    await run("pnpm", ["run", "dev"], { cwd: games[0]!.dir });
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
