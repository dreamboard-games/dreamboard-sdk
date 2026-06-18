# Phase 03: Fast Runner And Unified Replay

Status: Proposed

Depends on: Phases 00 and 01

## Objective

Use the generated index for focused and changed-only selection, run the selected
matrix through one Playwright invocation, and make interactive Replay share the
same semantic replay planning as browser automation.

## Changed selection

Use explicit source ownership from the generated index.

Selection rules:

- scenario source change selects that scenario;
- component or primitive source change selects scenarios that exercise it;
- shared fixture, runtime, or replay code selects the three smoke scenarios;
- an unknown file under owned UI paths selects the three smoke scenarios;
- unrelated docs or non-UI changes select no Workbench scenarios.

Do not add a transitive TypeScript dependency analyzer yet. Shared source globs
can be registered explicitly.

Keep an explain mode:

```sh
pnpm ui:test:changed --base <ref> --explain
```

It prints the selected scenarios and reasons. It does not need to write a
versioned artifact.

## Single Playwright run

Refactor the runner so it:

1. resolves all selected scenario/project pairs;
2. passes the selection to the Workbench test entry point;
3. builds the SDK and Workbench once when required;
4. starts one preview server;
5. invokes Playwright once;
6. lets Playwright isolate scenarios with browser contexts.

Keep source development mode through `ui:workbench:src`.

The smoke matrix remains:

- `hearts.pass-three.mobile`;
- `hex-network-trading.place-route.desktop`;
- `worker-placement-tableau.place-worker.desktop`.

## Unified replay

Extract a shared replay planner that:

1. reads a `UIScenarioReplayStep`;
2. resolves the semantic request;
3. validates actuator identity;
4. produces an execution instruction;
5. flushes and measures state after adapter execution.

Implement two adapters:

- in-page adapter for the Workbench Replay button;
- Playwright adapter for real browser action.

The in-page adapter may use DOM event APIs. It must not call runtime validation
or submission methods directly.

The Playwright adapter remains responsible for physical click, tap, fill,
press, and drag.

## Diagnostics

Keep diagnostics simple and useful:

- current replay step;
- resolved semantic request;
- actuator ID and type;
- expected and measured semantic digest;
- draft or validation state;
- submission state;
- first failure.

Display this in the Workbench inspector and Playwright failure output. No
separate receipt schema is required.

## Expected files

Create:

- `scripts/ui/select-ui-scenarios.mjs`
- `scripts/ui/select-ui-scenarios.test.mjs`
- `packages/ui-workbench/src/replay/replay-plan.ts`
- `packages/ui-workbench/src/replay/replay-runner.ts`
- `packages/ui-workbench/src/replay/in-page-adapter.ts`
- `packages/ui-workbench/tests/driver/playwright-adapter.ts`

Refactor:

- `scripts/ui/run-ui-scenarios.mjs`
- `packages/ui-workbench/playwright.config.ts`
- `packages/ui-workbench/tests/scenario.spec.ts`
- `packages/ui-workbench/tests/driver/semantic-browser-driver.ts`
- `packages/ui-workbench/src/scenario-page.tsx`
- `packages/ui-workbench/src/runtime/test-bridge.ts`

## Implementation sequence

1. Move all selector modes onto generated-index queries.
2. Add explain output and selector unit tests.
3. Make the Playwright test entry point accept the complete selection.
4. Remove the outer process loop and start the server once.
5. Extract the shared semantic replay planner.
6. Rebuild the current Playwright driver as an adapter.
7. Replace direct Workbench Replay runtime calls with the in-page adapter.
8. Add concise replay diagnostics.

## Verification

```sh
node --test scripts/ui/select-ui-scenarios.test.mjs
pnpm ui:test:changed --base <ref> --explain
pnpm ui:test --scenario hearts.pass-three.mobile
pnpm ui:test --component CardDragSurface
pnpm ui:test
```

Add tests for direct source changes, shared UI changes, unknown UI changes,
stable selection order, and each replay execution kind.

## Acceptance criteria

- Focused and changed-only commands use one selector.
- Selection uses generated source ownership instead of filename matching.
- One Workbench test command starts one Playwright invocation and one server.
- Interactive and automated replay use the same semantic planner.
- Interactive Replay no longer submits directly through runtime APIs.
- Existing semantic, digest, Axe, and submission assertions still pass.
- Failure output identifies the first divergent replay step.

## Deferred

- timing budgets;
- run receipts;
- CI trend reporting;
- automatic dependency analysis;
- physical-device replay.
