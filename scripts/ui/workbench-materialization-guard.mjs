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

import { root } from "./reference-games-lib.mjs";

export const defaultWorkbenchMaterializationLockPath = path.join(
  root,
  "build/ui-workbench/.materialize.lock",
);

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function pathExists(filePath) {
  return stat(filePath)
    .then(() => true)
    .catch((error) => {
      if (error?.code === "ENOENT") return false;
      throw error;
    });
}

async function readLockOwner(lockPath) {
  return readFile(path.join(lockPath, "owner.json"), "utf8")
    .then((source) => JSON.parse(source))
    .catch((error) => {
      if (error?.code === "ENOENT" || error instanceof SyntaxError) {
        return null;
      }
      throw error;
    });
}

function processIsAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function recoverAbandonedLock(lockPath, ownerGraceMs) {
  const owner = await readLockOwner(lockPath);
  if (owner && processIsAlive(owner.pid)) return false;
  if (!owner) {
    const lockStat = await stat(lockPath).catch((error) => {
      if (error?.code === "ENOENT") return null;
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
    if (error?.code === "ENOENT") return true;
    throw error;
  }
  await rm(abandonedPath, { recursive: true, force: true });
  return true;
}

async function acquireWorkbenchMaterializationLock({
  lockPath,
  pollIntervalMs,
  timeoutMs,
  ownerGraceMs,
}) {
  await mkdir(path.dirname(lockPath), { recursive: true });
  const deadline = Date.now() + timeoutMs;
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
            `Workbench materialization lock ownership changed at ${lockPath}.`,
          );
        }
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }

    if (await recoverAbandonedLock(lockPath, ownerGraceMs)) continue;
    if (Date.now() >= deadline) {
      const owner = await readLockOwner(lockPath);
      throw new Error(
        `Timed out waiting for Workbench materialization lock at ${lockPath}; owner pid=${owner?.pid ?? "unknown"}.`,
      );
    }
    await delay(pollIntervalMs);
  }
}

export async function withWorkbenchMaterializationLock(
  callback,
  {
    lockPath = defaultWorkbenchMaterializationLockPath,
    pollIntervalMs = 100,
    timeoutMs = 30 * 60 * 1000,
    ownerGraceMs = 5_000,
  } = {},
) {
  const release = await acquireWorkbenchMaterializationLock({
    lockPath: path.resolve(lockPath),
    pollIntervalMs,
    timeoutMs,
    ownerGraceMs,
  });
  try {
    return await callback();
  } finally {
    await release();
  }
}

export async function replaceDirectoryAtomically(source, target) {
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
      if (error?.code !== "ENOENT") throw error;
    }
    await rename(staged, resolvedTarget);
    published = true;
  } catch (error) {
    if (movedPrevious && !(await pathExists(resolvedTarget))) {
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
