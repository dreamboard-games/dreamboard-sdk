# Phase 01: Source Manifest And Deterministic Bundle

Status: proposed

Depends on: Phase 00

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repository: `dreamboard-sdk`

## Objective

Add an SDK-owned, content-addressed source manifest and deterministic source
archive without changing the live reference-game layout yet.

The source manifest describes content. It does not contain demo publication,
agent-runner placement, AWS, or internal admission policy.

Content identity and source provenance are deliberately separate:

- `bundleDigest` is computed only from source metadata and object bytes;
- authoring tools may compute it from one frozen worktree snapshot;
- release tooling rematerializes those bytes from exact Git objects;
- only internal admission binds the digest to a Git revision and npm artifact.

## Contract Ownership

Create:

```text
packages/sdk/src/reference-games/
  canonical.ts
  schema.ts
  index.ts
  schema.test.ts
```

Export the contract from:

```text
@dreamboard-games/sdk/reference-games
```

Update:

```text
packages/sdk/package.json
packages/sdk/src/__snapshots__/export-surface.test.ts.snap
scripts/assert-publication-boundary.mjs
```

Do not create another published package.

## Source Manifest Schema

Target shape:

```ts
import { z } from "zod";

const sha256DigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const referenceGameSourceObjectSchema = z
  .object({
    path: z.string().min(1),
    sha256: sha256DigestSchema,
    byteLength: z.number().int().nonnegative(),
  })
  .strict();

export const referenceGameSourceEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    root: z.string().regex(/^examples\/reference-games\/[a-z0-9-]+$/),
    sourceSha256: sha256DigestSchema,
    packageJsonSha256: sha256DigestSchema,
    lockfileSha256: sha256DigestSchema,
    sdkSpecifier: z.string().min(1),
    manifest: z.string().min(1),
    reducer: z.string().min(1),
    ui: z.string().min(1),
    behaviorScenarios: z.array(z.string().min(1)).min(1),
    uiScenarios: z.array(z.string().min(1)).min(1),
    mechanics: z.array(z.string().min(1)).min(1),
    readFirst: z.array(z.string().min(1)).min(1),
    publishToDemoGallery: z.boolean(),
  })
  .strict();

export const referenceGameSourceManifestPayloadSchema = z
  .object({
    games: z.array(referenceGameSourceEntrySchema).min(1),
    objects: z.array(referenceGameSourceObjectSchema).min(1),
  })
  .strict();
```

The outer manifest is:

```ts
export const referenceGameSourceManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    manifestType: z.literal("dreamboard.reference-game-source"),
    bundleDigest: sha256DigestSchema,
    payload: referenceGameSourceManifestPayloadSchema,
    provenance: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("worktree") }).strict(),
      z
        .object({
          kind: z.literal("git"),
          repository: z.literal("dreamboard-games/dreamboard-sdk"),
          revision: z.string().regex(/^[a-f0-9]{40}$/),
        })
        .strict(),
    ]),
  })
  .strict()
  .superRefine((value, context) => {
    const digest = computeReferenceGameSourceDigest(value.payload);
    if (value.bundleDigest !== digest) {
      context.addIssue({
        code: "custom",
        path: ["bundleDigest"],
        message: "bundleDigest must match the canonical payload digest",
      });
    }
  });
```

`provenance` is excluded from `bundleDigest`. Do not add a generation
timestamp to this manifest: the exact-Git manifest is embedded in the source
archive, so nondeterministic metadata would make the archive hash unstable.

## Canonical Digest

Extract a small generic canonical JSON helper inside `packages/sdk`; do not
copy the private demo-release canonicalizer verbatim. Use a browser-compatible
hash implementation, matching the existing `@noble/hashes` approach in the
plugin runtime contract rather than adding a `node:crypto` dependency to the
public subpath.

Required rules:

- normalize strings and object keys to NFC;
- sort object keys;
- reject non-finite numbers;
- reject `undefined`;
- preserve array order except for explicitly set-like contract arrays;
- sort `games` by `id`;
- sort `objects` by `path`.

Example:

```ts
export function computeReferenceGameSourceDigest(
  payload: ReferenceGameSourceManifestPayload,
): `sha256:${string}` {
  const canonical = canonicalizeReferenceGameSourcePayload(payload);
  const bytes = utf8ToBytes(JSON.stringify(canonical));
  return `sha256:${bytesToHex(sha256(bytes))}`;
}
```

Add cross-language fixture JSON if the internal Kotlin or TypeScript tooling
will recompute the digest independently. Prefer importing the SDK contract in
internal TypeScript tools; do not maintain two hand-written TypeScript
canonicalizers.

## Snapshot Builder

Create one content builder used by both authoring and release materialization:

```ts
export async function buildReferenceGameSourceManifest(input: {
  sourceRoot: string;
  provenance:
    | { kind: "worktree" }
    | {
        kind: "git";
        repository: "dreamboard-games/dreamboard-sdk";
        revision: string;
      };
}): Promise<ReferenceGameSourceManifest>;
```

The caller must provide a frozen directory snapshot. The builder walks,
hashes, and validates that snapshot once; it must not reread the mutable source
tree after hashing.

For normal fixture authoring:

1. copy the builder's allowed reference-game source paths into a temporary
   snapshot;
2. compute a manifest with `provenance.kind: "worktree"`;
3. compile reducer and UI artifacts from that same snapshot;
4. record `bundleDigest`, but no Git revision.

## Exact Git Materialization

Replace the active-worktree collection in
`scripts/ui/build-reference-bundle.mjs` with a reusable materializer:

```text
scripts/reference-games/
  materialize-git-source.mjs
  build-source-manifest.mjs
  build-source-bundle.mjs
```

Target interface:

```ts
export async function materializeReferenceGameSource({
  sourceRef,
  outputRoot,
}: {
  sourceRef: string;
  outputRoot: string;
}) {
  const revision = resolveFullGitSha(sourceRef);
  const sourceTar = await gitArchive({
    revision,
    pathspecs: ["examples/reference-games"],
  });
  const extracted = await extractToTemporaryDirectory(sourceTar);
  const manifest = await buildReferenceGameSourceManifest({
    sourceRoot: extracted,
    provenance: {
      kind: "git",
      repository: "dreamboard-games/dreamboard-sdk",
      revision,
    },
  });
  const bundle = await writeDeterministicBundle(extracted, manifest);

  return {
    revision,
    manifest,
    manifestSha256: await sha256File(manifest.path),
    archiveSha256: await sha256File(bundle.path),
  };
}
```

Support this repository's `.here` Git directory through the existing
`repoCommandEnv` convention.

Never read selected source files from the active worktree after resolving
`sourceRef`.

Normalize tar entry ordering, modes, uid/gid, uname/gname, and mtimes. Fix gzip
headers as well. Two runs for the same Git revision must produce byte-identical
manifest JSON and archive bytes.

## Bundle Layout

Target output:

```text
build/reference-games/source/
  sha256-<bundle-digest>/
    reference-game-source-manifest.json
    reference-game-source.tar.gz
    materialization-receipt.json
```

The tar contains:

```text
examples/reference-games/**
reference-game-source-manifest.json
```

Exclude:

- `node_modules`;
- `dist`;
- `.dreamboard`;
- test result directories;
- runtime evidence receipts;
- screenshots that are not explicit teaching assets.

Generated source files required to typecheck the committed workspace remain
included until a later plan removes that requirement.

## Command Surface

Replace or extend the current bundle command:

```jsonc
{
  "scripts": {
    "reference-games:source:materialize": "node scripts/reference-games/build-source-bundle.mjs",
    "reference-games:bundle": "pnpm reference-games:source:materialize",
  },
}
```

Example:

```sh
pnpm reference-games:source:materialize -- \
  --source-ref 7b6dcb5e310b8930aa44300bb71358cf5510a34a
```

The real command must require or resolve a full SHA and record the full value.

## Tests

Add tests for:

- property-order-independent digest;
- game ordering normalization;
- object ordering normalization;
- digest changes when any source object changes;
- digest changes when an entrypoint or `readFirst` path changes;
- worktree and Git provenance produce the same digest for the same bytes;
- worktree provenance cannot be used as release admission evidence;
- source mutation after snapshot creation cannot create a mixed manifest;
- dirty worktree does not affect an archive created from `HEAD`;
- requested non-HEAD commit archives the requested commit;
- missing required source path fails;
- symlink escaping the archived root fails;
- archive generation is byte-identical across two runs.

## Verification

```sh
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk typecheck
mise exec node@24 -- pnpm exports:check
mise exec node@24 -- pnpm publication:check
mise exec node@24 -- pnpm reference-games:source:materialize -- --source-ref HEAD
```

Expected:

- all commands exit 0;
- two materializations of the same SHA have the same `bundleDigest` and
  `archiveSha256`;
- the manifest records a 40-character source revision.

## Exit Criteria

- The SDK owns one versioned source-manifest contract.
- Authoring tools can compute stable content identity without knowing a future
  commit SHA.
- The source bundle is derived from exact Git objects.
- The manifest digest and archive digest are independently checkable.
- No internal consumer fields exist in the SDK manifest.

## STOP Conditions

Stop and report if:

- adding the subpath would publish private internal package types;
- deterministic tar output cannot be achieved with the current custom tar
  writer;
- required workspace files exist only as ignored active-worktree files;
- the source archive needs credentials or environment-specific files.
