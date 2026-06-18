# Phase 05: Reference Suite And Cross-Repository Release Proof

Status: closed on 2026-06-19. SDK reference-suite preparation, required
internal parity, SDK release proof, exact public SDK package availability,
public Dreamboard docs/skill source proof, CLI/dev-host `0.1.30-alpha.18` npm
publication, public authoring compatibility proof, internal authoring
release-set repin, and internal `pnpm verify:package` / `pnpm verify:full`
passed. Internal terminal-transport source cutover, focused checks, terminal
callback/message, reconnect event-batch, host ended-event, and history-restore
regressions passed. Broader packed reconnect/event-history E2E remains recorded
as a non-blocking follow-up outside this capability hard cut.

Depends on Phases 00-04.

Primary repositories:

- `dreamboard-sdk`;
- the internal monorepo; and
- the public `dreamboard-games/dreamboard` checkout.

## Source Receipt: SDK Reference-Suite Preparation

Completed in `dreamboard-sdk` on 2026-06-19:

- Added `docs/reference/canonical-examples.md` as the SDK-owned index mapping
  common authoring questions to the nine canonical reference games, public SDK
  concepts, and focused packed proof commands.
- Promoted all nine canonical examples into the release-required Workbench
  scenario set in `scripts/ui/required-ui-scenarios.mjs`; the same source now
  drives `pnpm reference-games:test:packed --required`, so required packed proof
  covers all nine reference consumers.
- Regenerated `docs/ui-agent-iteration.md` and `docs/reference-games.md` so the
  generated docs show all nine reference games as required foundation coverage.
- Updated the Phase 00 capability matrix so no row remains `blocked`,
  `contract-gap`, or `ergonomic-gap`; the 28 SDK-composition rows carry Phase
  05 evidence fields for public API symbol, source implementation,
  reference-game call site, focused test, Workbench scenario, packed proof,
  public documentation, and retained limitations.
- Tightened `scripts/capability/check-competition-game-briefs.mjs` so old gap
  classifications fail and Phase 05 evidence fields are required for non-native
  rows.
- Added
  `docs/exec-plans/competition-game-authoring-capability-hard-cut/artifacts/phase-05-release-receipt.md`
  and a narrow `.gitignore` exception so the plan-owned release receipt can be
  committed while runtime artifacts remain ignored.
- Added required state-branch Workbench coverage for roll-and-write
  initial/rolled/drafted/submitted/invalid/terminal states, multiplayer
  unique-winner/tie/tie-break/reconnect states, solo
  initial/live/reconnect/terminal states, and automa
  initial/live/duplicate/reconnect/terminal states. Required Workbench
  selection now covers 28 scenario IDs and 35 generated UI scenarios.
- Tightened reducer scenario interaction lookup to prefer explicit
  `coverage.interactionId` / `coverage.replay.interactionId` before falling
  back to legacy scenario-ID matching, and recorded branch scenario source files
  so changed-scenario selection can trace each generated fixture to its owning
  module.
- Promoted `reduced-motion` and `accessibility-scan` into generated Workbench
  scenario capabilities. Workbench scenario tests now explicitly emulate and
  assert `prefers-reduced-motion: reduce`, run layout accessibility invariants
  and Axe, write those proof dimensions into semantic evidence, and fail the
  receipt if the proof block is missing.
- Tightened the SDK parity preflight so generated fixtures retain measured
  intermediate semantic digests and submit actuator identity for the required
  Hearts parity scenario. `run-ui-parity` and release proof now use
  `requiredParityScenarioIds` as the shared source of truth, preventing
  release-proof scenario drift.
- Proved required Hearts real-host parity against the internal product harness
  with `pnpm ui:test:parity --require-internal`; receipt
  `artifacts/ui-parity/2026-06-18T15-54-10-552Z/receipt.json`.
- Proved the local SDK release candidate with `pnpm ui:release-proof`; receipt
  `artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`.

Verification run:

```sh
mise exec node@24 -- pnpm format:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm ui:test --capability reduced-motion
mise exec node@24 -- pnpm ui:test --capability accessibility-scan
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:test:parity
mise exec node@24 -- pnpm ui:test:parity --require-internal
mise exec node@24 -- pnpm ui:release-proof
mise exec node@24 -- node scripts/capability/check-competition-game-briefs.mjs
mise exec node@24 -- pnpm check
mise exec node@24 -- pnpm ui:test
```

Latest SDK receipts:

- Aggregate required Workbench replay from `pnpm check`, with explicit
  reduced-motion/accessibility proof:
  `artifacts/ui/2026-06-18T15-06-27-068Z/receipt.json`.
- Latest required Workbench replay after parity fixture regeneration:
  `artifacts/ui/2026-06-18T15-23-03-249Z/receipt.json`.
- Reduced-motion capability proof:
  `artifacts/ui/2026-06-18T15-01-47-138Z/receipt.json`.
- Accessibility-scan capability proof:
  `artifacts/ui/2026-06-18T15-02-25-701Z/receipt.json`.
- Focused required Workbench replay:
  `artifacts/ui/2026-06-18T14-48-04-934Z/receipt.json`.
- Storybook interaction proof from `pnpm check`:
  `artifacts/ui-stories/2026-06-18T15-05-41-989Z/receipt.json`.
- Visual proof from `pnpm check`:
  `artifacts/ui-visual/2026-06-18T15-05-55-525Z/receipt.json`.
- Packed required consumer tarball:
  `sha256:f42e3d0e5a8f17839cf10b519e13fc29a9b898410ee5a3ba72993c19ed3b96b8`.
- Source-side parity preflight for the required Hearts real-host scenario:
  `artifacts/ui-parity/2026-06-18T15-25-28-502Z/receipt.json`; source
  comparison passed, internal executor skipped because `DREAMBOARD_INTERNAL_REPO`
  was not set.
- Required Hearts real-host parity with internal executor:
  `artifacts/ui-parity/2026-06-18T15-54-10-552Z/receipt.json`.
- SDK release proof:
  `artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`.
- Full Workbench scenario sweep:
  `artifacts/ui/2026-06-18T21-43-46-503Z/receipt.json`.
- Capability matrix check:
  `artifacts/capability/competition-game-authoring/brief-check-receipt.json`.

Remaining Phase 05 work:

- None blocking for this capability hard cut. Broader packed product-flow proof
  for reconnect and event-history routes remains a recorded follow-up beyond
  the passing full product harness, browser smoke, Hearts parity, focused
  terminal callback, reconnect event-batch, host ended-event, and
  history-restore evidence.

Internal evidence recorded in the retained Phase 05 receipt:

- public npm SDK package `@dreamboard-games/sdk@0.4.0-alpha.5`;
- public SDK repin and public authoring release-set check;
- `pnpm fin` passed;
- `pnpm verify:dev` passed;
- `pnpm verify:stack` passed in installed-release-set proof mode;
- `pnpm verify:browser` passed in installed-release-set proof mode; and
- `pnpm verify:package` and `pnpm verify:full` passed after publishing and
  adopting the CLI/dev-host `0.1.30-alpha.18` authoring release set.
- Public Dreamboard docs and bundled skill source were updated in
  `/Users/mac/code/dreamboard` to cover `Board.SquareGrid`, canonical
  `GameOutcome`, reducer-owned availability/guidance, deterministic solo and
  automa procedures, and the canonical concept/example chooser. The public
  checkout has no `packages/agent-skills`; the skill currently ships through
  the staged `@dreamboard-games/cli` package.
- Deletion audit found no blocking SDK `packages/sdk` or reducer-contract
  source hit. Existing deck/hex/worker demo-workspace projections and tests
  were cut to canonical `outcome`, generated baselines were regenerated, and
  the local reducer-native scenario suites passed. Internal live source was cut
  from the old `TerminalOutcome` / `winnerPlayerId` / `finalScores` transport
  through executor, authority, backend callback/persistence, private
  contracts, and generated clients; focused executor/authority/contract/client
  and backend compile checks passed. The installed-release-set stack lane passed
  after the source cut, covering database migrations, backend startup,
  authenticated workspace creation, compile/status, clone/sync/pull, durable
  commit equality, and executor-loss retry. Package and full product proof
  passed after the authoring release-set publication and repin. Focused terminal
  callback/message, reconnect event-batch, host ended-event, and history-restore
  regressions now pass, while broader packed reconnect/event-history E2E
  verification remains a non-blocking follow-up.

Phase 00 brief jobs cited:

- All non-native rows in
  `docs/capability-research/competition-game-authoring/capability-matrix.yaml`
  must point to their shipped API symbol, reference-game call site, Workbench
  scenario, packed proof, and public documentation.
- Native-control briefs `trick-taking-follow-suit-01`,
  `simple-shared-market-01`, and `setup-variant-draft-01` remain regression
  checks against speculative runtime concepts.

## Objective

Close the capability train with a small, teachable reference suite and prove
that the exact public SDK artifact works through generated authoring,
Workbench, packed consumers, internal runtime transport, reconnect, mobile
browser flows, public docs, and agent instructions.

This phase is integration and release proof. It must not invent a new public
framework concept to rescue an incomplete earlier phase.

## Canonical Example Catalog

Retain the existing canonical examples:

| ID                           | Game family                |
| ---------------------------- | -------------------------- |
| `hearts`                     | Trick-taking               |
| `simultaneous-card-drafting` | Simultaneous drafting      |
| `deck-building-market`       | Deck-building market       |
| `worker-placement-tableau`   | Worker placement           |
| `hex-network-trading`        | Route and network building |

Promote the four new examples from their owning phases:

| ID                             | Game family               | Capability proof                                                               |
| ------------------------------ | ------------------------- | ------------------------------------------------------------------------------ |
| `roll-and-write-scorecard`     | Roll and write            | Per-player square board, generated `Board.SquareGrid`, marking, mobile input   |
| `multiplayer-ranking-and-ties` | Small multiplayer ranking | Canonical outcome, ties, breakdowns, tie-breaks, guidance                      |
| `solo-countdown-puzzle`        | Solo puzzle               | Environment auto phases, deterministic events, reconnect, no opponent identity |
| `automa-river-rival`           | Automa rival              | Deterministic rival state/actions, events, outcome, and no fake actor          |

Create `docs/reference/canonical-examples.md` as the SDK-owned index. It maps
common author questions such as "build a roll-and-write game" or "add an
automa" to the smallest reference game, canonical SDK concepts, and verification
command.

All nine examples are release-required. The new examples are implemented in
their owning phases; Phase 05 only closes catalog, packaging, parity, and public
documentation.

Each game must include:

```text
examples/reference-games/<id>/
  README.md
  assets/
  demo-workspace/
    manifest.ts
    app/
    ui/
    shared/generated/
    test/
  scenarios/
  src/
```

Follow the existing reference-game ownership and generation conventions. Do not
hand-edit generated files.

## Teaching Standard

Each reference README answers:

1. What designer job does this game demonstrate?
2. Which canonical SDK concepts implement it?
3. Which tempting alternative should an agent avoid?
4. Where are the reducer, view, UI, scenario, and format declarations?
5. Which command runs the smallest proof?
6. Which scenario demonstrates the capability failure mode?

Keep examples mechanic-focused and small. Avoid decorative complexity that
hides the API being taught.

## Capability Matrix Closeout

Update the Phase 00 matrix so every non-native row now points to:

- public API symbol;
- source implementation;
- reference-game call site;
- focused test;
- Workbench scenario;
- packed proof;
- public documentation page; and
- retained limitation, if any.

Allowed final classifications:

- `native`;
- `composition`;
- `intentionally-out-of-scope`.

No row may remain `blocked`, `contract-gap`, or `ergonomic-gap` without a new
approved plan.

## SDK Fixture And Workbench Coverage

Compile required UI scenarios for:

- roll-and-write initial, rolled, drafted, submitted, invalid, and terminal
  states;
- multiplayer ranking unique winner, tie, tie-break, and reconnect states;
- setup/phase/action guidance;
- unavailable action reason;
- solo environment-event initial, live update, reconnect, and terminal states;
- automa rival-action initial, live update, duplicate, reconnect, and terminal
  states;
- pointer, keyboard, touch-width, and reduced-motion paths; and
- accessibility scans.

Required scenario IDs must be listed in the generated catalog and enforced by
the required coverage gate. They cannot be optional smoke scenarios.

Regenerate:

```bash
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm docs:generate
```

Then verify that generation is clean:

```bash
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm docs:check
```

## Packed Consumer Proof

The packed proof must install the candidate SDK artifact in a disposable
consumer and run all nine canonical examples.

It must prove:

- authoring exports resolve from the package;
- generated contracts compile against package exports;
- no workspace-only import is present;
- UI CSS/assets resolve;
- reducer bundle loads;
- scenario tests execute;
- browser fixtures render; and
- generated docs match the packaged API.

Do not accept a workspace test as packaging proof.

## Internal Real-Host Proof

Publish the candidate SDK to local Verdaccio:

```bash
cd /Users/kevintang/code/dreamboard-sdk
SDK_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 \
  mise exec node@24 -- pnpm local-registry:publish
```

Repin the internal monorepo:

```bash
cd /Users/kevintang/code/internal
pnpm sdk:repin --receipt
```

The retained repin receipt must record the exact version and registry.

Run real product flows for:

1. roll-and-write board-space draft and submit;
2. outcome commit, callback, persistence, reload, and end UI;
3. guidance projection and blocked reason;
4. solo environment-event commit, reconnect, and UI history;
5. automa rival-action commit, duplicate action, reconnect, and UI history; and
6. mobile-width gameplay through an ordinary product play route.

Use the browser boundary, not operator snapshot routes or injected
capabilities, for user gameplay proof.

Close internal changes with:

```bash
pnpm fin
pnpm verify:dev
pnpm verify:browser
pnpm verify:package
pnpm verify:full
```

Retain `build/verification/<run-id>/<lane>/receipt.json` paths in the phase
closeout.

## Public Documentation And Agent Skill

After the SDK version is publicly available, update the public
`dreamboard-games/dreamboard` checkout.

Required guides:

- roll-and-write scorecards and `Board.SquareGrid`;
- terminal outcomes and ties;
- setup/phase/action guidance;
- deterministic solo procedures;
- deterministic automa rivals without fake seats;
- canonical example catalog; and
- a "choose the canonical concept" table for coding agents.

Update `skills/dreamboard` so the agent:

- reaches for board topology rather than a sheet model;
- derives inventory instead of declaring it twice;
- uses `GameOutcome` rather than winner inference;
- displays descriptor availability reasons;
- uses auto phases and game events rather than fake players; and
- starts from the smallest matching reference game.

If the skill changes:

1. bump `packages/agent-skills`;
2. publish `@dreamboard-games/agent-skills`;
3. repin the internal monorepo with the exact version; and
4. run its package/docs validation.

Public docs checks:

```bash
mise exec node@24 -- pnpm skills:sync-docs
mise exec node@24 -- pnpm docs:validate
mise exec node@24 -- pnpm docs:broken-links
```

Run `skills:sync-docs` only when skill content changed. Before publishing an
agent-skill package, verify that the active public checkout contains the
package source and release scripts named by its current `AGENTS.md`; stop and
reconcile the checkout if it does not.

## Public SDK Release

Before publish:

- all generated output is clean;
- package version and changelog identify the hard cuts;
- migration notes cover `TerminalOutcome`, end-game UI props, and accepted
  result options;
- packed consumer proof uses the release candidate;
- internal parity uses the same bits or a digest-equivalent artifact; and
- no `-local.` version or tag is published publicly.

After publish:

1. Verify raw npm metadata and intended dist-tag.
2. Install the exact public version into a disposable consumer.
3. Run all nine canonical examples, including the four new anchors.
4. Repin internal with `pnpm sdk:repin <version>`.
5. Remove local Verdaccio scope lines through the repin workflow.
6. Re-run the required internal fast gates.
7. Record the public version, package digest, internal receipt, SDK release
   proof, public docs commit, and agent-skills version.

## Required SDK Verification

```bash
mise exec node@24 -- pnpm check
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm ui:hard-cut:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:release-proof
mise exec node@24 -- pnpm ui:test:parity --require-internal
```

## Release Receipt

Create:

```text
docs/exec-plans/competition-game-authoring-capability-hard-cut/
  artifacts/
    phase-05-release-receipt.md
```

The receipt records:

- SDK source commit;
- public SDK version and npm digest;
- generated-file clean checks;
- required scenario IDs for the four new canonical examples;
- Workbench run IDs/artifact paths;
- packed consumer artifact and result;
- internal SDK repin receipt;
- internal verification receipt paths;
- real-host parity result;
- public docs commit/check results;
- agent-skills version, if changed;
- known retained limitations; and
- rollback/recovery notes.

Do not include credentials, tokens, private URLs, or raw auth material.

## Final Deletion Audit

Search source and generated outputs for obsolete concepts:

```bash
rg -n \
  "TerminalOutcome|winnerPlayerId|finalScores|PlayerScore|accept\\([^\\n]+, \\[" \
  packages examples docs
```

Equivalent internal search must cover apps, packages, schemas, migrations, and
generated clients.

Classify every remaining hit as:

- migration history;
- generated documentation for an intentionally retained old release; or
- a defect blocking closeout.

No source compatibility bridge may remain.

## Exit Criteria

- All nine canonical examples are required, packed, and documented.
- Roll-and-write, solo puzzle, and automa rival are distinct teaching examples.
- The capability matrix has no unresolved framework gap.
- SDK aggregate, UI, reference, packed, release, and parity gates pass.
- Internal full verification passes against an exact SDK pin.
- Outcome and event data survive real-host reconnect.
- Public docs and agent instructions teach the canonical designs.
- The exact public SDK version replaces local snapshots in internal consumers.
- The release receipt contains enough evidence for another engineer to
  reproduce the closeout.
- Obsolete terminal, UI, and positional result APIs are absent from source.

## Stop Conditions

Do not release if:

- any required scenario passes only in the workspace but not the packed
  consumer;
- internal parity uses a different SDK artifact than the release candidate;
- outcome/event fields are dropped on reconnect;
- public docs describe an unpublished or renamed API;
- an anchor requires game-local framework glue to work around the intended
  capability; or
- the deletion audit finds a live compatibility path.
