#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { build, format, lint, runCoreCheck, test, typecheck } from "./check.ts";
import { CommandError } from "./lib/process.ts";
import { runReferenceCommand } from "./reference/index.ts";
import { verifyRelease } from "./release.ts";

export const rootCommands = [
  "build",
  "check",
  "format",
  "format:check",
  "lint",
  "reference",
  "release:verify",
  "test",
  "typecheck",
  "ui",
] as const;

export type RootCommand = (typeof rootCommands)[number];

export class CliUsageError extends Error {
  readonly exitCode = 2;
}

export type ParsedCli = {
  command?: RootCommand;
  args: string[];
  help: boolean;
};

export function parseCli(argv: readonly string[]): ParsedCli {
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    if (argv.length > 1) throw new CliUsageError(rootHelp());
    return { args: [], help: true };
  }
  const [candidate, ...args] = argv;
  if (!rootCommands.includes(candidate as RootCommand)) {
    throw new CliUsageError(`Unknown command '${candidate}'.\n\n${rootHelp()}`);
  }
  return { command: candidate as RootCommand, args, help: false };
}

function requireNoArgs(command: RootCommand, args: readonly string[]): void {
  if (args.length > 0) {
    throw new CliUsageError(`${command} accepts no arguments.`);
  }
}

function parseReferenceArgs(args: readonly string[]): readonly string[] | null {
  if (args.length === 1 && ["--help", "-h"].includes(args[0] ?? "")) {
    process.stdout.write("Usage: pnpm reference [game-id]\n");
    return null;
  }
  if (args.some((argument) => argument.startsWith("-")) || args.length > 1) {
    throw new CliUsageError("Usage: pnpm reference [game-id]");
  }
  return args;
}

export async function runCli(argv: readonly string[]): Promise<void> {
  const parsed = parseCli(argv.filter((argument) => argument !== "--"));
  if (parsed.help || !parsed.command) {
    process.stdout.write(rootHelp());
    return;
  }
  switch (parsed.command) {
    case "build":
      requireNoArgs(parsed.command, parsed.args);
      build();
      return;
    case "check":
      requireNoArgs(parsed.command, parsed.args);
      await runCoreCheck();
      return;
    case "format":
      requireNoArgs(parsed.command, parsed.args);
      format(true);
      return;
    case "format:check":
      requireNoArgs(parsed.command, parsed.args);
      format(false);
      return;
    case "lint":
      requireNoArgs(parsed.command, parsed.args);
      lint();
      return;
    case "reference": {
      const args = parseReferenceArgs(parsed.args);
      if (args) await runReferenceCommand(args);
      return;
    }
    case "release:verify": {
      requireNoArgs(parsed.command, parsed.args);
      const candidate = await verifyRelease();
      console.log(
        `Verified ${candidate.package.name}@${candidate.package.version} at build/release/candidate.`,
      );
      return;
    }
    case "test":
      requireNoArgs(parsed.command, parsed.args);
      build();
      await test();
      return;
    case "typecheck":
      requireNoArgs(parsed.command, parsed.args);
      build();
      typecheck();
      return;
    case "ui": {
      const { runUi } = await import("./ui/index.ts");
      await runUi(parsed.args);
      return;
    }
  }
}

export function rootHelp(): string {
  return `Dreamboard SDK repository tooling

Usage: pnpm <command> [options]

Commands:
  build                         Build the public SDK and non-published inputs
  check                         Run the browser-free clean-checkout gate
  format                        Format maintained files
  format:check                  Check formatting without writing
  lint                          Run workspace lint checks
  reference [game-id]           Verify one or all packed reference games
  release:verify                Build the immutable release candidate
  test                          Run browser-free unit tests
  typecheck                     Type-check packages and repository scripts
  ui <storybook|dev|test> [--game <id>]
                                 Run the SDK UI product tooling
`;
}

export function errorExitCode(error: unknown): number {
  if (error instanceof CommandError) return 1;
  if (
    error instanceof CliUsageError ||
    (typeof error === "object" &&
      error !== null &&
      "exitCode" in error &&
      (error as { exitCode?: unknown }).exitCode === 2)
  ) {
    return 2;
  }
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = errorExitCode(error);
  });
}
