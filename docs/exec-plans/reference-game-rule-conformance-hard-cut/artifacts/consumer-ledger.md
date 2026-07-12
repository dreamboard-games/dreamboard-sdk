# Phase 00C Consumer Ledger

Recorded: 2026-07-13

Scope: local source inspection of `dreamboard-sdk`, `dreamboard`, and
`internal`. This is an authority and consumer inventory, not evidence that the
current games conform to their approved rules. No build, packed, CI, staging,
or production result is claimed here.

## Repository Roots

| Repository       | Local root                       | Role in this ledger                                                                |
| ---------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| `dreamboard-sdk` | `/Users/mac/code/dreamboard-sdk` | Rules, reference-game source, testing contracts/runtime, codegen, source bundles   |
| `dreamboard`     | `/Users/mac/code/dreamboard`     | Public `test`/`dev` commands, reducer-native harness, machine-output integration   |
| `internal`       | `/Users/mac/code/internal`       | Immutable admission, compiler, demo release/catalog, web landing, perf, private UX |

The `internal` checkout was dirty before this audit. Its modified and untracked
files were read only and must not be staged or rewritten by this workstream.

## Producer And Consumer Seams

| Producer                                           | Current artifact or contract                                                                                                                                                   | Current consumers and exact source paths                                                                                                                                       | Editable now?                                                        | Planned authority                                                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Per-game approved brief                            | `examples/reference-games/<id>/rule.md`                                                                                                                                        | Game implementation, scenarios, README/canonical docs, demo presentation                                                                                                       | Yes                                                                  | Sole gameplay and theme authority                                                                                                                                                               |
| Per-game reference metadata                        | `reference-game.json` schema 3: stable `id`, workspace entries, teaching metadata, `demoRelease`, mechanics, rights, exact-SDK policy                                          | SDK guards and source manifest; UI fixture discovery; internal admission and release assembly                                                                                  | Yes                                                                  | Authoritative discovery and presentation metadata; never gameplay authority                                                                                                                     |
| Authored game workspace                            | `manifest.ts`, `app/game.ts` plus `app/**`, `ui/index.tsx` plus `ui/**`                                                                                                        | Public `test` and `dev`; SDK Workbench compiler; internal compiler; packed consumer checks                                                                                     | Yes                                                                  | Authoritative runnable source                                                                                                                                                                   |
| Current SDK testing definitions                    | `packages/sdk/src/testing/definitions.ts`, `packages/sdk/src/testing-runtime.ts`, `packages/sdk/src/testing/create-test-runtime.ts`                                            | Public CLI reducer-native harness and SDK candidate verification                                                                                                               | Yes                                                                  | Replaced by one base-free scenario contract and one replay/checkpoint runtime in Phases 01-02                                                                                                   |
| Behavior scenario source                           | Current `test/scenarios/*.scenario.ts` definitions with `from`, `when`, `then`                                                                                                 | Per-game package tests; `dreamboard test`; `dreamboard dev --from-scenario`; exact-commit verification; some Workbench UI scenarios reference a behavior scenario              | Yes                                                                  | One default-export, self-contained `setup`/`given`/`when`/`then` scenario is authoritative behavioral proof                                                                                     |
| Current base source                                | `test/bases/*.base.ts`, `defineBase`, inheritance and setup callbacks                                                                                                          | Public CLI artifact generation, scenario execution, dev snapshot materialization                                                                                               | Yes                                                                  | Deleted after Phase 01 replacement; not an authority                                                                                                                                            |
| Workspace codegen                                  | Inventory and classifiers in `packages/workspace-codegen/src/ownership.ts`; generated paths include `shared/manifest-*`, `shared/generated/ui-contract.ts`, and `app/index.ts` | Local game typecheck/build/test/dev; Workbench reducer/UI compilation; current internal compiler                                                                               | Generator yes; output no                                             | Generator/installed SDK adapter is authoritative; output is transient and generated on demand                                                                                                   |
| Current test artifact generator                    | `dreamboard/apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.ts` (`writeReducerNativeGeneratedFiles`)                                                      | Writes `test/generated/base-states.generated.*`, scenario manifest, projections and metadata; read again by `runReducerNativeScenarios` and scenario materialization           | Generator yes; output no                                             | Deleted with bases; replay checkpoints and receipts are transient                                                                                                                               |
| Reference source manifest                          | `scripts/reference-games/build-source-manifest.mjs` hashes every admitted object plus package/lock/source identities                                                           | `scripts/reference-games/build-source-bundle.mjs`; planned strict internal admission verification                                                                              | Generator yes; manifest no                                           | Versioned content-addressed source inventory generated from a canonical Git tree                                                                                                                |
| Reference source bundle                            | `pnpm reference-games:bundle` -> `scripts/reference-games/build-source-bundle.mjs`                                                                                             | Manual/CI materialization; dormant internal materializer described below                                                                                                       | No                                                                   | Derived transport artifact, never editable source                                                                                                                                               |
| Static reference-game guard                        | `pnpm reference-games:check` -> `scripts/ui/check-reference-games.mjs`                                                                                                         | SDK `pnpm check`, local/CI authoring gate                                                                                                                                      | Yes                                                                  | Structural and source-authority guard; planned strict derived-path/size enforcement                                                                                                             |
| Publishability guard                               | `pnpm reference-games:verify-publishable` -> `scripts/ui/verify-publishable-reference-games.mjs`                                                                               | SDK release preparation and internal admission compatibility proof                                                                                                             | Mechanical package/lock edits only                                   | Per-game external-consumer provenance gate                                                                                                                                                      |
| Packed SDK consumer proof                          | `pnpm reference-games:test:packed` -> `scripts/ui/verify-reference-consumers.mjs`                                                                                              | Copies games to sandboxes, rewrites the SDK dependency to the freshly packed tarball, installs, typechecks and runs UI tests                                                   | No persistent output                                                 | Packed-package compatibility proof; does not validate committed manifest pins                                                                                                                   |
| UI scenario declarations                           | `reference-game.json.workspace.uiScenarios` and `test/ui-scenarios/*`                                                                                                          | `scripts/ui-fixtures/discover-scenarios.mjs` and `load-scenario-module.mjs`                                                                                                    | Yes                                                                  | Thin view/checkpoint selection over authoritative behavior scenarios                                                                                                                            |
| Workbench compiler                                 | `pnpm ui:fixtures:compile` -> `scripts/ui-fixtures/compile-reference-fixtures.mjs` -> `compile-scenario.mjs`                                                                   | Emits deterministic fixtures/modules/index consumed by Workbench and UI CI                                                                                                     | Generator yes; output no                                             | On-demand compiler of the common compiled replay/checkpoint DTO                                                                                                                                 |
| Checked Workbench bundle/catalog                   | `fixtures/ui/reference-games/**`, `fixtures/ui/component-scenario-index.json`, `packages/ui-workbench/src/catalog.ts`                                                          | Vite fixture middleware/build copy, Workbench runtime, Playwright, parity/release proof; `scripts/ui/open-ui-workbench.mjs` reads the checked index before starting Vite       | No                                                                   | Local cache or CI artifact; removed from Git after startup/build generates it                                                                                                                   |
| Public test command                                | `dreamboard/apps/dreamboard-cli/src/commands/test.ts`                                                                                                                          | Calls `generateReducerNativeArtifacts`, then `runReducerNativeScenarios`; `--scenario` is currently a file-path filter; output is prose unless global machine mode captures it | Yes                                                                  | One `dreamboard test` family with path selectors and semantic JSON by default; `inspect` and `explore` reuse the same runtime                                                                   |
| Public dev command                                 | `dreamboard/apps/dreamboard-cli/src/commands/dev.ts`                                                                                                                           | `--from-scenario` currently accepts a scenario ID, generates bases, materializes a reducer snapshot, calls the backend snapshot-hydration API, then starts the host            | Yes                                                                  | Path plus structural checkpoint (`--at setup                                                                                                                                                    | given:n                                                                          | when:n`) compiled from legal replay; no durable base snapshot |
| Public machine output                              | `dreamboard/apps/dreamboard-cli/src/machine-output.ts`; portable result primitives remain in `packages/cli-core`                                                               | Global `--json` or `--json-events` wraps captured command output                                                                                                               | Yes                                                                  | Test-family semantic JSON envelope by default; no test `--json-events`; `cli-core` owns only portable command/result/JSON primitives, never SDK, browser, React, Vite, Playwright or UI runtime |
| Internal release-set policy                        | `internal/infra/demo-release-sets/preview-all.json`                                                                                                                            | `DemoReleaseAdmissionPreflight`; selects every packageable `demoRelease` entry                                                                                                 | Yes, product policy                                                  | Internal-only release selection; never copied into SDK metadata                                                                                                                                 |
| Internal immutable admission                       | `internal/packages/demo-release-core/.../DemoReleaseAdmissionPreflight.kt`                                                                                                     | `pnpm demo-release pack                                                                                                                                                        | publish`through`scripts/backend-demo-release-cli.sh` and backend CLI | Yes                                                                                                                                                                                             | Canonical Git archive plus exact per-game package/lock and public SDK provenance |
| Internal dependency install and authoring metadata | `internal/packages/compiler-core/src/workspaces/compiler-workspace-manager.ts` and `compiler-workspace-dependencies.ts`                                                        | Frozen per-game install, installed SDK authoring adapter metadata, lock/package-set fingerprints                                                                               | Yes                                                                  | Exact admitted public SDK adapter generates transient authoritative outputs before compile                                                                                                      |
| Internal compiler                                  | `DemoReleaseBuilder.kt` -> `DemoReleaseCompilerBridge.kt` -> `packages/compiler-core/scripts/compile-project.ts`; TypeScript/UI compilers currently consume source as-is       | Produces topology manifest, single ESM runtime, admission receipt and UI bundle                                                                                                | Yes                                                                  | Compile an isolated generated workspace; never mutate the admitted archive or require checked generated output                                                                                  |
| Demo release assembler                             | `internal/packages/demo-release-core/.../DemoReleaseAssembler.kt`                                                                                                              | Immutable release manifest/object store, backend activation and active catalog                                                                                                 | Yes                                                                  | Slug-keyed immutable objects and release-backed presentation/media                                                                                                                              |
| Active demo catalog/API                            | `ActiveDemoCatalogRepository.kt`, `DemoCatalogService.kt`, demo routes/contracts                                                                                               | Web landing, demo detail/session routes, perf source resolution                                                                                                                | Yes                                                                  | Active release is catalog truth; no SDK-side live catalog and no editable `demo-gallery` copy                                                                                                   |
| Web landing/demo UI                                | `PlayableDemosSection.tsx`, `DemoPage.tsx`, router in `apps/web/src/main.tsx`                                                                                                  | Currently renders every active-catalog entry, navigates by slug, and creates demo sessions                                                                                     | Yes                                                                  | Product-owned ordered allowlist filters active catalog; catalog `thumbnailUrl` and tested fallback own media                                                                                    |
| Internal perf                                      | `tools/perf/src/perf-catalog.ts`, `workloads/hex-network-trading/**`, `browser-demo-scenario.ts`, checked scenario/replay JSON                                                 | Authority and browser latency lanes; only `hex-network-trading` is a game-specific workload today                                                                              | Yes                                                                  | Keep stable workload/slug; consume SDK `CompiledScenarioReplay` through one internal runtime translator                                                                                         |
| Private scenario author                            | `pnpm scenario-author` -> `tools/scenario-author/src/cli.ts`, draft store, commands, workspace/fixture adapters                                                                | Produces private drafts and `BrowserDemoScenarioSpec`; hard-coded Stormtrail fixture adapter also feeds perf scenario authoring                                                | Yes until cutover                                                    | Superseded by public scenario + inspect/explore; delete command, drafts, fixture adapter and overlapping schema after callers migrate                                                           |
| SDK/internal UI parity                             | SDK `scripts/ui/required-ui-scenarios.mjs`; internal `.github/workflows/ui-parity.yml`                                                                                         | Required Workbench/packed/real-host scenarios; internal CI names `hearts.pass-three.mobile`                                                                                    | Yes                                                                  | Derived scenario selection over authoritative compiled replays; keep only deliberate sentinel coverage                                                                                          |

## Exact Lockfile And Admission Chain

The per-game lockfiles are an active consumer contract, not generated bulk to
delete.

1. SDK `check-reference-games.mjs` requires every game directory,
   `package.json`, `pnpm-lock.yaml`, and `reference-game.json`; it requires
   `dependencies.@dreamboard-games/sdk` to be an exact version equal to
   `packages/sdk/package.json` and forbids workspace/file/link dependencies.
2. SDK `verify-publishable-reference-games.mjs` additionally requires the SDK
   dependency to occur only in `dependencies`, reads the root importer entry,
   checks the resolved version, requires the package resolution's `sha512`
   integrity, requires all packageable games to resolve one common identity,
   then performs an isolated `pnpm install --frozen-lockfile
--ignore-workspace --config.shared-workspace-lockfile=false`, typecheck and
   optional UI test.
3. Internal admission resolves the canonical SDK checkout and exact commit,
   runs `git archive <revision> examples/reference-games`, and discovers
   packageable games from `reference-game.json.demoRelease`. SDK source forbids
   `demoRelease.sourcePath`, so the admitted workspace is exactly
   `examples/reference-games/<id>`; internal's optional fallback remains the
   containing game directory.
4. For every selected game, internal hashes the exact `package.json` and
   `pnpm-lock.yaml`, reads the package SDK specifier and the lock's resolved
   version/integrity, requires one exact public identity across the release,
   compares it with npm metadata, downloads that tarball, and verifies its
   `sha512` integrity.
5. The internal compiler then installs the archived game with
   `pnpm install --frozen-lockfile --ignore-scripts
--package-import-method=copy`. It derives the installed SDK version,
   lockfile integrity, public package-set digest, and SDK authoring-adapter
   metadata. The current TypeScript/UI compilers nevertheless state that
   codegen output must already be present; Phase 07 must invoke the installed
   adapter before those compilers run.

At this audit, all nine package manifests and lockfiles resolve:

```text
@dreamboard-games/sdk@0.4.0-alpha.8
sha512-dECOu2izBDCWH0vAybvATnu6iLcBtEcl2hTXiIY33FpUumaCgJUw1dV8FXVpJVUo8yXibrH44mojOXJl4yeFgA==
```

This is current-source evidence only. Phase 06 replaces it with the exact
newly published SDK identity and mechanically repins all nine locks before the
internal cutover.

## Current Scenario And Derived-Output Dependencies

- `dreamboard test` always calls generation before execution. It writes full
  reducer snapshots and player projections, then reloads those artifacts for
  current scenario execution and fingerprint validation.
- `dreamboard dev --from-scenario` regenerates first, selects by scenario ID,
  replays `when` from a generated base, caches the materialized reducer state
  under `.dreamboard/dev/scenario-cache`, and sends the full reducer snapshot to
  the backend hydration endpoint.
- Workbench compilation reads the UI scenario list from each
  `reference-game.json`, imports source modules, executes reducer/protocol
  authority, and writes deterministic fixture JSON/render modules/index.
  `pnpm ui:workbench` itself only reads the existing fixture index and starts
  Vite; catalog generation is a separate command today.
- Vite serves `fixtures/ui/**` in development and copies it into the Workbench
  build. `packages/ui-workbench/src/catalog.ts` statically imports generated
  render modules. These are identified consumers that must move together.
- Internal TypeScript runtime and UI bundle compilation directly aliases
  `shared/manifest-contract.ts` and `shared/generated/ui-contract.ts`, and uses
  `app/index.ts` as the runtime entrypoint. This is the final generated-source
  consumer that blocks deletion until the installed SDK adapter runs.

## Internal Demo, Landing, Perf, And Scenario-Author Flow

```text
SDK Git commit
  -> git archive examples/reference-games
  -> release-set selection + per-game package/lock admission
  -> exact public SDK tarball verification
  -> frozen per-game install
  -> internal compile
  -> demos/<slug> immutable release objects
  -> active demo release/catalog
  -> /api/demo-games and /demo/<slug>
```

- Release objects are keyed by the stable slug under
  `demos/<slug>/{topology,app,ui,thumbnail}` and published beneath
  `demo-releases/v2/sha256-<release>/`.
- The backend API derives `thumbnailUrl` only when the active release contains
  a packaged thumbnail. The landing currently ignores it and constructs
  `/demos/<slug>/thumb.png`; the demo dialog prefers the equally static
  `heroImageUrl`. The identity/media ledger records this drift.
- Perf resolves `hex-network-trading` from the active catalog and binds the
  active revision/session at runtime. Its checked private browser scenario and
  websocket replay are another scenario authority today.
- Private `scenario-author` persists a draft graph, private checkpoints,
  selected transitions and a measured transition, then compiles a separate
  `BrowserDemoScenarioSpec`. Its only built-in fixture adapter is
  `hex-network-trading-trade-cancel`; workspace mode imports checked
  `app/index.ts` and `shared/manifest-contract.ts`. This entire authoring UX is
  the agreed overlapping surface to remove after the public replacement passes.

## Dormant Or Legacy Seams

`internal/tools/repo-scripts/src/fixtures/materialize-reference-bundle.ts`
expects `examples/reference-bundle.lock.json`, but that lock file is absent and
no package script or runtime caller was found. It is an identified, currently
unwired legacy materializer, not authority for demo admission. The active demo
path uses the canonical SDK Git archive described above.

The former agent-runner published-example root remains as configuration
validation (`DREAMBOARD_PUBLISHED_EXAMPLES_ROOT`) but no current non-test
runtime consumer of the SDK reference-game bundle was found.

## Reproducible Audit Commands

All commands below exited `0` on 2026-07-13; they are read-only.

```bash
rg -n "defineBase|BaseStateArtifact|ScenarioDefinition" \
  packages/sdk/src/testing packages/sdk/src/testing-runtime.ts
rg -n "generateReducerNativeArtifacts|runReducerNativeScenarios|createSessionFromScenario" \
  ../dreamboard/apps/dreamboard-cli/src
rg -n "fixtures/ui/reference-games|catalog.ts" \
  scripts/ui scripts/ui-fixtures packages/ui-workbench
rg -n "pnpm-lock|resolvedSdkIntegrity|materializeGitArchive|thumbnailPath" \
  ../internal/packages/demo-release-core
rg -n -- "--frozen-lockfile|projectAuthoringAdapter|manifest-contract|ui-contract" \
  ../internal/packages/compiler-core
rg -n "hex-network-trading|scenario-author|BrowserDemoScenarioSpec" \
  ../internal/tools/perf ../internal/tools/scenario-author
rg -n "listDemoGames|thumbnailUrl|/demos/|/demo/:slug" \
  ../internal/apps/web ../internal/apps/backend
```

## Phase 00C Conclusion

No unidentified consumer or Phase 00 STOP condition was found. The generated
base/dev, checked Workbench, and internal compiler consumers are all identified
and assigned replacements before deletion. The public/private scenario-author
overlap has one agreed owner: SDK-authored scenarios exposed through the public
Dreamboard CLI.
