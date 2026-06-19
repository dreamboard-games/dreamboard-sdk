# Phase 04: Source Admission And Proof Linkage

Status: proposed

Depends on: Phase 03

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repositories: `dreamboard-sdk`, `internal`

## Objective

Create one internal admission receipt that verifies the SDK-owned source
manifest and archive against an exact public SDK artifact. Link packed
consumer, Workbench, demo release, and agent-runner evidence to that admission.

This phase implements the shared framework discussed in:

```text
internal/docs/exec-plans/
  demo-release-input-admission-and-sdk-authority-hard-cut/
```

Do not create a second source materializer in the demo-release script.

## Internal Contract

Create:

```text
internal/packages/release-contract/src/
  reference-game-source-admission.ts
```

Export it through:

```text
@dreamboard/release-contract/reference-game-source-admission
```

Target payload:

```ts
export type ReferenceGameSourceAdmissionPayload = {
  source: {
    repository: "dreamboard-games/dreamboard-sdk";
    revision: string;
    bundleDigest: `sha256:${string}`;
    manifestSha256: `sha256:${string}`;
    archiveSha256: `sha256:${string}`;
  };
  sdk: {
    packageName: "@dreamboard-games/sdk";
    version: string;
    registry: "https://registry.npmjs.org";
    integrity: string;
    tarballSha256: `sha256:${string}`;
  };
  games: Array<{
    id: string;
    packageJsonSha256: `sha256:${string}`;
    lockfileSha256: `sha256:${string}`;
    sdkSpecifier: string;
    resolvedSdkVersion: string;
    resolvedSdkIntegrity: string;
  }>;
  validation: {
    packedConsumerReceiptSha256: `sha256:${string}`;
    workbenchReceiptSha256: `sha256:${string}`;
    games: Array<{
      id: string;
      typecheck: "passed";
      reducerTests: "passed";
      uiTests: "passed";
    }>;
  };
};

export type ReferenceGameSourceAdmission = {
  schemaVersion: 1;
  receiptType: "dreamboard.reference-game-source-admission";
  admissionDigest: `sha256:${string}`;
  payload: ReferenceGameSourceAdmissionPayload;
  createdAt: string;
};
```

`admissionDigest` excludes `createdAt` and local paths.

## Contract Validation

The schema must enforce:

```ts
for (const game of admission.games) {
  assert.equal(game.sdkSpecifier, admission.sdk.version);
  assert.equal(game.resolvedSdkVersion, admission.sdk.version);
  assert.equal(game.resolvedSdkIntegrity, admission.sdk.integrity);
}
```

Also enforce:

- full 40-character source SHA;
- source manifest uses `provenance.kind: "git"`;
- source manifest provenance revision equals the admission revision;
- source manifest parses through
  `@dreamboard-games/sdk/reference-games`;
- source manifest `bundleDigest` matches the admission;
- archive contains exactly the manifest object inventory plus allowed wrapper
  files;
- archive and manifest hashes match;
- no duplicate game IDs;
- validation covers every manifest game exactly once;
- required Workbench receipt records the same source digest.

## Admission Materializer

Create an internal module shared by demo release and agent-runner:

```text
internal/packages/release-tooling/src/reference-games/
  admit-reference-game-source.ts
  verify-reference-game-source.ts
  materialize-sdk-package.ts
```

If no suitable release-tooling package exists, place the orchestration beside
the demo-release tooling initially, but keep parsing and verification in
`packages/release-contract` or a reusable library. Do not leave the only
implementation inside a CLI script.

Target API:

```ts
export async function admitReferenceGameSource(input: {
  sdkRepositoryRoot: string;
  sourceRef: string;
  outputRoot: string;
}): Promise<ReferenceGameSourceAdmission> {
  const source = await materializeSdkReferenceSource(input);
  const sdk = await resolveExactPublishedSdk(source.manifest);
  const packed = await verifyPackedReferenceWorkspaces({ source, sdk });
  const workbench = await verifyRequiredWorkbench({ source, sdk });

  return writeSourceAdmission({
    source,
    sdk,
    packed,
    workbench,
  });
}
```

The source archive must come from the SDK Phase 01 materializer or reproduce
the same exact Git-object algorithm and compare the same digest. Prefer calling
the SDK command and consuming its output. Never admit a worktree-provenance
manifest, even when its content digest matches.

## Artifact Layout

```text
.dreamboard-dev/reference-game-inputs/
  sha256-<admission-digest>/
    admission.json
    reference-game-source-manifest.json
    reference-game-source.tar.gz
    sdk-package.tgz
    packed-consumer-receipt.json
    workbench-receipt.json
    logs/
```

Local paths are evidence locations, not identity fields.

## Command Surface

Internal:

```jsonc
{
  "scripts": {
    "reference-games:admit": "node scripts/reference-game-source-admission.mjs",
  },
}
```

Example:

```sh
pnpm reference-games:admit -- \
  --sdk-repo /path/to/dreamboard-sdk \
  --source-ref <full-sdk-sha> \
  --out .dreamboard-dev/reference-game-inputs/
```

The result prints the admission digest and receipt path.

## Proof Linkage

Update SDK receipts to carry:

```ts
{
  referenceGameSource: {
    bundleDigest: `sha256:${string}`;
    provenance:
      | { kind: "worktree" }
      | { kind: "git"; revision: string };
  }
}
```

Update internal downstream receipts to carry:

```ts
{
  referenceGameSourceAdmission: {
    admissionDigest: `sha256:${string}`;
    bundleDigest: `sha256:${string}`;
  }
}
```

No downstream receipt may identify source only by branch name or short SHA.

## Tests

Add tests for:

- canonical digest independent of property order;
- timestamp and evidence path do not affect digest;
- archive mismatch rejection;
- manifest mismatch rejection;
- worktree-provenance manifest rejection;
- manifest/admission revision mismatch rejection;
- SDK version mismatch rejection;
- matching version with different integrity rejection;
- game package or lockfile mismatch rejection;
- missing game verification rejection;
- Workbench receipt source-digest mismatch rejection;
- source admission can be reused by two consumers without mutation.

## Verification

Internal:

```sh
pnpm --dir packages/release-contract test
pnpm --dir packages/release-contract build
pnpm reference-games:admit -- \
  --sdk-repo ../dreamboard-sdk \
  --source-ref <full-sdk-sha>
```

SDK:

```sh
mise exec node@24 -- pnpm reference-games:source:materialize -- \
  --source-ref <same-full-sdk-sha>
```

Expected:

- both paths report the same source `bundleDigest` and archive SHA-256;
- admission records the exact public SDK version and integrity;
- all nine games have passing verification.

## Exit Criteria

- One reusable source admission exists.
- Source and package identities are exact and independently verifiable.
- Workbench and packed receipts link to the source digest.
- The receipt is suitable for both demo release and agent-runner.

## STOP Conditions

Stop and report if:

- the selected SDK source requires an unpublished SDK API;
- public npm metadata cannot identify one exact tarball and integrity;
- the SDK toolchain and reference workspaces resolve different package bytes;
- the internal demo-release plan has already introduced a conflicting source
  admission type.
