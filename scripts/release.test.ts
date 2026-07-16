import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  classifyRegistry,
  deriveReleaseMetadata,
  readCandidate,
  type ReleaseCandidate,
} from "./release.ts";
import { sha512Integrity } from "./package.ts";

const releasePackage = {
  name: "@dreamboard-games/sdk" as const,
  version: "0.4.0-alpha.14",
  file: "dreamboard-games-sdk-0.4.0-alpha.14.tgz",
  integrity: "sha512-candidate",
};

test("derives stable, alpha, and beta release tags", () => {
  assert.deepEqual(deriveReleaseMetadata("1.2.3-alpha.4"), {
    gitTag: "v1.2.3-alpha.4",
    npmTag: "alpha",
  });
  assert.equal(deriveReleaseMetadata("1.2.3-beta.4").npmTag, "beta");
  assert.equal(deriveReleaseMetadata("1.2.3").npmTag, "latest");
  assert.throws(() => deriveReleaseMetadata("1.2.3-rc.1"), /stable, alpha/);
});

test("classifies unpublished, publishable, and published registry states", () => {
  assert.equal(
    classifyRegistry(releasePackage, undefined, "unpublished"),
    "missing",
  );
  assert.equal(
    classifyRegistry(releasePackage, releasePackage.integrity, "publishable"),
    "exact",
  );
  assert.equal(
    classifyRegistry(releasePackage, releasePackage.integrity, "published"),
    "exact",
  );
  assert.throws(
    () => classifyRegistry(releasePackage, undefined, "published"),
    /not published/,
  );
  assert.throws(
    () => classifyRegistry(releasePackage, "sha512-other", "publishable"),
    /different integrity/,
  );
  assert.throws(
    () =>
      classifyRegistry(releasePackage, releasePackage.integrity, "unpublished"),
    /already exists/,
  );
});

test("validates the single-package candidate and tarball integrity", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sdk-candidate-test-"));
  try {
    const bytes = Buffer.from("candidate bytes");
    const candidate: ReleaseCandidate = {
      schemaVersion: 1,
      release: deriveReleaseMetadata(releasePackage.version),
      package: {
        ...releasePackage,
        integrity: sha512Integrity(bytes),
      },
    };
    const candidatePath = path.join(directory, "candidate.json");
    await writeFile(path.join(directory, releasePackage.file), bytes);
    await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`);
    assert.deepEqual(await readCandidate(candidatePath), candidate);

    await writeFile(path.join(directory, releasePackage.file), "changed");
    await assert.rejects(readCandidate(candidatePath), /integrity mismatch/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects candidate directories containing more than one tarball", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sdk-candidate-count-"));
  try {
    await mkdir(directory, { recursive: true });
    const bytes = Buffer.from("candidate bytes");
    const candidate: ReleaseCandidate = {
      schemaVersion: 1,
      release: deriveReleaseMetadata(releasePackage.version),
      package: { ...releasePackage, integrity: sha512Integrity(bytes) },
    };
    const candidatePath = path.join(directory, "candidate.json");
    await writeFile(path.join(directory, releasePackage.file), bytes);
    await writeFile(path.join(directory, "unexpected.tgz"), bytes);
    await writeFile(candidatePath, `${JSON.stringify(candidate)}\n`);
    await assert.rejects(readCandidate(candidatePath), /exactly/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
