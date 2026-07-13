# Phase 07: Workbench, Demo, Derived Deletion, And Cross-Repository Cutover

Status: implementation in progress.

Depends on Phases 00-06.

Phase 06 must have published the exact SDK version and repinned all nine
package/lock pairs from public npm. A staged-only or sibling-checkout candidate
does not satisfy this entry criterion.

Primary repositories:

- `dreamboard-sdk` for rules, game source, manifests, authored scenarios, and
  scenario compilation;
- `dreamboard-games/dreamboard` for the public CLI and `dreamboard dev` host;
  and
- the private internal monorepo for demo admission, public demo sessions,
  performance execution, and landing-page presentation.

## Objective

Make one authored scenario path serve focused tests, Workbench, `dreamboard
dev`, browser proof, and product demos while preserving clear repository
ownership. All nine games must remain complete multi-turn games. Product demo
selection and presentation must not become another concept every SDK author has
to learn. After internal compilation proves it can regenerate a derived-free
Git archive, this phase performs the coordinated tracked-output deletion and
enables the strict source-size guard.

## Ownership Contract

| Concern                                  | Owner                          | Rule                                                                    |
| ---------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| Rules and theme                          | SDK game `rule.md`             | Sole gameplay authority                                                 |
| Reducer, manifest, UI and assets         | `dreamboard-sdk`               | Sole reference-game source                                              |
| Authored deterministic scenarios         | `dreamboard-sdk`               | One agent-optimized authoring path                                      |
| Scenario exploration and inspection      | Public SDK/CLI surface         | JSON-first; no private duplicate UX                                     |
| Local interactive hosting                | Public Dreamboard CLI/dev host | Consumes SDK-owned source or packed artifact                            |
| Demo admission and compilation           | Internal monorepo              | Verifies committed SDK source and public package provenance             |
| Demo catalog/session runtime             | Internal backend               | Serves active release and normal seeded sessions                        |
| Performance execution                    | Internal `tools/perf`          | Consumes compiled scenario/replay artifacts; does not author game rules |
| Landing selection and media presentation | Internal web/product           | Chooses a showcase subset independently of the nine-game SDK catalog    |

Do not copy reference-game reducers, scenarios, manifests, or rule summaries
into the public CLI or internal monorepo.

## One Scenario Source, Multiple Materializations

The authored source remains a typed game-local scenario under
`examples/reference-games/<id>/test/scenarios/`. From that source, tooling may
materialize:

- reducer conformance execution;
- Workbench projections and UI frames;
- a `dreamboard dev` session and optional browser-driving recipe;
- a product demo seed and normal-setup action prelude; and
- a normalized internal perf replay for one measured action.

Materialized products are disposable and environment-specific. They are not a
second authoring format and do not flow back into `rule.md` or scenario source.

Every game must have at least one complete seeded scenario from normal setup to
terminal outcome. Branch scenarios may stop after proving one rule, but the
full-game scenario cannot start from a checked-in base state.

Use one convention for each `complete-game.scenario.ts`: `given` is the legal
multi-turn prelude from setup to a representative developed state, and `when`
completes the remaining legal arc to terminal outcome. This gives every
consumer two generic structural checkpoints without adding authored checkpoint
names: `given:<given.length>` for the developed demo and
`when:<when.length>` for terminal proof.

### One versioned compiled replay DTO

Consume the SDK-owned library result implemented, tested with the internal
translator, and published in Phase 06; do not add a new author command or
change its schema during this phase:

```ts
type CompiledScenarioReplay<Game> = {
  readonly schemaVersion: 1;
  readonly scenario: {
    readonly path: string;
    readonly sourceDigest: `sha256:${string}`;
  };
  readonly definition: ScenarioReplayDefinition<Game>;
  readonly checkpoint: ScenarioCheckpoint;
  readonly expected: {
    readonly checkpointDigest: `sha256:${string}`;
    readonly publicProjectionDigest: `sha256:${string}`;
  };
};
```

`compileScenarioReplay({ scenarioPath, at })` is an SDK testing-library API
called by trusted dev-host, Workbench materialization, demo, and perf adapters.
Its `definition` is the canonical serializable Phase 01 projection and excludes
the function-valued `then`; `sourceDigest` still binds the assertions. It
contains no backend session ID, generated player ID, action-set version,
capability token, websocket frame, or private projection.

The definition can contain private sealed choices and discard parameters. It
must remain trusted tool/server-side input and must never enter a player or
spectator response, browser bundle, ordinary log, or public receipt. Workbench
and dev-host replay it before the browser boundary and send only the selected
perspective's projected checkpoint. Demo and perf bind it only inside their
trusted execution paths.

Internal activates the one translator implemented against the packed candidate
in Phase 06 from this DTO to its existing
`BrowserDemoScenarioSpec` / normalized websocket execution contract. The
translator creates a session, binds actor seats and every contract-marked
player-valued parameter seat ref to runtime player IDs, reads fresh action-set
versions/tokens, dispatches commands, and verifies the expected digests. The
internal execution DTO may remain private; its input schema and producer are
not a second authoring format.

## Retire The Private Scenario-Author UX

The internal `tools/scenario-author` command tree and its fixture-only Hex
workflow are superseded once the SDK-owned explore/inspect/scenario path is
available through the public CLI.

Hard-cut rules:

- agents learn one JSON-first authoring workflow;
- internal tooling must not expose parallel `init`, `observe`, `transitions`,
  `try`, `choose`, `checkpoint`, `search`, or compile semantics for game
  authors;
- no internal fixture adapter may become the authority for Stormtrail or any
  other reference game;
- `tools/perf` may consume a compiled scenario or normalized websocket replay;
  and
- runtime-only values such as session IDs, action-set versions, capability
  tokens, and player IDs are bound during internal execution, never committed
  to SDK source.

Delete the private root command, README guidance, fixture adapter, and tests
after every live caller uses SDK-authored compiled artifacts. Keep generic perf
execution and replay validation in `tools/perf`.

## Stable Identity And Public Names

Keep all existing technical identities stable:

- reference-game directory;
- `reference-game.json.id`;
- package identity; and
- `demoRelease.slug`.

Public display names, theme copy, resources, cards, art, and descriptions change
to the approved briefs. For example, the technical ID and slug remain
`hex-network-trading` while the public game name becomes **Stormtrail**.

This avoids breaking public URLs, active catalog keys, release-object
namespaces, stored demo-session identity, and internal perf inputs. Do not add a
slug alias system for this migration.

Update, at minimum, each game's:

- `reference-game.json` display and `demoRelease` metadata;
- authored manifest name and player bounds;
- UI title, terminology, accessibility copy, and assets;
- README and canonical-example index; and
- compiled scenario labels.

## Full-Game Demo Contract

All nine reference games are packageable, normal-setup, multi-turn demos. A
compact teaching variant means a focused rule surface, not a one-turn sample.

For every game, prove:

- normal setup from a seed;
- at least one complete round or turn rotation when the game has rounds or
  multiple players;
- meaningful state development beyond the opening interaction;
- legal terminal outcome through the full-game scenario;
- reconnect-safe projection at a developed state; and
- desktop and mobile usability appropriate to its declared public metadata.

The internal product chooses which games appear on the landing page. Do not add
a required `landingDemo` concept to the SDK framework. Staging may continue to
exercise all packageable games through `preview-all`; landing publication uses
an explicit product-owned subset.

The browser showcase gate is presentation evidence, not the rules oracle. Rule
correctness remains the SDK full-game and branch scenario suite.

The product-owned landing selection is one ordered allowlist in internal web
source, for example
`apps/web/src/features/landing/demo-showcase.ts`. It contains stable demo slugs
only and filters the active demo catalog at presentation time. Tests must prove
that every allowlisted slug exists in the active-catalog fixture, is available,
has a complete-game browser receipt, and is rendered in configured order;
non-allowlisted `preview-all` entries remain directly playable but do not appear
on the landing page. Do not put this allowlist in SDK metadata or overload
`available: false` as a visibility flag.

## Demo Admission And Lock Provenance

The internal demo-release path currently reads each selected SDK game's
`reference-game.json`, `package.json`, and `pnpm-lock.yaml`; it hashes the
package and lock and verifies that every game resolves the same exact public SDK
version and npm integrity.

Keep this contract. Phase 07 must not weaken admission, accept workspace links,
or infer package provenance from the internal checkout. The Phase 06/07 codegen
cutover removes generated files from the admitted source archive without
changing the package/lock identity being admitted.

Internal compilation must invoke the workspace adapter from the exact installed
public SDK after admission and before TypeScript compilation. Use the existing
`generateWorkspaceArtifacts` ownership metadata rather than copying codegen
logic into internal:

- write or replace only outputs classified `ownership: "authoritative"`;
- preserve SDK seed/authored files and reject any attempted ownership
  collision instead of overwriting them;
- generate into an isolated materialized workspace, never the admitted Git
  archive;
- verify the path, ownership class, and digest of every emitted artifact; and
- bind generated-output and exact SDK/compiler identity into
  `bundleFingerprint`, while `sourceFingerprint` remains the canonical authored
  Git inventory from Phase 06.

Invoke the exact SDK's source-manifest collector over the admitted archive and
verify the versioned `reference-game-source-manifest.json` object list before
generation. Every path, byte length, and digest must match; strict admission
rejects an extra unlisted object under a game root. Internal consumes the
verified contract digest as `sourceFingerprint` and deletes its separate
extension/path allowlist and synthesized fingerprint manifest.

Do not add an admission option for arbitrary prebuilt archive bytes. Before
deleting SDK-tracked output on the integration branch, create the exact reviewed
Phase 07 SDK tree as a real commit in a disposable clone of the Phase 06 commit.
The clone must retain the canonical GitHub `origin`; its commit applies only the
complete reviewed Phase 07 SDK patch: derived deletions, derived ignore rules,
strict guard wiring, curated SDK-owned thumbnails, and final reference-game
demo metadata including screenshot/hero-path removal. Point
`DREAMBOARD_SDK_REPO` at that clone and run ordinary `pnpm demo-release pack`.
The existing preflight must resolve the clone's HEAD, confirm the canonical
origin, and create its own `git archive` from that commit.

Record the candidate commit/tree, source-manifest digest, generated-output
digests, and bundle digests. Then apply the identical reviewed tree to the SDK
integration branch, commit it, and repeat ordinary admission from that commit.
The relevant SDK tree and all nine compiled bundle digests must agree. The
disposable commit is a provenance-safe preflight, not a production escape hatch
and not evidence that an uncommitted or filtered working tree was admitted.

## Demo Media Contract

The current SDK metadata points `heroImageUrl` at
`/demos/<slug>/desktop.png`, but those static internal web assets do not exist.
The internal landing card also hard-codes `/demos/<slug>/thumb.png` even though
the demo API returns a release-backed `thumbnailUrl`.

Cut over as follows:

1. Every landing-allowlisted game stores a curated thumbnail in its SDK-owned
   assets and declares the game-relative path through
   `demoRelease.thumbnailPath`.
2. Omit the broken `/demos/<slug>/desktop.png` `heroImageUrl` values.
3. Internal demo-release assembly packages `thumbnailPath` into the immutable
   release and exposes `/api/demo-games/<slug>/thumbnail`.
4. Internal landing and demo dialogs resolve the API `thumbnailUrl`; they do not
   synthesize a `/demos/<slug>/thumb.png` path.
5. The landing component has a tested accessible no-image fallback for a null
   or failed thumbnail, while CI still rejects an allowlisted game with no
   packaged thumbnail.
6. Delete all nine currently ignored `demoRelease.screenshot` metadata blocks;
   no release assembler consumes them. Reintroducing screenshot/video presets
   requires a separate product-owned schema and consumer.
7. Delete obsolete checked screenshots only after every live consumer uses the
   release-backed thumbnail or the tested fallback.

Future screenshot presets or marketing-video composition remain a separate
optional product-demo concern. They must not become mandatory reference-game
or SDK framework concepts.

## Stormtrail Perf Cutover

Replace the current Hex replay rather than carrying legacy actions forward. The
replacement should use a name such as `stormtrail-trade-reject` while retaining
the stable `hex-network-trading` demo slug.

The compiled path must reflect the approved game:

- three players and one starting camp/trail pair each;
- `placeStartingCamp` and `placeStartingTrail`;
- `intersectionId` rather than `vertexId`;
- `discardSupplies` and `moveBandits`;
- Timber, Brick, and Provisions;
- one bilateral `targetPlayerId`; and
- target-owned `rejectTrade` or `acceptTrade`, never offeror `cancelTrade`.

Update the internal perf workload, setup prelude, default replay, executor bench,
tests, docs, and any retained UI fixture together. The perf replay may be short
because it measures one repeatable command; it does not replace the SDK's full
Stormtrail playthrough.

Keep `BrowserDemoScenarioSpec` only if it remains the internal execution DTO
produced by the single translator above; it cannot remain an authored or
checked SDK-game specification. Delete its private author/compiler path and
game-shaped sample artifacts. Contract tests that need a sample use a small
synthetic fixture rather than another compiled copy of Stormtrail. If no live
runtime needs the DTO after the translator cutover, delete the type as well.

## Cross-Repository Sequencing

Execute this phase in dependency order:

1. **Verify the Phase 06 release checkpoint**
   - verify the exact public SDK version, tarball digest, npm integrity, and nine
     repinned game locks;
   - verify public CLI/dev and SDK Workbench use the on-demand contracts; and
   - compile `CompiledScenarioReplay` from every complete-game scenario.
2. **Activate the pretested internal admission/compiler cutover before deletion**
   - pin the same exact public SDK artifact already named by the game locks;
   - preserve per-game package/lock validation;
   - invoke the exact installed SDK adapter with ownership/collision/digest
     enforcement; and
   - create the real disposable deletion-candidate commit described above and
     prove ordinary admission, source-manifest verification, generation, and
     compile from its self-produced Git archive.
3. **Commit the identical final SDK tree**
   - delete every Phase 00/06 deletion-ledger path, including game base/generated
     trees, workspace-codegen output, checked Workbench fixtures/catalog, and
     obsolete screenshots;
   - add ignore rules derived from ownership inventory;
   - add the curated landing thumbnails and remove obsolete screenshot and
     broken hero-path metadata;
   - enable strict `reference-games:source-size:check` in `pnpm check`; and
   - verify its relevant tree equals the proven disposable candidate; and
   - rerun SDK/public/Workbench gates from the ordinary deletion commit.
4. **Cut over internal perf, release media, and landing before final publication**
   - replace Stormtrail replay consumers;
   - translate the SDK compiled replay DTO at execution time;
   - consume, package, and serve the already-proven SDK-owned thumbnails through
     demo release/API;
   - filter the landing through the product allowlist and consume API-backed
     thumbnails/fallbacks;
   - remove internal hard-coded demo image paths; and
   - pass focused compiler, perf, API, and web component tests without claiming
     final browser proof yet.
5. **Prove the actual admitted archive and activate the final state locally**
   - admit the derived-free SDK Git commit with its nine retained locks;
   - regenerate before compile and compare its bundle digest to the disposable
     commit proof;
   - run required local demo-release publication only after the Step 4 source
     cutover; and
   - run the dedicated all-nine browser gate, including the chosen showcase
     subset's multi-turn, landing-order, thumbnail, and fallback evidence.
6. **Delete remaining private legacy consumers**
   - remove the private scenario-author UX, stale compiled scenario artifacts,
     and superseded fixtures only after their successors pass.

Do not reorder the disposable deletion-candidate commit proof, identical SDK
integration commit, and post-commit admission proof. Do not republish or
hand-edit locks in this phase; Phase 06's exact public package is frozen input.

## Local SDK Gates

```bash
mise exec node@24 -- pnpm reference-games:source-size:check
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:workbench:build
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm ui:test:packed
mise exec node@24 -- pnpm pack:consumer-check
mise exec node@24 -- pnpm check
```

These prove SDK source and packed behavior only. They do not prove private demo
admission, landing presentation, or a live deployment.

## Public Dreamboard Gates

Run against the exact published SDK version frozen in Phase 06:

```bash
pnpm typecheck
pnpm test
pnpm skills:sync-docs
pnpm docs:validate
pnpm docs:broken-links
pnpm cli:stage:publish
pnpm cli:pack:publish
pnpm dev-host:stage:publish
pnpm dev-host:pack:publish
```

Retain the public authoring compatibility receipt proving the packed CLI,
dev-host, and exact SDK artifact work together.

## Internal Focused Gates

Run only after the same SDK version is available through the admitted public
package path:

```bash
./gradlew :packages:demo-release-core:test :apps:backend:test
pnpm demo-release pack
pnpm --dir tools/perf test
pnpm --dir tools/perf typecheck
pnpm --dir tools/perf lint
pnpm --dir apps/web build
pnpm --dir apps/web lint
pnpm verify:dev
pnpm verify:browser
pnpm demo-release publish
pnpm demo-release verify-browser --all-active
pnpm verify:package
pnpm fin
```

`pnpm demo-release pack --dry-run` is not sufficient because it does not compile
the admitted archived sources. Local stack activation and
`pnpm demo-release publish` are required merge gates for this phase so the
thumbnail API, active catalog, all-nine demo materialization, and selected
multi-turn browser paths are actually exercised. If the local stack is
unavailable, the phase is blocked rather than marked complete. `pnpm staging
demo-release --yes` mutates staging and remains a separately authorized live
gate; it is not required for source/merge closure unless the release owner asks
for it.

Add `pnpm demo-release verify-browser --all-active` as the dedicated
post-publication local gate. It consumes the latest local publish receipt,
enumerates exactly the nine active demo slugs, and for each slug uses the
trusted compiled `complete-game.scenario.ts` to verify the developed
`given:<given.length>` checkpoint, reconnect-safe browser projection, and
terminal `when:<when.length>` outcome. It exercises declared desktop/mobile
surfaces, confirms the release-backed thumbnail or accessible non-allowlisted
fallback, and records the ordered landing-allowlist evidence separately. The
command emits one machine-readable receipt. The generic `pnpm verify:browser`
remains useful product-harness coverage but does not satisfy this all-nine gate.

For the replacement replay, retain a diagnostic local-AWS receipt from:

```bash
pnpm perf browser-demo-latency \
  --target local-aws \
  --replay tools/perf/replays/stormtrail-trade-reject.websocket-replay.json \
  --vus 1 \
  --out .perf/runs/stormtrail-trade-reject
```

## Acceptance Receipt

Write
`artifacts/phase-07-workbench-demo-and-cross-repo-cutover-receipt.md` with:

- SDK, public Dreamboard, and internal commit IDs;
- exact SDK version, tarball digest, and npm integrity;
- nine-game packed and local demo-release results;
- scenario materialization, adapter ownership/collision/digest evidence, and
  distinct source/bundle fingerprint evidence;
- disposable-candidate versus integrated derived-free Git tree and
  bundle-digest comparison;
- final zero-forbidden-path and source-size receipt from strict mode;
- retained per-game lock count and shared SDK identity;
- private scenario-author deletion evidence;
- Stormtrail replay path and perf receipt;
- landing showcase slugs and multi-turn browser receipts;
- ordered landing allowlist, thumbnail object/API evidence, and no-image
  fallback proof; and
- explicit separation of local proof from staging proof.

Do not copy private logs, secrets, session credentials, or unpublished internal
source into the public receipt.

## STOP Conditions

Stop the phase if:

- a second game-authoring UX remains necessary in the internal monorepo;
- Workbench, dev, browser, demo, and perf cannot derive from SDK-authored
  scenarios;
- the exact installed SDK adapter would overwrite a seed/authored file, cannot
  report ownership/digests, or differs from local generation;
- disposable-candidate and integrated post-deletion trees or bundle digests
  differ;
- strict source-size mode finds any tracked base/generated/Workbench/screenshot
  path after the deletion commit;
- any repository consumes uncommitted SDK working-tree state;
- package or lock provenance is weakened to make demo packing pass;
- a stable technical ID or slug must change without a separate migration;
- a product thumbnail still relies on a nonexistent `/demos/...` static path;
- a showcase game proves only its first interaction or cannot reach terminal;
- the internal active catalog metadata disagrees with the game manifest;
- an allowlisted landing game lacks a packaged thumbnail or the landing lacks a
  tested fallback;
- required local demo publication, API, browser, or perf proof cannot run; or
- local cross-repository proof is being represented as staging closure.

Phase 07 closes only after the successor paths pass, strict source-size mode is
green, and every listed legacy consumer/path is deleted. Staging remains an
explicitly separate live gate.
