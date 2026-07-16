import { randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { hasErrorCode, root } from "./support.ts";

export const defaultMaterializationLockPath = path.join(
  root,
  "build/ui-workbench/.materialize.lock",
);

interface LockOwner {
  readonly pid: number;
  readonly token: string;
}

interface LockOptions {
  readonly lockPath?: string;
  readonly pollIntervalMs?: number;
  readonly timeoutMs?: number;
  readonly ownerGraceMs?: number;
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function exists(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then(() => true)
    .catch((error: unknown) => {
      if (hasErrorCode(error, "ENOENT")) return false;
      throw error;
    });
}

async function readLockOwner(lockPath: string): Promise<LockOwner | null> {
  return readFile(path.join(lockPath, "owner.json"), "utf8")
    .then((source) => JSON.parse(source) as LockOwner)
    .catch((error: unknown) => {
      if (hasErrorCode(error, "ENOENT") || error instanceof SyntaxError) {
        return null;
      }
      throw error;
    });
}

function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !hasErrorCode(error, "ESRCH");
  }
}

async function recoverAbandonedLock(
  lockPath: string,
  ownerGraceMs: number,
): Promise<boolean> {
  const owner = await readLockOwner(lockPath);
  if (owner && processIsAlive(owner.pid)) return false;
  if (!owner) {
    const lockStat = await stat(lockPath).catch((error: unknown) => {
      if (hasErrorCode(error, "ENOENT")) return null;
      throw error;
    });
    if (!lockStat || Date.now() - lockStat.mtimeMs < ownerGraceMs) {
      return !lockStat;
    }
  }
  const abandonedPath = `${lockPath}.abandoned-${randomUUID()}`;
  try {
    await rename(lockPath, abandonedPath);
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return true;
    throw error;
  }
  await rm(abandonedPath, { recursive: true, force: true });
  return true;
}

async function acquireLock(
  options: Required<LockOptions>,
): Promise<() => Promise<void>> {
  const lockPath = path.resolve(options.lockPath);
  await mkdir(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + options.timeoutMs;
  const token = randomUUID();
  for (;;) {
    try {
      await mkdir(lockPath);
      await writeFile(
        path.join(lockPath, "owner.json"),
        `${JSON.stringify({ pid: process.pid, token })}\n`,
      );
      return async () => {
        const owner = await readLockOwner(lockPath);
        if (owner?.token !== token) {
          throw new Error(
            `Materialization lock ownership changed at ${lockPath}.`,
          );
        }
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) throw error;
    }
    if (await recoverAbandonedLock(lockPath, options.ownerGraceMs)) continue;
    if (Date.now() >= deadline) {
      const owner = await readLockOwner(lockPath);
      throw new Error(
        `Timed out waiting for materialization lock at ${lockPath}; owner pid=${owner?.pid ?? "unknown"}.`,
      );
    }
    await delay(options.pollIntervalMs);
  }
}

export async function withMaterializationLock<T>(
  callback: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const complete: Required<LockOptions> = {
    lockPath: options.lockPath ?? defaultMaterializationLockPath,
    pollIntervalMs: options.pollIntervalMs ?? 100,
    timeoutMs: options.timeoutMs ?? 30 * 60 * 1_000,
    ownerGraceMs: options.ownerGraceMs ?? 5_000,
  };
  const release = await acquireLock(complete);
  try {
    return await callback();
  } finally {
    await release();
  }
}

export async function replaceDirectoryAtomically(
  source: string,
  target: string,
): Promise<void> {
  const resolvedSource = path.resolve(source);
  const resolvedTarget = path.resolve(target);
  const parent = path.dirname(resolvedTarget);
  const basename = path.basename(resolvedTarget);
  const suffix = `${process.pid}-${randomUUID()}`;
  const staged = path.join(parent, `.${basename}.next-${suffix}`);
  const previous = path.join(parent, `.${basename}.previous-${suffix}`);
  await mkdir(parent, { recursive: true });
  await cp(resolvedSource, staged, { recursive: true, force: false });

  let movedPrevious = false;
  let published = false;
  try {
    try {
      await rename(resolvedTarget, previous);
      movedPrevious = true;
    } catch (error) {
      if (!hasErrorCode(error, "ENOENT")) throw error;
    }
    await rename(staged, resolvedTarget);
    published = true;
  } catch (error) {
    if (movedPrevious && !(await exists(resolvedTarget))) {
      await rename(previous, resolvedTarget);
      movedPrevious = false;
    }
    throw error;
  } finally {
    await rm(staged, { recursive: true, force: true });
    if (published && movedPrevious) {
      await rm(previous, { recursive: true, force: true });
    }
  }
}
