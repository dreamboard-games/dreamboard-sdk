# Phase 06: On-Demand Derived Artifacts And Public Release Checkpoint

Status: complete.

Depends on Phases 00-05. Those phases must leave all nine implementations and
their authored scenarios conforming to the approved `rule.md` files before this
phase rewires derivation and publishes the exact SDK runtime needed by internal
consumers.

Primary repository: `dreamboard-sdk`, with one pre-publication compatibility
slice in `internal` for the consumer that freezes the public replay contract.

## Objective

Make generated workspace contracts, test projections, Workbench bundles,
catalogs, and screenshots reproducible on-demand products rather than runtime
inputs. Publish the immutable SDK version containing those generator/runtime
contracts and repin all nine isolated games before internal admission
activation.

This phase prepares the source-authority and repository-size hard cut. It does
**not** remove tracked derived paths: Phase 07 first cuts the internal compiler
and demo consumers over, proves a derived-free Git archive, then performs the
coordinated deletion and enables the strict guard. It is never permission to
remove the nine isolated-consumer lockfiles.

## Measured Baseline

The pre-cut inventory reports 249,319 lines when `wc -l` is run over every
tracked file in the nine game roots. Of those, 3,800 are newline bytes inside
the 11 PNG screenshots. The meaningful tracked-text baseline is 245,519 lines,
plus 1.17 MB of binary screenshots.

| Inventory                                    | Tracked text lines | Share of tracked text | Disposition                             |
| -------------------------------------------- | -----------------: | --------------------: | --------------------------------------- |
| Workspace-codegen output                     |             92,907 |                 37.8% | Generate locally; do not track          |
| Test generated output                        |            103,911 |                 42.3% | Generate locally; do not track          |
| Combined generated workspace and test output |            196,818 |                 80.2% | Remove from Git                         |
| Nine `pnpm-lock.yaml` files                  |             12,323 |                  5.0% | Retain and verify                       |
| Authored source, docs, tests, and metadata   |             36,378 |                 14.8% | Retain, then simplify where rules allow |

Additional checked output outside that line total includes:

- 26,872 lines under `fixtures/ui/reference-games/`;
- 597 lines in `packages/ui-workbench/src/catalog.ts`; and
- approximately 1.17 MB of obsolete worker-placement screenshots under
  `examples/reference-games/worker-placement-tableau/test/screenshots/`.

Record the refreshed counts and tracked-path inventory in
`artifacts/phase-06-derived-artifact-materialization-receipt.json` before
rewiring and again after every Phase 06 gate passes. Phase 07 owns the final
deletion receipt.

## Retained Isolated-Consumer Lockfiles

Retain exactly one `pnpm-lock.yaml` in each of the nine reference-game roots.
Do not consolidate them into a shared lockfile and do not replace their exact
public SDK dependency with a workspace link.

The locks prove two distinct boundaries:

1. each game can install as an isolated external consumer; and
2. private demo-release admission can hash `package.json` plus `pnpm-lock.yaml`
   and verify the exact public `@dreamboard-games/sdk` version and integrity.

All nine locks must:

- resolve one exact public SDK version;
- carry the public npm integrity for that version;
- contain no `workspace:`, `link:`, sibling path, local registry, or tarball
  shortcut for the SDK;
- be reproducible through the tool-owned repin command; and
- stay below a combined 15,000 tracked lines unless a reviewed package-manager
  format change explains the increase.

The lockfiles account for only 4.9% of the current reference-game lines. They
are not the source-size problem this phase is solving.

## Workspace-Codegen Generated Inventory

The canonical inventory is
`packages/workspace-codegen/src/ownership.ts` rather than a second hand-written
list in each game. At the start of this phase it contains these dynamic paths:

```text
shared/manifest-literals.ts
shared/manifest-types.ts
shared/manifest-static.json
shared/manifest-runtime.ts
shared/manifest-contract.ts
shared/generated/ui-contract.ts
app/index.ts
app/tsconfig.framework.json
ui/tsconfig.framework.json
```

For every reference game:

- make local build/dev/test/pack/Workbench consumers generate these paths on
  demand;
- prepare ignore rules derived from this ownership inventory for Phase 07;
- keep generation deterministic from `manifest.ts` plus the SDK candidate;
- never hand-maintain a copied generated-path list in release, Workbench, or
  demo tooling; and
- add a strict tracked-path guard but keep it in explicit audit mode until the
  Phase 07 deletion commit.

The owning generator may still write these files into the working tree or a
temporary materialized workspace. Their local existence is not an error; their
presence in the Git index becomes an error only when Phase 07 enables strict
mode.

## Test State And Generated Output Readiness

Prove no authored scenario or local consumer imports the following, then mark
them deletion-ready for Phase 07:

```text
examples/reference-games/*/test/generated/**
examples/reference-games/*/test/bases/**
```

`test/generated/**` is derived output. `test/bases/**` is a checked-in shortcut
to legacy mid-game state and is not a rules authority. Replace every consumer
with one of:

- normal setup plus a deterministic seed and recorded entropy trace;
- a short authored legal-action prelude from normal setup; or
- a pure unit test that constructs inputs for an isolated scoring or selection
  function without claiming end-to-end rule conformance.

Do not recreate base states under another name. A scenario may cache a local
checkpoint while exploring, but compiled checkpoints are disposable and must
not be checked in. If an end-to-end rule branch cannot be reached by legal
replay in these deliberately compact games, stop and record the missing generic
capability; do not add a state patch, exact-outcome queue, reusable arrange
layer, or test-only setup profile.

## Workbench On-Demand Cutover

Make Workbench build and test materialize these products into a temporary or
ignored output root, while leaving their existing tracked bytes in place until
Phase 07:

```text
fixtures/ui/reference-games/**
packages/ui-workbench/src/catalog.ts
```

Delete any additional generated index only if Phase 00 proves that it is owned
entirely by this reference-game compiler. Do not remove a shared component or
Storybook index merely because it is generated.

Rework the concrete consumers together:

```text
scripts/ui/generate-scenario-catalog.mjs
scripts/ui/scenario-catalog-lib.mjs
scripts/ui-fixtures/compile-reference-fixtures.mjs
scripts/ui-fixtures/check-fixtures.mjs
scripts/ui/open-ui-workbench.mjs
scripts/ui/run-packed-ui-scenarios.mjs
scripts/ui/verify-reference-consumers.mjs
scripts/ui/verify-publishable-reference-games.mjs
packages/ui-workbench/src/app.tsx
packages/ui-workbench/src/scenario-page.tsx
packages/ui-workbench/src/fixture-modules.d.ts
packages/ui-workbench/vite.config.ts
packages/ui-workbench/tsconfig.json
packages/ui-workbench/package.json
package.json (`ui:check:baseline` and dependent check/release-proof scripts)
```

Check mode must compile the same inputs into two fresh temporary roots, compare
canonical digests, and validate the generated catalog against those roots. It
must not compare a fresh build to the soon-to-be-deleted checked `index.json`
or `catalog.ts`.

The authored scenario modules and component-story sources remain. Workbench
must compile the same scenarios used by reducer tests; it must not require a
committed fixture bundle or generated catalog to discover them.

Use one generated-root module boundary consistently in build, dev, and
Playwright. The materializer returns an ignored/temporary root containing the
catalog module, projected fixture modules/assets, and a canonical digest. A
Vite plugin resolves `virtual:dreamboard-scenario-catalog` to that root and
serves `/fixtures/` from that root; `app.tsx` and `scenario-page.tsx` import the
virtual module and stable source-owned catalog types, never `./catalog.js`.
Update `fixture-modules.d.ts`, TypeScript includes, Vite aliases, and package
scripts together. Every Workbench entry command invokes the materializer first
and passes the resulting root explicitly. No build mode may fall back to
`fixtures/ui/reference-games` or a tracked catalog when the root is absent.

The materializer is the trusted consumer of `CompiledScenarioReplay`; it
replays commands outside the browser build and writes only the selected
perspective's projected checkpoint. Neither the full replay definition nor
private command parameters may be imported by a browser module.

Required scenario IDs remain enforced from authored metadata. Moving the
catalog out of Git must not make required coverage optional.

## Obsolete Screenshot Readiness

Unlink and mark deletion-ready
`examples/reference-games/worker-placement-tableau/test/screenshots/**` after
all docs and tests stop linking to it. The approximately 1.17 MB image set
depicts the superseded larger worker-placement game and is neither a visual
baseline nor approved demo media.

Product thumbnails introduced in Phase 07 are a separate, explicitly curated
asset class. Do not retain old test screenshots merely because a product demo
will eventually need a thumbnail.

## On-Demand Materialization Contract

The following SDK/public entry points must work against a temporary source copy
from which all deletion-ledger paths have been omitted, even though Phase 06
still retains those paths in Git:

| Entry point                         | Required behavior                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| SDK/root build                      | Generate workspace contracts before compiling their consumers                                         |
| `dreamboard dev` source preparation | Materialize the selected game into an ignored or temporary workspace                                  |
| Focused game test                   | Generate only that game's contracts and scenario products                                             |
| Packed-consumer test                | Install the candidate SDK and generate inside the disposable consumer                                 |
| Workbench build/test                | Compile authored scenarios and catalog into its output directory                                      |
| Internal demo-release compile       | SDK contract plus internal packed-candidate pretest here; exact-public archive activation in Phase 07 |

Generation must be idempotent. A second run over identical inputs must produce
byte-identical outputs or an equivalent canonical digest.

## Source And Bundle Fingerprint Contract

Preserve the existing distinction instead of collapsing generator identity into
source identity:

- `sourceFingerprint` identifies committed authored reference-game input from a
  canonical Git-object/archive inventory. It excludes paths declared derived by
  workspace-codegen ownership, test/Workbench output, local checkpoints,
  `node_modules`, and build directories.
- `bundleFingerprint` binds `sourceFingerprint` to the exact public SDK,
  generator/compiler identity, generated authoritative-output digests, and
  final compiled bundle.

Make the versioned `reference-game-source-manifest.json` payload the canonical
authored-object inventory for both repositories. Its sorted `objects` entries
carry repo-relative path, byte length, and SHA-256. Its versioned inventory
policy derives workspace output exclusions from
`packages/workspace-codegen/src/ownership.ts` and classifies the fixed test,
Workbench, local-cache, dependency, and build output roots. Do not retain the
current walk-every-file behavior and do not duplicate this policy as a Kotlin
extension/path allowlist.

Internal admission must verify every listed object against the archive, reject
a missing or mismatched object, and—once Phase 07 enables strict mode—reject an
unlisted object under a reference-game root. `sourceFingerprint` is the
contract's canonical digest of that verified inventory. Do not synthesize a
second `manifest.json` into the internal fingerprint. Internal admission
already begins from a Git archive, so ignored working-tree state cannot enter
the inventory; Phase 07 proves that no tracked derived object remains either.

Add focused proofs that:

- materializing local outputs before source-manifest construction does not
  change `sourceFingerprint`;
- changing authored source changes both source and bundle fingerprints;
- changing only the exact SDK/generator changes `bundleFingerprint` but not
  `sourceFingerprint`; and
- a stale generated file cannot hide an authored-source change because
  generation replaces authoritative outputs before bundle hashing.

## CI Guard And Size Budget

Add `pnpm reference-games:source-size:check` with `--audit` and strict modes.
Phase 06 runs audit mode; Phase 07 makes strict mode part of `pnpm check`. Strict
mode must fail when:

- any canonical workspace-codegen generated path is tracked beneath
  `examples/reference-games/*`;
- `test/generated/**`, `test/bases/**`, checked Workbench output, or the obsolete
  screenshot directory is tracked;
- there are not exactly nine tracked per-game `pnpm-lock.yaml` files;
- the nine locks exceed 15,000 lines without an explicit updated baseline; or
- tracked reference-game text exceeds 75,000 lines after the hard cut.

The measured stable footprint after deleting current derived material is about
48,701 lines including locks. The 75,000-line ceiling leaves room to complete
the four currently thin games without allowing generated output to return.
After Phase 07 closes, a change that increases this budget by more than 5% needs
an approved plan amendment with authored-source justification.

Define the count algorithm exactly:

1. enumerate index entries below each of the nine game roots with
   `git ls-files -s -z`, not working-tree `find` output;
2. classify text through one checked extension allowlist covering the repo's
   source/config/doc formats—initially `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`,
   `.json`, `.jsonl`, `.md`, `.yaml`, `.yml`, `.toml`, `.css`, `.html`, `.svg`,
   `.txt`, plus `.gitignore`—and reject an unclassified extension/basename;
   classify `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.woff`, `.woff2`,
   `.ttf`, `.otf`, `.mp4`, `.webm`, `.zip`, and `.gz` as binary;
3. read the index blob by object ID, count logical LF-delimited lines, and count
   a nonempty final unterminated line once;
4. exclude binary bytes from the text-line ceiling and report their bytes by
   class; and
5. report authored text, retained locks, forbidden generated classes, and
   binary assets separately.

Forbidden Workbench/catalog path checks run against the full repository index;
the 75,000-line budget itself covers only the nine game roots.

This makes local and CI counts independent of line endings, ignored files, and
unstaged worktree material. Audit mode reports every future strict failure but
returns success while Phase 07's tracked deletion is intentionally pending.

## Mandatory Public SDK Release Checkpoint

Internal admission cannot consume a staged or sibling-only SDK candidate, and
`reference-games:repin` intentionally fetches public npm. After all
package-affecting SDK runtime/generator and game-behavior changes for Phases
01-06 are frozen:

Before publication, implement and export this versioned library contract:

```ts
type CompiledScenarioReplay<Game> = {
  readonly schemaVersion: 1;
  readonly scenario: {
    readonly path: string;
    /** Covers the local module graph, including non-serialized `then`/helpers. */
    readonly sourceDigest: `sha256:${string}`;
  };
  /** Canonical serializable Phase 01 projection; never contains `then`. */
  readonly definition: ScenarioReplayDefinition<Game>;
  readonly checkpoint: ScenarioCheckpoint;
  readonly expected: {
    readonly checkpointDigest: `sha256:${string}`;
    readonly publicProjectionDigest: `sha256:${string}`;
  };
};
```

`compileScenarioReplay({ scenarioPath, at })` emits normal setup and canonical
accepted authoring commands. Player-valued parameter leaves remain seat refs
until the trusted executor binds runtime player IDs. The DTO contains no
backend IDs, tokens, websocket frames, assertion function, or private
projection. It can contain sealed choices or private discard parameters, so it
is trusted tool/server-side input only: never serialize it to a player or
spectator response, browser bundle, ordinary log, or public receipt. Dev,
Workbench, demo, and perf adapters materialize perspective-safe output from it
without gaining another author command.

Implement the internal schema parser, exact-SDK workspace-generation adapter,
and replay translator before freezing this schema. The translator binds seat
refs, including nested player-valued parameters, to runtime IDs and rejects an
unknown schema version. Its packed-candidate test installs the SDK tarball into
a disposable consumer, creates a derived-free source copy by omitting exactly
the Phase 00 deletion ledger, compiles all nine complete-game replays,
exercises authoritative-output ownership/collision/digest handling, and proves
the browser-facing product contains only projected checkpoints. Against that
same copy it invokes the packaged source-manifest collector and the internal
parser, verifies the canonical inventory/fingerprint, then proves
missing-object, digest-mismatch, and extra-object rejection. This is a
test-only tarball/source-fixture seam; production demo admission continues to
accept only an exact public SDK selected by the retained package/lock
provenance.

Execute the checkpoint in this order:

1. build and test one packed SDK candidate;
2. run public Dreamboard compatibility against that tarball;
3. run the internal source-manifest, adapter, and translator packed-candidate
   test against that same tarball;
4. freeze `CompiledScenarioReplay` only after both consumers pass;
5. publish that exact immutable SDK version to the normal public prerelease
   channel;
6. record source commit, tarball SHA-256, npm integrity, and package exports;
7. run the tool-owned `pnpm reference-games:repin <exact-version>`;
8. verify all nine package/lock pairs resolve the same public version and
   integrity with no workspace/local shortcut; and
9. commit the nine mechanical repins before Phase 07 begins.

This publication is an explicit execution-phase release action, not something
Phase 08 may defer or replace with local staging. Phase 08 verifies the frozen
release; it does not create it.

## Required Gates

Run local gates from a clean SDK checkout and from a temporary copy with every
deletion-ledger path omitted. Tracked derived paths still exist in the Phase 06
branch, so use audit mode rather than claiming the strict hard cut:

```bash
mise exec node@24 -- pnpm reference-games:source-size:check --audit
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:workbench:build
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm pack:consumer-check
mise exec node@24 -- pnpm check
git diff --check
git status --short
```

Before publication, also run the internal packed-candidate compatibility test
with the absolute tarball path through a test-only environment seam:

```bash
DREAMBOARD_SDK_TARBALL=/absolute/path/to/dreamboard-games-sdk.tgz \
  ./gradlew :packages:demo-release-core:test \
  --tests '*PackedSdkCandidateCompatibilityTest'
```

That test seam must not be read by `demo-release pack` or `publish`.

After the gates, remove ignored local outputs and repeat the focused build,
packed test, and Workbench build. This proves no previous materialization was a
hidden prerequisite. Then perform the mandatory publish/repin checkpoint and
run `reference-games:verify-publishable` plus packed verification against the
public version. `reference-games:verify-publishable` is intentionally
post-publication: it requires the nine locks to match the now-public package and
cannot be a candidate-tarball gate.

## STOP Conditions

Stop Phase 06 and do not delete or commit around the problem if:

- any SDK build, public dev/test, packed, or Workbench consumer still reads a
  generated path before invoking codegen;
- source fingerprints change merely because ignored output exists;
- the internal packed-candidate consumer cannot parse, generate, translate, or
  projection-safely materialize the proposed replay schema before publication;
- required scenario discovery depends on the checked catalog;
- a test still requires `test/bases/**` for normal setup or terminal proof;
- the exact SDK adapter/runtime cannot be published or all nine games cannot be
  repinned from public npm;
- a proposal attempts to consolidate, delete, or workspace-link the nine
  lockfiles; or
- the clean-checkout rerun cannot reproduce the first run.

Phase 06 is complete only when:

- the temporary derived-free SDK/public/Workbench proof passes;
- audit mode records the exact tracked paths Phase 07 must delete;
- Workbench check mode compiles twice in temporary roots rather than reading
  checked output;
- source and bundle fingerprints obey the distinct contracts above;
- the internal adapter/translator passes against the exact packed candidate
  before the public schema is frozen, including source-manifest collection and
  positive/negative internal verification;
- the exact SDK release is public and all nine valid locks are repinned to it;
  and
- no tracked derived path has yet been deleted ahead of internal clean-archive
  proof.
