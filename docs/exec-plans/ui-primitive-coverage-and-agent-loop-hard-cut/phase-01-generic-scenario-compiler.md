# Phase 01: Generic Scenario Compiler

Status: In Progress

Depends on: Phase 00

## Objective

Replace the game-specific and replay-kind branches in fixture compilation with
typed scenario modules and two generic authority adapters.

## Scenario authorities

### Protocol authority

Primitive contract scenarios provide deterministic protocol frames and legal
interaction responses. This is the shortest path for testing SDK primitives
without creating a game.

### Reducer authority

Reference-game scenarios provide:

- the actual `ReducerBundleContract`;
- initial state;
- viewer;
- reducer operations.

The compiler executes `createReducerScenarioRunner` and derives the protocol
tape from the real trace.

Both paths produce the existing `UIScenarioFixture` and `PluginProtocolTape`.

## Compiler pipeline

The generic pipeline is:

1. discover scenario modules;
2. import the module normally;
3. validate the scenario definition;
4. execute its authority adapter;
5. build the fixture and render module;
6. execute replay expectations;
7. write canonical generated output;
8. update the generated index.

The pipeline may switch on `protocol` versus `reducer`. It must not switch on
game ID or replay shape.

## Replay authoring

Keep `UIScenarioReplayStep` as the only portable replay contract.

Add typed helper builders only where they reduce repetitive authoring:

- `activate`;
- `fill`;
- `press`;
- `drag`;
- `assert`;
- `submit`.

The builders return existing replay-step values. They do not create a second
runtime language.

## Module loading

Load scenario modules through normal ESM or the repository's build tooling.
Remove source string rewriting and `new Function`.

The loader needs clear errors for:

- invalid scenario exports;
- imports outside allowed example and SDK public paths;
- nondeterministic generated output;
- replay failure at a specific step.

## Expected files

Create:

- `packages/sdk/src/testing/ui-scenario/replay-builders.ts`
- `packages/sdk/src/testing/ui-scenario/index.ts`
- `scripts/ui-fixtures/discover-scenarios.mjs`
- `scripts/ui-fixtures/load-scenario-module.mjs`
- `scripts/ui-fixtures/compile-scenario.mjs`
- `scripts/ui-fixtures/authority/protocol-authority.mjs`
- `scripts/ui-fixtures/authority/reducer-authority.mjs`

Refactor:

- `scripts/ui-fixtures/compile-reference-fixtures.mjs`
- `packages/sdk/src/testing/ui-fixture/compiler.ts`
- `packages/sdk/src/testing/ui-fixture/schema.ts`, only if generic replay needs
  a missing execution kind

## Implementation sequence

1. Implement the protocol authority and convert one simple scenario.
2. Implement the reducer authority and convert Hearts.
3. Convert one fill/draft scenario and one drag scenario.
4. Support multiple scenario modules per example.
5. Switch fixture generation to the generic discovery path.
6. Delete replay-kind branches, synthetic reducer creation, and source
   rewriting.

## Verification

```sh
pnpm ui:fixtures:compile
pnpm ui:fixtures:check
pnpm ui:runtime:test
pnpm ui:test --scenario hearts.pass-three.mobile
pnpm ui:test --scenario hex-network-trading.place-route.desktop
pnpm ui:test --scenario worker-placement-tableau.place-worker.desktop
```

Add unit tests for protocol authority, reducer authority, each replay execution
kind, invalid modules, and deterministic output.

## Acceptance criteria

- Scenario modules are the only fixture authoring path.
- Protocol and reducer scenarios produce the same fixture shape.
- Reducer scenarios execute the reference game's real reducer bundle.
- The compiler contains no game-specific or replay-shape branches.
- Scenario modules load without source rewriting or `new Function`.
- Multiple scenarios per example are supported.

## Progress notes

- Added typed replay-step builders that return the existing portable replay
  contract values.
- Removed source string rewriting and `new Function` from reference-game source
  loading; the fixture compiler now imports reference game source through normal
  ESM.
- Regenerated render modules as small ESM forwarders to the reference UI source
  instead of bundling copied source into each fixture module.
- Added reference-game scenario modules under `src/scenarios/*.scenario.mjs` and
  made fixture compilation discover and load those modules as the authoring
  path.
- Preserved the fixture schema while keeping each scenario module's reducer
  authority backed by the current coverage/replay metadata as an interim step.

Verification:

```sh
pnpm ui:fixtures:compile
pnpm ui:fixtures:check
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk exec bun test src/export-surface.test.ts --update-snapshots
pnpm --filter @dreamboard-games/sdk exec bun test src/testing/ui-scenario/replay-builders.test.ts
```

Remaining:

- Move replay/reducer data fully out of legacy `coverage.json` files.
- Add protocol authority support and split reducer authority helpers out of the
  compiler.
- Remove replay-kind branches from `compile-reference-fixtures.mjs`.

## Deferred

- exact package-tarball execution;
- cross-repository parity;
- operation and artifact provenance receipts;
- exhaustive migration reports.
