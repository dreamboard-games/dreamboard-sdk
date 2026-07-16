#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { releaseCandidateDir, rootDir } from "./lib/paths.ts";

export type ReleaseNpmTag = "alpha" | "beta" | "latest";
export type RegistryExpectation = "unpublished" | "publishable" | "published";

export type ReleaseMetadata = {
  gitTag: string;
  npmTag: ReleaseNpmTag;
};

export type ReleasePackage = {
  name: "@dreamboard-games/sdk";
  version: string;
  file: string;
  integrity: string;
};

export type ReleaseCandidate = {
  schemaVersion: 1;
  release: ReleaseMetadata;
  package: ReleasePackage;
};

const candidateFileName = "candidate.json";

export class ReleaseUsageError extends Error {
  readonly exitCode = 2;
}

export function deriveReleaseMetadata(version: string): ReleaseMetadata {
  const prerelease = version.match(/-(alpha|beta)\.(0|[1-9]\d*)$/);
  if (prerelease) {
    return {
      gitTag: `v${version}`,
      npmTag: prerelease[1] as "alpha" | "beta",
    };
  }
  if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    return { gitTag: `v${version}`, npmTag: "latest" };
  }
  throw new Error(
    `Release version '${version}' must be stable, alpha.N, or beta.N.`,
  );
}

function isReleaseMetadata(value: unknown): value is ReleaseMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Record<string, unknown>;
  return (
    typeof metadata.gitTag === "string" &&
    ["alpha", "beta", "latest"].includes(String(metadata.npmTag))
  );
}

function parseCandidate(
  value: unknown,
  candidatePath: string,
): ReleaseCandidate {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid release candidate at ${candidatePath}.`);
  }
  const candidate = value as Partial<ReleaseCandidate>;
  const entry = candidate.package;
  if (
    candidate.schemaVersion !== 1 ||
    !isReleaseMetadata(candidate.release) ||
    !entry ||
    entry.name !== "@dreamboard-games/sdk" ||
    typeof entry.version !== "string" ||
    typeof entry.file !== "string" ||
    path.basename(entry.file) !== entry.file ||
    typeof entry.integrity !== "string" ||
    !entry.integrity.startsWith("sha512-") ||
    JSON.stringify(candidate.release) !==
      JSON.stringify(deriveReleaseMetadata(entry.version))
  ) {
    throw new Error(`Invalid release candidate metadata at ${candidatePath}.`);
  }
  return candidate as ReleaseCandidate;
}

export async function readCandidate(
  candidatePath = path.join(releaseCandidateDir, candidateFileName),
): Promise<ReleaseCandidate> {
  const candidate = parseCandidate(
    JSON.parse(await readFile(candidatePath, "utf8")) as unknown,
    candidatePath,
  );
  const directory = path.dirname(candidatePath);
  const tarballs = (await readdir(directory)).filter((name) =>
    name.endsWith(".tgz"),
  );
  if (tarballs.length !== 1 || tarballs[0] !== candidate.package.file) {
    throw new Error(
      `Release candidate directory must contain exactly ${candidate.package.file}; found ${tarballs.join(", ") || "none"}.`,
    );
  }
  const actualIntegrity = sha512Integrity(
    await readFile(path.join(directory, candidate.package.file)),
  );
  if (actualIntegrity !== candidate.package.integrity) {
    throw new Error(
      `${candidate.package.name}@${candidate.package.version} integrity mismatch: expected ${candidate.package.integrity}, received ${actualIntegrity}.`,
    );
  }
  return candidate;
}

export function classifyRegistry(
  entry: ReleasePackage,
  existingIntegrity: string | undefined,
  expected: RegistryExpectation,
): "missing" | "exact" {
  if (!existingIntegrity) {
    if (expected === "published") {
      throw new Error(`${entry.name}@${entry.version} is not published.`);
    }
    return "missing";
  }
  if (expected === "unpublished") {
    throw new Error(
      `${entry.name}@${entry.version} already exists; choose a new version.`,
    );
  }
  if (existingIntegrity !== entry.integrity) {
    throw new Error(
      `${entry.name}@${entry.version} exists with different integrity.`,
    );
  }
  return "exact";
}

export async function verifyRegistry(
  candidate: ReleaseCandidate,
  expected: RegistryExpectation,
  fetchImpl: typeof fetch = fetch,
): Promise<"missing" | "exact"> {
  const entry = candidate.package;
  const response = await fetchImpl(
    `https://registry.npmjs.org/${encodeURIComponent(entry.name)}/${encodeURIComponent(entry.version)}`,
  );
  if (response.status === 404) {
    return classifyRegistry(entry, undefined, expected);
  }
  if (!response.ok) {
    throw new Error(
      `npm registry returned ${response.status} for ${entry.name}@${entry.version}.`,
    );
  }
  const metadata = (await response.json()) as { dist?: { integrity?: string } };
  return classifyRegistry(entry, metadata.dist?.integrity, expected);
}

export async function verifyRelease(): Promise<ReleaseCandidate> {
  const [{ runCoreCheck }, { packAndVerifySdk }, { verifyReferenceGames }] =
    await Promise.all([
      import("./check.ts"),
      import("./package.ts"),
      import("./reference/index.ts"),
    ]);
  await runCoreCheck({ referenceGames: false });
  const parent = path.dirname(releaseCandidateDir);
  const staging = path.join(parent, `.candidate-${process.pid}.tmp`);
  const backup = path.join(parent, `.candidate-${process.pid}.previous`);
  await mkdir(parent, { recursive: true });
  await rm(staging, { recursive: true, force: true });
  await rm(backup, { recursive: true, force: true });
  try {
    await mkdir(staging, { recursive: true });
    const packed = await packAndVerifySdk(staging);
    await verifyReferenceGames({ root: rootDir, sdkTarball: packed.path });
    const candidate: ReleaseCandidate = {
      schemaVersion: 1,
      release: deriveReleaseMetadata(packed.version),
      package: {
        name: packed.name,
        version: packed.version,
        file: packed.file,
        integrity: packed.integrity,
      },
    };
    const stagingCandidate = path.join(staging, candidateFileName);
    await writeFile(
      stagingCandidate,
      `${JSON.stringify(candidate, null, 2)}\n`,
      "utf8",
    );
    await readCandidate(stagingCandidate);

    let hadPrevious = false;
    try {
      await rename(releaseCandidateDir, backup);
      hadPrevious = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try {
      await rename(staging, releaseCandidateDir);
    } catch (error) {
      if (hadPrevious) await rename(backup, releaseCandidateDir);
      throw error;
    }
    await rm(backup, { recursive: true, force: true });
    return candidate;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function sha512Integrity(bytes: Uint8Array): string {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function parseReleaseCli(args: readonly string[]): {
  command: string;
  candidatePath?: string;
  expectation?: RegistryExpectation;
} {
  let parsed: {
    values: { candidate?: string; expect?: string };
    positionals: string[];
  };
  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      strict: true,
      options: {
        candidate: { type: "string" },
        expect: { type: "string" },
      },
    }) as typeof parsed;
  } catch (error) {
    throw new ReleaseUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
  const [command, ...extra] = parsed.positionals;
  if (!command || extra.length > 0) throw new ReleaseUsageError(releaseUsage());
  const expectation = parsed.values.expect;
  if (
    expectation !== undefined &&
    !["unpublished", "publishable", "published"].includes(expectation)
  ) {
    throw new ReleaseUsageError(
      "--expect must be unpublished, publishable, or published.",
    );
  }
  return {
    command,
    candidatePath: parsed.values.candidate,
    expectation: expectation as RegistryExpectation | undefined,
  };
}

export async function runReleaseCommand(
  args: readonly string[],
): Promise<void> {
  const options = parseReleaseCli(args);
  if (options.command !== "metadata" && options.command !== "registry") {
    throw new ReleaseUsageError(releaseUsage());
  }
  const candidatePath = options.candidatePath
    ? path.resolve(rootDir, options.candidatePath)
    : path.join(releaseCandidateDir, candidateFileName);
  const candidate = await readCandidate(candidatePath);
  if (options.command === "metadata") {
    if (options.expectation) throw new ReleaseUsageError(releaseUsage());
    process.stdout.write(`${JSON.stringify(candidate.release)}\n`);
    return;
  }
  if (!options.expectation)
    throw new ReleaseUsageError("registry requires --expect.");
  await verifyRegistry(candidate, options.expectation);
  console.log(
    `Registry state matches ${options.expectation} candidate expectation.`,
  );
}

function releaseUsage(): string {
  return "Usage: node scripts/release.ts metadata [--candidate <candidate.json>] | registry --expect <unpublished|publishable|published> [--candidate <candidate.json>]";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runReleaseCommand(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = error instanceof ReleaseUsageError ? 2 : 1;
  });
}
