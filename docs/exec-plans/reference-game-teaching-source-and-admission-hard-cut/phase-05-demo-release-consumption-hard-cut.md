# Phase 05: Demo-Release Consumption Hard Cut

Status: proposed

Depends on: Phase 04

Planned at SDK commit: `7b6dcb5e310b8930aa44300bb71358cf5510a34a`

Primary repository: `internal`

## Objective

Make demo-release input admission consume the shared
`ReferenceGameSourceAdmission`. Remove independent public-source resolution and
the `demo-workspace` source assumption.

This phase should be implemented as an amendment to:

```text
docs/exec-plans/demo-release-input-admission-and-sdk-authority-hard-cut/
```

Do not implement two competing demo source-admission flows.

## Demo Input Contract

Extend `DemoReleaseInputAdmissionPayload`:

```ts
type ReferenceGameSourceAdmissionRef = {
  admissionDigest: `sha256:${string}`;
  bundleDigest: `sha256:${string}`;
  sourceRevision: string;
  manifestSha256: `sha256:${string}`;
  archiveSha256: `sha256:${string}`;
};

type DemoReleaseInputAdmissionPayload = {
  privateSource: MaterializedGitSourceIdentity;
  referenceGameSource: ReferenceGameSourceAdmissionRef;
  sdk: ExactSdkArtifactIdentity;
  demos: AdmittedDemoIdentity[];
  validation: DemoReleaseValidationIdentity;
};
```

The top-level contract enforces:

```ts
if (demoInput.sdk.version !== sourceAdmission.payload.sdk.version) {
  context.addIssue({
    code: "custom",
    path: ["sdk", "version"],
    message: "demo SDK must match admitted reference-game SDK",
  });
}

if (demoInput.sdk.integrity !== sourceAdmission.payload.sdk.integrity) {
  context.addIssue({
    code: "custom",
    path: ["sdk", "integrity"],
    message: "demo SDK integrity must match admitted reference-game SDK",
  });
}
```

## Source Materialization Cut

Remove demo-release code that:

- resolves `--demo-source-ref` after source admission;
- clones the SDK repository in CodeBuild;
- zips active-worktree SDK files;
- accepts an arbitrary reference-games root unrelated to admission;
- creates a second public source archive.

The preflight sequence becomes:

```text
ReferenceGameSourceAdmission
  + exact private source archive
  -> DemoReleaseInputAdmission
  -> deterministic demo build
```

The build sequence becomes:

```text
DemoReleaseInputAdmission
  -> verify source admission digest
  -> verify and extract admitted source archive
  -> select publishable games from source manifest
  -> build root workspaces
```

## Publishable Demo Selection

Select demos from:

```ts
sourceManifest.payload.games.filter((game) => game.publishToDemoGallery);
```

Do not maintain a private slug list.

Resolve each game root from `game.root`. Resolve manifest, reducer, UI, and
scenario paths from the source manifest entry. Reject any path not represented
in the object inventory.

## Hearts Metadata Cut

Update the SDK Hearts manifest before this phase:

- remove `demoRelease.sourcePath`;
- remove `demoRelease.screenshot.projection`;
- use `workspace.ui` for screenshot/build UI entrypoint;
- retain demo presentation metadata and screenshot presets.

Internal packager code should receive:

```ts
type PublishableReferenceGame = {
  id: string;
  gameRoot: string;
  manifestEntry: string;
  reducerEntry: string;
  uiEntry: string;
};
```

It must not know the old `demo-workspace` path.

## Release Manifest Provenance

The demo release manifest records admitted source identity:

```ts
type DemoReleaseManifestPayload = {
  inputAdmission: {
    inputDigest: `sha256:${string}`;
    referenceGameSourceAdmissionDigest: `sha256:${string}`;
    referenceGameBundleDigest: `sha256:${string}`;
    privateSourceRevision: string;
    demoSourceRevision: string;
    sdkVersion: string;
    sdkIntegrity: string;
    sdkTarballSha256: string;
  };
  demos: Array<{
    slug: string;
    dependencyProvenance: {
      packageJsonSha256: `sha256:${string}`;
      lockfileSha256: `sha256:${string}`;
      workspaceSourceSha256: `sha256:${string}`;
      sdkVersion: string;
      sdkIntegrity: string;
    };
  }>;
};
```

The demo release digest changes when the admitted source digest changes.

## CodeBuild Envelope

The source envelope contains:

```text
demo-release-input-admission.json
reference-game-source-admission.json
reference-game-source-manifest.json
reference-game-source.tar.gz
sdk-package.tgz
private-source.tar
```

CodeBuild verifies every digest before extraction. It does not access GitHub or
resolve npm tags.

## Tests

Add tests for:

- build rejects missing source admission;
- build rejects mismatched source admission digest;
- publishable game selection comes from the source manifest;
- no non-publishable canonical game is packaged;
- Hearts root UI entrypoint is used;
- old `demo-workspace` paths are rejected;
- source and demo SDK identities must match;
- rebuilt release digest matches local preflight;
- publication receipt links both admission digests.

## Deletions

Delete:

- demo source clone/ref flags from the build command;
- active-worktree SDK source zip logic;
- `demo-workspace` source-path validation;
- private publishable-demo slug lists;
- CodeBuild Git clone steps for reference games.

## Verification

```sh
pnpm --dir packages/release-contract test
pnpm --dir packages/compiler-core test
pnpm staging:demo-release:test
pnpm check:demo-release-input-authority
pnpm staging:demo-release:preflight -- \
  --source-ref <private-sha> \
  --reference-game-admission <source-admission.json>
pnpm staging:demo-release:build -- \
  --admission <demo-input-admission.json>
pnpm fin
pnpm verify:dev
```

Expected:

- a Hearts release builds from the admitted root workspace;
- the release manifest records both admission digests;
- removed source-ref flags fail with a hard-cut diagnostic.

## Exit Criteria

- Demo release consumes the shared admitted source.
- Demo release does not independently resolve public source.
- Hearts publication uses the canonical root UI and reducer.
- Release provenance links source admission through publication.

## STOP Conditions

Stop and report if:

- a publishable game needs files excluded from the source archive;
- the demo packager mutates source before calculating dependency provenance;
- CodeBuild requires network source resolution after admission;
- production activation cannot carry the new manifest schema in a coordinated
  release.
