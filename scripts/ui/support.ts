import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  lstat,
  readFile,
  readdir,
  stat,
  writeFile,
  rename,
} from "node:fs/promises";
import path from "node:path";

export const root = path.resolve(import.meta.dirname, "../..");
export const referenceGamesRoot = path.join(root, "examples/reference-games");

export interface ReferenceGameSummary {
  readonly id: string;
  readonly displayName: string;
  readonly mechanics: readonly string[];
  readonly uiPatterns: readonly string[];
}

export function compareCanonicalStrings(left: string, right: string): number {
  return left === right ? 0 : left < right ? -1 : 1;
}

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return false;
    throw error;
  }
}

export async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeJson(
  filePath: string,
  value: unknown,
): Promise<void> {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, filePath);
}

export async function sha256File(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

export async function discoverReferenceGames(): Promise<
  readonly ReferenceGameSummary[]
> {
  const candidates = (
    await readdir(referenceGamesRoot, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(compareCanonicalStrings);
  const directories: string[] = [];
  for (const candidate of candidates) {
    if (
      await pathExists(
        path.join(referenceGamesRoot, candidate, "reference-game.json"),
      )
    ) {
      directories.push(candidate);
    }
  }
  const games: ReferenceGameSummary[] = [];
  for (const directory of directories) {
    const gameRoot = path.join(referenceGamesRoot, directory);
    const gameStat = await lstat(gameRoot);
    if (gameStat.isSymbolicLink()) {
      throw new Error(`${gameRoot} must not be a symbolic link.`);
    }
    const value = await readJson(path.join(gameRoot, "reference-game.json"));
    const manifest = expectRecord(value, `${directory}/reference-game.json`);
    if (manifest.schemaVersion !== 5) {
      throw new Error(
        `${directory}/reference-game.json must use schemaVersion 5.`,
      );
    }
    if (manifest.id !== directory) {
      throw new Error(
        `${directory}/reference-game.json id must match its directory.`,
      );
    }
    games.push({
      id: directory,
      displayName: expectString(
        manifest.displayName,
        `${directory}.displayName`,
      ),
      mechanics: expectStringArray(
        manifest.mechanics,
        `${directory}.mechanics`,
      ),
      uiPatterns: expectStringArray(
        manifest.uiPatterns,
        `${directory}.uiPatterns`,
      ),
    });
  }
  return games;
}

export async function resolveReferenceGameIds(
  requested: readonly string[] = [],
): Promise<readonly string[]> {
  const known = (await discoverReferenceGames()).map(({ id }) => id);
  if (requested.length === 0) return known;
  const selected = [...new Set(requested)].sort(compareCanonicalStrings);
  const unknown = selected.filter((id) => !known.includes(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown reference game${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`,
    );
  }
  return selected;
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function expectRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function expectStringArray(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    throw new Error(`${label} must be an array of non-empty strings.`);
  }
  return value as string[];
}

export function repoCommandEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  if (
    !existsSync(path.join(root, ".git")) &&
    existsSync(path.join(root, ".here"))
  ) {
    return {
      ...env,
      GIT_DIR: path.join(root, ".here"),
      GIT_WORK_TREE: root,
    };
  }
  return env;
}

export async function spawnInherited(
  command: string,
  args: readonly string[],
  cwd = root,
  env: NodeJS.ProcessEnv = {},
): Promise<void> {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });
  const forwardInterrupt = () => child.kill("SIGINT");
  const forwardTermination = () => child.kill("SIGTERM");
  process.once("SIGINT", forwardInterrupt);
  process.once("SIGTERM", forwardTermination);
  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (exitCode, signal) => {
        if (signal) {
          reject(new Error(`${command} exited after ${signal}.`));
        } else {
          resolve(exitCode ?? 1);
        }
      });
    });
    if (code !== 0) {
      throw new Error(`${command} ${args.join(" ")} exited with code ${code}.`);
    }
  } finally {
    process.off("SIGINT", forwardInterrupt);
    process.off("SIGTERM", forwardTermination);
  }
}
