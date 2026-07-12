# Phase 00 Deletion And Migration Ledger

Recorded on 2026-07-13 from the SDK planning baseline
`05509e395bb5b6ec28cac4b7724a649ea9e56988`.

This is an inventory and ordering receipt, not deletion authorization. No game
source or derived output was changed while producing it.

## State Model

Every deletion advances through this exact sequence:

```text
discovered -> replacement implemented -> clean-clone regenerated ->
all consumers migrated -> tracked-path guard green -> deleted
```

Entries begin as `discovered`. A later phase may advance a row only when the
row's replacement, consumer proof, and guard are recorded. In particular,
tracked generated output remains until Phase 07's disposable-commit admission
proof succeeds.

## Mandatory Order

1. Phase 01 replaces the framework and CLI base/snapshot runtime.
2. Phases 02-05 migrate every game to normal setup plus legal command replay,
   removing authored base and test-only profile dependencies game by game.
3. Phase 06 makes workspace generation and Workbench compilation on-demand,
   proves clean-clone regeneration, and publishes the exact SDK candidate.
4. The nine retained locks are mechanically repinned to that public version;
   they are never deletion candidates.
5. Phase 07 proves internal archive admission and compilation from a real
   disposable deletion-candidate commit, then deletes the identical tracked
   derived paths, enables the strict guard, and repeats ordinary admission.
6. Phase 07 retires the private internal authoring UX only after perf and demo
   consumers accept SDK-authored compiled replay.
7. Phase 08 regenerates or rewrites stale documentation and proves no active
   old vocabulary or path remains.

## Framework Base And Snapshot Surface

| Deletion                                                                                                                    | Current location                                                | Replacement                                                                                        | Owner | Downstream consumers                                                            | Clean-clone proof                                                                           | Final guard                                                                                             | State      |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `BaseDefinition`, `BaseContext`, `defineBase`, scenario `from`, `extends`, imperative `when`, and `patchState`              | `packages/sdk/src/testing/definitions.ts`                       | Bound self-contained scenario with `setup`, serializable `given`/`when`, and read-only `then`      |    01 | SDK testing exports; five generated game wrappers; public CLI harness/templates | Pack SDK; scaffold a new project; execute its scenario without bases or state mutation      | SDK negative type tests plus zero-match base-vocabulary grep                                            | discovered |
| `BaseStateArtifact`, `CandidateVerificationBase`, `CandidateVerificationInput.bases`, normalization, and snapshot hydration | `packages/sdk/src/testing-runtime.ts`                           | Candidate verification delegates to the canonical normal-setup replay                              |    01 | Candidate verification and packed SDK consumers                                 | Candidate verification executes from only reducer plus scenarios in a clean packed consumer | SDK tests reject a `bases` property or supplied snapshot                                                | discovered |
| `CreateTestRuntimeOptions.baseId`, `baseStates`, fingerprints, public player-ID hydration, and initial snapshot clone       | `packages/sdk/src/testing/create-test-runtime.ts` and its tests | `replayScenario({ game, scenario, at })` constructs normal setup and dispatches canonical commands |    01 | Candidate verification, CLI reducer-native harness, fixture compiler            | Same scenario/checkpoint digests from two clean packed runs                                 | Zero `baseId`, `baseStates`, `BaseStateArtifact`, or base-fingerprint matches in public testing runtime | discovered |
| Base-state stale-artifact kind and repair copy                                                                              | `packages/sdk/src/reducer/stale-contract-artifact-error.ts`     | Scenario source/replay validation errors; retain only independently needed session-state behavior  |    01 | Test runtime and generated agent reference                                      | SDK test demonstrates no base-state stale error or `test generate` repair path              | Generated reference plus source grep                                                                    | discovered |
| `generateTestArtifacts` and generated path `test/generated/base-state.json`                                                 | `packages/sdk/src/authoring/adapter.ts`                         | No persistent test artifact; scenario replay materializes transient checkpoints                    | 01/06 | Project adapters, source-manifest inventory, internal compilation               | Packed adapter emits authoritative workspace outputs without a test-state artifact          | Adapter test and strict source-size guard                                                               | discovered |

The files may be refactored rather than deleted wholesale. The listed symbols,
branches, options, and emitted artifacts are the deletion units.

## Twelve Authored Bases

These are all results from:

```bash
git ls-files 'examples/reference-games/*/test/bases/*.base.ts'
```

The command exited `0` and returned exactly 12 paths.

| Authored base                                                              | Replacement proof                                                                            | Owner | Consumers to migrate                                                        | Clean-clone proof                                                            | Final guard                                      | State      |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----: | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| `deck-building-market/test/bases/after-play-all-treasures.base.ts`         | Sketchbook turn-ordering, zone/reshuffle, and actionability replays from normal setup        |    05 | Scenarios whose `from` is this base; CLI base loader; generated base module | Sketchbook scenario suite and complete game pass from a derived-free archive | No tracked `test/bases/**`; scenario/source grep | replacement implemented |
| `deck-building-market/test/bases/empty-masterpiece-before-endturn.base.ts` | Sketchbook legal ending branches                                                             |    05 | Terminal scenario, test-only profile, CLI generator                         | Separate supply-ending legal replays pass                                    | Same                                             | replacement implemented |
| `deck-building-market/test/bases/initial-turn.base.ts`                     | Sketchbook setup, action, buy, cleanup, and complete-game replays                            |    05 | Most existing Sketchbook scenarios, Workbench buy-flow, dev materialization | Complete-game replay builds Workbench checkpoint on demand                   | Same                                             | replacement implemented |
| `hearts/test/bases/initial-hand.base.ts`                                   | Hearts setup/pass, card-legality, scoring, and complete-hand replays                         |    05 | Two smoke scenarios, Workbench pass-three, dev materialization              | Full 52-card legal hand replay passes from normal deal                       | Same                                             | discovered |
| `hex-network-trading/test/bases/after-setup.base.ts`                       | Stormtrail topology/setup and developed legal checkpoints                                    |    03 | Network and interaction scenarios, CLI/dev/Workbench                        | Stormtrail complete-game and focused branches pass from normal setup         | Same                                             | replacement implemented |
| `hex-network-trading/test/bases/charter-verification.base.ts`              | Removed excluded charter mechanic; no replacement gameplay branch                            |    03 | Five charter scenarios, generated projections, test-only setup profile      | Approved Stormtrail suite contains no charter source or checkpoint           | Rule-conformance and excluded-mechanic grep      | replacement implemented |
| `hex-network-trading/test/bases/initial-turn.base.ts`                      | Stormtrail production, building, trading, and complete-game replays                          |    03 | Main turn scenarios and generated state                                     | Normal-setup complete game passes                                            | No tracked `test/bases/**`; scenario/source grep | replacement implemented |
| `hex-network-trading/test/bases/port-verification.base.ts`                 | Removed excluded port/relay-rate mechanic; retained 3:1 depot-trade replay uses normal rules |    03 | Port/rate scenarios and generated projections                               | `depot-trades.scenario.ts` passes without ports or injected state            | Rule-conformance and old-port vocabulary grep    | replacement implemented |
| `hex-network-trading/test/bases/terminal-before-endturn.base.ts`           | Immediate fourth-camp victory through legal play                                             |    03 | Terminal scenario, `terminal-regression`, generated state                   | Complete-game terminal command ends immediately from normal setup            | No terminal profile/base vocabulary              | replacement implemented |
| `simultaneous-card-drafting/test/bases/five-player-initial-turn.base.ts`   | Lantern Market supported-player-count and complete-game replay                               |    03 | Five-player scenario and nine projections/base records                      | Five-player clean replay completes two rounds                                | No tracked `test/bases/**`; scenario/source grep | discovered |
| `simultaneous-card-drafting/test/bases/initial-turn.base.ts`               | Lantern Market barrier, scoring, privacy, and complete-game replay                           |    03 | Existing draft scenarios, Workbench lock-choice, dev materialization        | Clean replay produces selected Workbench checkpoints                         | Same                                             | discovered |
| `worker-placement-tableau/test/bases/initial-turn.base.ts`                 | Mosaic Workshop occupancy, turn/cleanup, crafting, scoring, and complete-game replays        |    05 | Existing scenarios, Workbench place-worker, dev materialization             | Four-season legal game and draw replay pass from normal setup                | Same                                             | discovered |

The repository-relative prefix for every row is
`examples/reference-games/`. There is no base file in the other four game
roots.

## Generated Test State And Projection Output

The exact 76 paths and member names are frozen in
[`source-size-baseline.md`](source-size-baseline.md#test-generated-inventory).

| Deletion family                | Exact inventory                                                                                                                                                | Replacement                                                     |      Owner | Downstream consumers                                                                | Clean-clone proof                                                                          | Final guard                                             | State      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------: | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------- |
| Generated base modules         | Five each of `base-states.generated.ts` and `.d.ts`                                                                                                            | Source scenario types bound to `app/game.ts`; transient replay  | 01, 03, 05 | Five `test/testing-types.ts` wrappers; CLI test/dev harness; candidate verification | New scaffold and all migrated games run without generating/importing the modules           | Strict source-size guard and zero import grep           | discovered |
| Base snapshots                 | Six `test/generated/base-state.json` files                                                                                                                     | Transient normal setup                                          |  01, 03-06 | SDK adapter output, CLI harness, source manifest/internal archive                   | Derived-free packed game compiles through exact SDK generator and scenario replay          | Strict source-size guard                                | discovered |
| Projection snapshots           | 45 `test/generated/bases/**/*.projection.json` paths                                                                                                           | Perspective-safe projected checkpoint compiled on demand        |      02-07 | Workbench fixture compiler; dev scenario path; historical UI evidence               | Two temporary compilations have equal canonical digests                                    | Strict source-size guard and Workbench no-fallback test | discovered |
| Generator receipts/contracts   | Five `.generation-meta.json`, five `scenario-manifest.generated.ts`, and five `testing-contract.ts` files                                                      | Scenario discovery plus SDK-owned typed source contract         |  01, 03-06 | CLI harness, five game wrappers, generated references                               | Clean clone discovers scenarios and infers typed commands without checked testing contract | Strict source-size guard and generated-import grep      | discovered |
| Thin-game projection leftovers | Four projections in `automa-river-rival`, `multiplayer-ranking-and-ties`, `roll-and-write-scorecard`, and `solo-countdown-puzzle`, plus Solo `base-state.json` | Full and focused base-free scenarios introduced in Phases 02-04 |      02-04 | UI fixture compiler/Workbench only; no authored base exists                         | Each game compiles selected checkpoint from its source scenario                            | Same                                                    | discovered |

No state/projection file is an assertion authority. `scripts/reference-games/build-source-manifest.mjs`
currently hashes these bytes because it walks the game root; Phase 06 changes
the source inventory contract before Phase 07 removes them.

## Test-Only Setup Profiles

The source audit found exactly five test-only profile IDs. Ordinary profiles
(`default`, `default-setup`, or `standard`) remain only where they are legitimate
normal game setup; the hard cut removes the ability for scenarios to request a
test-only setup field.

| Profile ID                     | Exact source locations                                                                                                                 | Current dependents                                                   | Replacement                                               | Owner | Clean-clone proof                                                   | Final guard                                                         | State      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------- | ----: | ------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------- |
| `empty-masterpiece-regression` | `deck-building-market/manifest.ts`, `deck-building-market/app/setup-profiles.ts`                                                       | `empty-masterpiece-before-endturn.base.ts` and its terminal scenario | Legal Sketchbook supply-ending replay                     |    05 | Ending branches pass from ordinary setup                            | ID absent from manifest, app, generated output, scenarios, and docs | replacement implemented |
| `terminal-regression`          | `hex-network-trading/manifest/setup.ts`, `hex-network-trading/app/setup-profiles.ts`, conditional in `hex-network-trading/app/game.ts` | `terminal-before-endturn.base.ts`                                    | Legal fourth-camp immediate victory                       |    03 | Complete game ends on the accepted winning command                  | Same                                                                | replacement implemented |
| `charter-verification`         | `hex-network-trading/manifest/setup.ts`, `hex-network-trading/app/setup-profiles.ts`                                                   | matching base and five charter scenarios                             | No replacement; charter mechanic is deliberately excluded |    03 | Approved Stormtrail conformance suite passes with no charter branch | Same plus excluded-mechanic grep                                    | replacement implemented |
| `test-fixed-spaces`            | `worker-placement-tableau/manifest.ts`, `worker-placement-tableau/app/setup-profiles.ts`                                               | No non-generated reference found                                     | Normal deterministic Mosaic setup/replay                  |    05 | Occupancy/crafting branches pass from ordinary setup                | ID absent everywhere                                                | discovered |
| `test-end-game`                | `worker-placement-tableau/manifest.ts`, `worker-placement-tableau/app/setup-profiles.ts`                                               | No non-generated reference found                                     | Legal four-season outcome replay                          |    05 | Unique-win and draw games pass from ordinary setup                  | ID absent everywhere                                                | discovered |

The latter two profiles are currently dead source rather than hidden unknown
consumers. Their generated manifest presence is covered by the workspace
output deletion family.

## Canonical Workspace-Codegen Output

The exact inventory is the nine relative paths in
`WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles`, resolved under each game.
There are 76 tracked outputs: four in `automa-river-rival` and nine in each of
the other eight games. See
[`source-size-baseline.md`](source-size-baseline.md#canonical-workspace-generated-inventory).

| Deletion family                                                                                                                            | Replacement                                                                                     | Owner | Downstream consumers                                                                           | Clean-clone proof                                                                                                                 | Final guard                                                        | State      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----: | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `shared/manifest-{contract,literals,runtime,types}.ts`, `shared/manifest-static.json`, and `shared/generated/ui-contract.ts` where present | Exact installed SDK `generateWorkspaceArtifacts`, materialized outside admitted/authored source | 06/07 | Authored app/UI imports and typecheck; UI fixture compiler; source manifest; internal compiler | Derived-free archive materializes only `ownership: "authoritative"` outputs, rejects collisions, and yields deterministic digests | Strict source-size guard plus internal archive object verification | discovered |
| Generated `app/index.ts`, `app/tsconfig.framework.json`, and `ui/tsconfig.framework.json`                                                  | Same isolated exact-SDK materialization                                                         | 06/07 | Package entry/build and TypeScript project references                                          | All nine build and compile in a disposable clone with these paths omitted from Git                                                | Same                                                               | discovered |

Seed paths in the ownership inventory are not deletion candidates. They are
author-maintained after scaffolding and remain source authority.

## Workbench Fixture And Catalog Output

| Deletion                    | Exact inventory                                                                                                                             | Replacement                                                                                                        | Owner | Downstream consumers                                                                                                                                     | Clean-clone proof                                                                                                      | Final guard                                                    | State      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------- |
| Checked reference fixtures  | `fixtures/ui/reference-games/index.json`, 26 named fixture JSON files, and 26 matching `modules/*.mjs` files; exact IDs in the size receipt | One ignored/temporary generated root from `CompiledScenarioReplay`                                                 | 06/07 | `compile-reference-fixtures`, `check-fixtures`, `run-ui-scenarios`, `run-ui-parity`, `open-ui-workbench`, release proof, packed/publishable verification | Materialize twice into fresh roots; equal canonical digest; Workbench build/test uses only the explicit generated root | Full-index forbidden-path check and no-fallback tests          | discovered |
| Generated Workbench catalog | `packages/ui-workbench/src/catalog.ts` only                                                                                                 | `virtual:dreamboard-scenario-catalog` backed by the same explicit generated root; stable source-owned types remain | 06/07 | Workbench `app.tsx`, `scenario-page.tsx`, Vite config, TS declarations/config, catalog scripts                                                           | Build, dev, and Playwright resolve the virtual module with tracked catalog absent                                      | Full-index forbidden-path check and zero `./catalog.js` import | discovered |

The concrete scripts/configurations requiring migration are:

```text
scripts/ui/generate-scenario-catalog.mjs
scripts/ui/scenario-catalog-lib.mjs
scripts/ui-fixtures/compile-reference-fixtures.mjs
scripts/ui-fixtures/check-fixtures.mjs
scripts/ui/open-ui-workbench.mjs
scripts/ui/run-packed-ui-scenarios.mjs
scripts/ui/verify-reference-consumers.mjs
scripts/ui/verify-publishable-reference-games.mjs
scripts/ui/run-ui-scenarios.mjs
scripts/ui/run-ui-parity.mjs
scripts/ui/create-ui-release-proof.mjs
packages/ui-workbench/src/app.tsx
packages/ui-workbench/src/scenario-page.tsx
packages/ui-workbench/src/fixture-modules.d.ts
packages/ui-workbench/vite.config.ts
packages/ui-workbench/tsconfig.json
packages/ui-workbench/package.json
package.json
```

`fixtures/ui/component-scenario-index.json` is retained. It is produced by the
separate component/source index generator and contains non-reference component
stories, so it is not entirely owned by the reference-game compiler.

## Screenshot And Media Deletions

| Deletion                           | Exact inventory                                                                                                                                | Replacement                                                                           | Owner | Downstream consumers                                                                                                                              | Clean-clone proof                                                              | Final guard                                                           | State      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------- |
| Obsolete Mosaic screenshots        | 11 PNGs under `worker-placement-tableau/test/screenshots/**`, named and hashed in the size receipt                                             | None for test authority; independently curated packaged product thumbnail             |    07 | No active SDK source/test/doc link found. Historical internal Artisans Guild receipts mention the same filenames under a different checkout path. | SDK docs/tests and browser proof pass with directory absent                    | Strict source-size guard reports zero obsolete screenshot paths/bytes | discovered |
| Ignored screenshot preset metadata | `demoRelease.screenshot` in all nine `reference-game.json` files and its required schema field in `packages/sdk/src/reference-games/schema.ts` | `demoRelease.thumbnailPath` for a curated asset; browser proof owns viewport evidence |    07 | SDK metadata parser/checks; internal demo assembler currently ignores these presets                                                               | All nine package/admit with thumbnail path and no screenshot block             | Metadata/schema tests plus zero `demoRelease.screenshot` matches      | discovered |
| Broken static hero paths           | Nine `demoRelease.heroImageUrl` values of `/demos/<slug>/desktop.png`                                                                          | Omit broken value; internal catalog/API serves packaged thumbnail URL                 |    07 | Internal catalog and landing presentation                                                                                                         | All-nine local release has reachable API-backed thumbnails and tested fallback | Internal guard rejects hard-coded `/demos/<slug>` image paths         | discovered |

Curated thumbnails added in Phase 07 are retained product assets and are not a
rename of the obsolete test screenshot family.

## Stale Test Docs, Templates, And Generated Reference

| Stale surface to remove or rewrite | Exact paths                                                                                                                                                                                                                                                | Replacement                                                                                  |      Owner | Downstream consumers                                                  | Clean-clone proof                                              | Final guard                                                | State      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------: | --------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| Base-workflow game docs            | `deck-building-market/test/README.md`, `hearts/test/README.md`, `hex-network-trading/test/README.md`, `simultaneous-card-drafting/test/README.md`, `worker-placement-tableau/test/README.md`                                                               | One self-contained scenario workflow                                                         |   03/05/08 | Agents reading reference games                                        | Packed examples contain no base instructions                   | Active-doc vocabulary grep                                 | discovered |
| Generated-base game wrappers       | The same five games' `test/testing-types.ts` files                                                                                                                                                                                                         | Thin source binding from `createScenarioAuthoring(game)`                                     | 01, 03, 05 | All scenarios in those games                                          | Typecheck from a derived-free archive                          | No `BASE_STATES`, `BaseDefinition`, or `defineBase` import | discovered |
| SDK generated API prose/index      | `packages/sdk/REFERENCE.md`, `docs/reference/agent-api.md`, `docs/reference/llms.txt`, and old `defineBase` entry in `packages/sdk/src/__snapshots__/export-surface.test.ts.snap`                                                                          | Regenerate from the new public exports and hand-authored workflow preface                    |      01/08 | Agents, package readers, export-surface test                          | Generation/check from clean SDK checkout                       | Docs check and zero old API matches                        | discovered |
| Public CLI scaffold/templates      | `apps/dreamboard-cli/src/templates/testing-types-content.ts` and base branches in `apps/dreamboard-cli/src/services/project/static-scaffold.ts` in `/Users/mac/code/dreamboard`                                                                            | Bound testing types plus one source scenario; no `test/bases` or placeholder generated files |         01 | `dreamboard create`, scaffold ownership and published CLI smoke tests | Newly scaffolded clean project runs `dreamboard test`          | CLI scaffold and ownership tests                           | discovered |
| Public CLI/docs base help          | `apps/dreamboard-cli/src/commands/test.ts`, `services/testing/reducer-native-test-harness.ts`, `services/verification/exact-commit-verifier.ts`, `docs/reference/testing.mdx`, `docs/reference/cli.mdx`, and `docs/tutorials/building-your-first-game.mdx` | JSON-first test/inspect/explore and path-selected dev scenario replay                        |   01/02/08 | CLI users, exact verifier, agents                                     | Packed CLI executes a new project and migrated reference games | CLI tests/help snapshots and active-doc grep               | discovered |

`scripts/generate-agent-reference.mjs` is retained as the generator; its stale
generated output is replaced.

## Internal Private Scenario-Author Hard Cut

The private tool has 30 tracked files, all discovered by:

```bash
git -C /Users/mac/code/internal ls-files 'tools/scenario-author/**'
```

Exact tracked family:

```text
tools/scenario-author/README.md
tools/scenario-author/package.json
tools/scenario-author/tsconfig.json
tools/scenario-author/src/cli.ts
tools/scenario-author/src/draft-store.ts
tools/scenario-author/src/json-envelope.ts
tools/scenario-author/src/next-actions.ts
tools/scenario-author/src/commands/adapters.ts
tools/scenario-author/src/commands/checkpoint.ts
tools/scenario-author/src/commands/choose.ts
tools/scenario-author/src/commands/compile.ts
tools/scenario-author/src/commands/draft-helpers.ts
tools/scenario-author/src/commands/fixture-adapter.ts
tools/scenario-author/src/commands/index.ts
tools/scenario-author/src/commands/init.ts
tools/scenario-author/src/commands/intents.ts
tools/scenario-author/src/commands/mark-measured.ts
tools/scenario-author/src/commands/observe.ts
tools/scenario-author/src/commands/recipe.ts
tools/scenario-author/src/commands/scenario-spec.ts
tools/scenario-author/src/commands/search.ts
tools/scenario-author/src/commands/summaries.ts
tools/scenario-author/src/commands/transitions.ts
tools/scenario-author/src/commands/try.ts
tools/scenario-author/src/commands/types.ts
tools/scenario-author/src/commands/undo.ts
tools/scenario-author/src/commands/validation.ts
tools/scenario-author/src/commands/verify.ts
tools/scenario-author/test/boundary.test.ts
tools/scenario-author/test/cli.test.ts
```

Ignored `node_modules` content is not a tracked deletion.

| Deletion                                                                             | Replacement                                                                                                                                                                              |                                                                                                 Owner | Downstream consumers                                             | Clean-clone proof                                                            | Final guard                                                                      | State                                                       |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| Entire 30-file private command package, including fixture-only Hex adapter and tests | Public CLI `test inspect`, `test explore`, source scenario authoring, and SDK `CompiledScenarioReplay`                                                                                   |                                                                                                    07 | Root `scenario-author` script; developers/agents; private drafts | Agent authors and compiles Stormtrail through only the packed public CLI/SDK | Internal repo guard finds no package, root command, or active guidance           | discovered                                                  |
| Root command and workspace lock entry                                                | `/Users/mac/code/internal/package.json` script and `pnpm-lock.yaml` importer `tools/scenario-author`                                                                                     |                                                                                                    07 | Root task surface and dependency install                         | Fresh internal install/check succeeds after package removal                  | Dependency-state guard plus zero root-command match                              | discovered                                                  |
| Private author identity in replay schema                                             | `scenarioAuthorVersion` in `packages/browser-demo-scenario-contract/src/schema.ts` and its test                                                                                          |           Versioned SDK compiled-replay/source identity; retain generic normalized execution contract | 06/07                                                            | Perf parser and checked browser-demo spec                                    | Translator accepts the packed SDK DTO and rejects unknown schema versions        | Contract/parser tests and no `scenarioAuthorVersion` field  | discovered |
| Perf's private-author regeneration path                                              | `tools/perf/src/browser-demo-scenario.ts`, `browser-demo-scenario-spec.ts`, `browser-demo-scenario.test.ts`, and `scenarios/hex-network-trading-trade-cancel.browser-demo-scenario.json` | Perf consumes compiled scenario or normalized websocket replay and keeps generic execution/validation | 07                                                               | Perf CLI and browser-demo workload                                           | Local all-nine browser/perf proof runs without invoking/importing private author | Perf boundary test and zero `pnpm scenario-author` guidance | discovered |

Historical execution plans and receipts may retain factual references. Active
operator/agent guidance, current schemas, commands, and checked runtime input
must not.

## Retained Per-Game Lock Inventory

These are provenance inputs, not deletions.

| Retained lock                                 |      Lines |       Bytes | Current consumers                              | Phase 06/07 proof                          | Guard                                      |
| --------------------------------------------- | ---------: | ----------: | ---------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `automa-river-rival/pnpm-lock.yaml`           |      1,335 |      51,327 | SDK checks/source manifest; internal admission | Exact public SDK version and npm integrity | Exactly-nine lock and aggregate-line guard |
| `deck-building-market/pnpm-lock.yaml`         |      1,371 |      52,469 | Same                                           | Same                                       | Same                                       |
| `hearts/pnpm-lock.yaml`                       |      1,362 |      52,000 | Same                                           | Same                                       | Same                                       |
| `hex-network-trading/pnpm-lock.yaml`          |      1,384 |      52,898 | Same                                           | Same                                       | Same                                       |
| `multiplayer-ranking-and-ties/pnpm-lock.yaml` |      1,371 |      52,468 | Same                                           | Same                                       | Same                                       |
| `roll-and-write-scorecard/pnpm-lock.yaml`     |      1,371 |      52,468 | Same                                           | Same                                       | Same                                       |
| `simultaneous-card-drafting/pnpm-lock.yaml`   |      1,354 |      51,970 | Same                                           | Same                                       | Same                                       |
| `solo-countdown-puzzle/pnpm-lock.yaml`        |      1,354 |      51,969 | Same                                           | Same                                       | Same                                       |
| `worker-placement-tableau/pnpm-lock.yaml`     |      1,421 |      53,963 | Same                                           | Same                                       | Same                                       |
| **Total**                                     | **12,323** | **471,532** |                                                |                                            | **At most 15,000 lines**                   |

Concrete provenance consumers are
`scripts/ui/check-reference-games.mjs`,
`scripts/ui/verify-publishable-reference-games.mjs`,
`scripts/reference-games/repin-sdk.ts`,
`scripts/reference-games/build-source-manifest.mjs`, and internal
`packages/demo-release-core` admission/assembly. Phase 06 repins all nine only
after the exact SDK is public. Phase 07 must not replace them with a root lock,
workspace link, or sibling checkout.

## Consumer Audit Result And STOP Review

No generated path in this ledger has an unidentified consumer.

Known migration gates are not STOP conditions: the public CLI currently
hydrates base snapshots, Workbench currently reads tracked fixtures/catalog,
internal compile currently expects generated workspace files, and internal
perf/schema still names the private scenario author. Each has an explicit
replacement and owning phase above.

No Phase 00 STOP condition was met by this audit:

- lockfile provenance is traced and retained;
- the single future authoring owner is the public CLI plus SDK scenario
  contract;
- no base, derived output, Workbench product, or screenshot is authorized for
  early deletion; and
- `fixtures/ui/component-scenario-index.json` was conservatively retained
  because it is not wholly owned by the deletion-candidate compiler.

If any later clean-clone proof reveals another consumer, that row returns to
`discovered` and deletion stops until the consumer is either migrated or
explicitly retained.
