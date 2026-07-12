# Phase 00 Current-Behavior Characterization

Recorded: 2026-07-13 (Australia/Sydney).

Green results below characterize the current implementation only. The
[rule-conformance ledger](rule-conformance-ledger.md) remains the correctness
authority.

## Aggregate Commands

| Command                                              | Exit | Current observation                                                                                                                                                                                                                                                                                                                                     | Evidence class                   |
| ---------------------------------------------------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `pnpm reference-games:check`                         |    0 | All nine metadata/package/lock/source hashes were accepted at SDK `0.4.0-alpha.8`.                                                                                                                                                                                                                                                                      | local source/static scan         |
| `pnpm reference-games:test:packed`                   |    0 | Built and packed the SDK, copied all nine games into isolated consumers, installed the tarball without workspace links, and ran each declared verify/build/test surface.                                                                                                                                                                                | exact local tarball consumer     |
| `pnpm reference-games:bundle`                        |    0 | Materialized Git `HEAD` into `build/reference-games/source/sha256-52b8…`; bundle digest `sha256:52b863603788efaa77ef6728bba2ec3d6b56a122a114f1f575c0f4e03668b3ad`, manifest digest `sha256:908fb1b888c7fe55c0a914748a457a8badeb9a53f294be0fc0cabbea4f8ba585`, archive digest `sha256:3ae6153e28540ba284fd1409eb6c4525ae115397d93b2a086d84e6126257915d`. | committed-source materialization |
| `pnpm --filter @dreamboard-games/sdk test`           |    0 | 576 SDK tests passed, 0 failed.                                                                                                                                                                                                                                                                                                                         | local SDK source                 |
| `node scripts/ui/generate-ui-agent-docs.mjs --check` |    0 | `docs/ui-agent-iteration.md` and `docs/reference-games.md` matched their current generator.                                                                                                                                                                                                                                                             | generated-doc check              |

The bundle command intentionally archives Git `HEAD`, not the dirty working
tree. It therefore proves commit `05509e3…`, not the approved but still
uncommitted rule/theme edits. A later source bundle must not claim those rules
until they are committed.

The SDK build emitted existing Rollup declaration-chunk circular-reexport
warnings for `UIContract`, `DreamboardUI`, and `TypedGame`; they did not fail the
build. They are characterization noise, not rule-conformance evidence.

## Per-Game Test Entrypoints

Each current `pnpm test` exited `0`:

| Game             | Declared runner                   |  Reported tests | Does it execute behavior assertions?                                                                                                                |
| ---------------- | --------------------------------- | --------------: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hearts           | `test/wave-2-smoke.test.ts`       |               7 | Yes, direct `node:test` suites execute. They characterize the current multi-round implementation and may disagree with the approved one-hand brief. |
| Lantern Market   | `test/scenarios/*.scenario.ts`    |  3 file entries | **No.** Each file default-exports the identity result of generated `defineScenario`; importing the module registers no `node:test` callback.        |
| Sketchbook       | `test/scenarios/*.scenario.ts`    | 16 file entries | **No.** The generated `defineScenario` wrapper returns data and registers no test.                                                                  |
| Mosaic Workshop  | `test/scenarios/*.scenario.ts`    | 39 file entries | **No.** The generated `defineScenario` wrapper returns data and registers no test.                                                                  |
| Stormtrail       | `test/player-turn-params.test.ts` |               2 | Yes, but only sparse parameter-schema cases run; gameplay scenarios are not the test entrypoint.                                                    |
| Cloudline Survey | scenario and UI-scenario globs    |              16 | Yes, direct `node:test` cases run, with duplicates because behavior modules are imported through both globs.                                        |
| Harbor Fair      | `test/scenarios/**/*.scenario.ts` |               8 | Seven direct `node:test` cases execute; `draft-stall-ready.scenario.ts` is one import-only false-positive file entry.                               |
| Last Light       | `test/scenarios/**/*.test.ts`     |               9 | Yes, direct runtime tests execute.                                                                                                                  |
| River Guild      | `test/scenarios/**/*.test.ts`     |               8 | Yes, direct runtime tests execute.                                                                                                                  |

### Why the import-only entries are vacuous

For Lantern Market, Sketchbook, and Mosaic Workshop,
`test/testing-types.ts` defines `defineScenario(definition)` as an identity
function. The scenario modules export the returned object but never call
`test(...)`. Node's `--test` runner reports a successfully imported file as a
passing file entry, so a failing `then` callback would not run. Harbor Fair has
the same issue for its one `draft-stall-ready` object module.

This satisfies the Phase 00 controlled-proof requirement without committing a
temporary failing assertion: the entrypoint and wrapper trace proves there is
no invocation path.

## Known Current Risks

- The current testing contract still requires generated bases and exposes
  `defineBase`, `from`, phase/stage metadata, and `patchState`-capable runtime
  helpers.
- `dreamboard dev --from-scenario` hydrates generated base snapshots.
- Generated or living docs still contain legacy `test generate` / `test run`
  language outside the live one-command CLI source.
- The four newer/original examples do not all share the reducer-native scenario
  object shape.
- Current setup-profile and source names include mechanics deliberately excluded
  by the approved briefs.
- `reference-games:test:packed` proves package isolation but inherits the same
  vacuous scenario entrypoints for three games; green is not rule proof.
- The current source-manifest collector walks every archived game file, including
  checked generated output, so its digest is not yet the planned authored-object
  fingerprint.

No live environment was contacted and no staging or production state was
mutated.
