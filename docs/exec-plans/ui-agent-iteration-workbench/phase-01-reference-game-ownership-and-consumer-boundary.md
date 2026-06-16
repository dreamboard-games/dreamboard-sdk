# Phase 01: Reference Game Ownership And Consumer Boundary

Status: proposed.

## Objective

Move the authoritative, public-safe reference game source from
`../internal/examples/published` into this repository while preserving a strict
consumer boundary.

The moved games exist to teach and verify SDK usage. They are not workspace
packages, product demos, or copies of third-party games.

## 01A. Adopt mechanic-based reference IDs

Use this migration table:

| Current source directory | Target directory           |
| ------------------------ | -------------------------- |
| `frontier-trails`        | `hex-network-trading`      |
| `sketchbook`             | `deck-building-market`     |
| `hearts`                 | `hearts`                   |
| `artisans-guild`         | `worker-placement-tableau` |
| `sushi-go`               | Do not move directly       |

Create a new, original `simultaneous-card-drafting` reference game to preserve
the useful simultaneous selection and passing UI patterns currently exercised
by `sushi-go`.

Do not carry commercial product names into public manifests, source comments,
fixture IDs, screenshots, or user-facing reference documentation. This plan
uses the existing internal `sushi-go` path only as a deletion target.

## 01B. Establish the source layout

Keep reference games outside `pnpm-workspace.yaml`:

```text
examples/
  reference-games/
    README.md
    hearts/
      package.json
      pnpm-lock.yaml
      reference-game.json
      src/
      scenarios/
    hex-network-trading/
      ...
    deck-building-market/
      ...
    worker-placement-tableau/
      ...
    simultaneous-card-drafting/
      ...
```

Each game must:

- depend on an exact released SDK version in its committed `package.json`;
- maintain its own lockfile;
- build with `pnpm --ignore-workspace`;
- import only documented package exports;
- have no `workspace:*`, `link:`, source-directory, or internal package
  dependency;
- set `publishToDemoGallery` to `false`;
- be independently packable or buildable from a temporary directory.

The root workspace remains:

```yaml
packages:
  - "packages/*"
```

Do not add `examples/reference-games/*` to it.

## 01C. Add a provenance and coverage manifest

Every reference game needs a checked manifest.

Example:

```json
{
  "schemaVersion": 1,
  "id": "hearts",
  "displayName": "Hearts",
  "publishToDemoGallery": false,
  "mechanics": [
    "trick-taking",
    "simultaneous-card-passing",
    "hidden-information"
  ],
  "uiPatterns": [
    "private-hand",
    "multi-select",
    "mobile-hand-actions",
    "shared-trick-area"
  ],
  "rights": {
    "mechanicsProvenance": "traditional-card-game",
    "sourceCode": "original-for-this-repository",
    "codeLicense": "PolyForm-Shield-1.0.0",
    "ruleText": "original-summary",
    "artwork": "repository-owned-or-licensed",
    "assetLicenseManifest": "assets/LICENSES.json",
    "thirdPartyMarks": [],
    "reviewStatus": "approved",
    "reviewedBy": "rights-owner-or-counsel",
    "reviewedAt": "2026-06-16"
  },
  "sdk": {
    "dependency": "@dreamboard-games/sdk",
    "versionPolicy": "exact"
  }
}
```

Add a schema validator that rejects:

- unknown or duplicated IDs;
- missing rights review;
- non-empty third-party marks;
- `publishToDemoGallery: true`;
- unrecognized UI pattern tags;
- dependency policies other than `exact`;
- source files containing a configured denylist of commercial marks.

The denylist is a review aid, not a substitute for legal review.

The committed exact SDK dependency and lockfile track the latest published SDK
release. Candidate CI rewrites the dependency only in a temporary copy to the
candidate tarball. When a reference game adopts an unreleased API, its
candidate proof is authoritative until the SDK publishes; the release closeout
then updates the committed exact version and lockfile.

## 01D. Preserve the real usage patterns

Do not simplify the migrated games into showcase snippets. Preserve the
behaviors that expose SDK ergonomics:

- `hearts`: passing three cards, hidden hand state, trick selection, and mobile
  hand actions;
- `hex-network-trading`: hex board targets, route or settlement placement,
  resource hand, and trading controls;
- `deck-building-market`: market rows, purchase selection, hand actions, and
  repeated turn state;
- `worker-placement-tableau`: target selection, tableau cards, resource
  allocation forms, and confirmation dialogs;
- `simultaneous-card-drafting`: simultaneous selection, locked choice,
  reveal/pass transition, and compact mobile hand.

Copying code is not the goal. Preserve the usage pressure that makes component
and authoring API problems visible.

## 01E. Add isolated packed-consumer verification

Create a root script that packs the candidate SDK, copies each reference game
to a temporary directory, rewrites only the SDK dependency to the tarball, and
builds/tests it outside the workspace.

Example:

```ts
// scripts/ui/verify-reference-consumers.mts
for (const game of referenceGames) {
  const sandbox = await materializeTemporaryConsumer(game.sourceDir);

  await replaceDependency(sandbox, "@dreamboard-games/sdk", sdkTarballPath);
  await run(
    "pnpm",
    ["install", "--frozen-lockfile=false", "--ignore-workspace"],
    {
      cwd: sandbox,
    },
  );
  await run("pnpm", ["build"], { cwd: sandbox });
  await run("pnpm", ["test"], { cwd: sandbox });

  await assertNoResolvedWorkspaceLinks(sandbox);
  await writeConsumerReceipt(game.id, sandbox);
}
```

The verifier must inspect the installed dependency graph. A successful build is
not sufficient if pnpm silently resolves a local workspace package.

Target commands:

```jsonc
{
  "scripts": {
    "reference-games:check": "node scripts/ui/check-reference-games.mjs",
    "reference-games:test:packed": "node scripts/ui/verify-reference-consumers.mjs",
  },
}
```

## 01F. Create a one-way internal export

The SDK repository becomes authoritative after migration. Produce a
deterministic artifact containing:

- reference source;
- compiled game package;
- scenario sources;
- reference manifests;
- content digests;
- SDK commit;
- packed SDK digest.

Example lock consumed by the internal repository:

```json
{
  "schemaVersion": 1,
  "sdkCommit": "f2e8c12",
  "sdkTarballSha256": "sha256:...",
  "referenceBundle": {
    "url": "artifact://dreamboard-sdk/reference-games/f2e8c12.tgz",
    "sha256": "sha256:..."
  },
  "games": {
    "hearts": {
      "sourceSha256": "sha256:...",
      "compiledPackageSha256": "sha256:..."
    }
  }
}
```

Internal scripts may materialize this artifact into an ignored build directory.
Do not maintain a second editable committed source tree.

During migration, the old internal examples remain read-only. Delete them only
after Phase 07 parity passes and the existing demos are removed.

## Expected files

SDK repository:

```text
examples/reference-games/README.md
examples/reference-games/<reference-id>/**
scripts/ui/check-reference-games.mjs
scripts/ui/verify-reference-consumers.mjs
scripts/ui/build-reference-bundle.mjs
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-01-migration.md
package.json
```

Internal repository:

```text
examples/reference-bundle.lock.json
scripts/reference-games/materialize-reference-bundle.*
```

Do not edit the product demo catalog in this phase beyond ensuring reference
games cannot be registered accidentally.

## Verification

```bash
pnpm reference-games:check
pnpm pack:dry-run
pnpm reference-games:test:packed
pnpm format:check
```

For every reference game, capture:

- exact dependency graph;
- build and test result;
- source, lockfile, and package digests;
- absence of workspace links;
- rights manifest validation result;
- absence from the demo gallery registry.

## Acceptance criteria

- All authoritative public-safe reference source lives in
  `examples/reference-games/`.
- IDs are mechanic-based, with `hearts` retained.
- `sushi-go` is replaced by an original simultaneous drafting fixture.
- Every reference game builds and tests against the packed SDK from an isolated
  temporary directory.
- Every reference game has approved provenance metadata and no demo
  registration.
- The internal repository consumes a digest-pinned generated artifact.
- No editable source is authoritative in both repositories.

## Risks and controls

| Risk                                                      | Control                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| Public move accidentally carries protected text or assets | Per-game rights manifest, denylist scan, and human review        |
| Examples gain workspace-only behavior                     | Temporary packed-consumer build and dependency graph inspection  |
| Mechanic names become too vague for agents                | Index explicit `mechanics` and `uiPatterns`, not product aliases |
| Internal parity becomes difficult after source move       | Produce compiled, digest-pinned reference artifacts              |
| Reference fixtures leak onto the demo page                | Manifest default false plus registry guard                       |
