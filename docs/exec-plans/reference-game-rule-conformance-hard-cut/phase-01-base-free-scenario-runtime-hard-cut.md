# Phase 01: Base-Free Scenario Runtime Hard Cut

Status: complete

Depends on: Phase 00

Primary repository: `dreamboard-sdk`

Coordinated consumer repository: `dreamboard`

## Objective

Replace reusable base definitions and checked-in reducer snapshots with one
self-contained behavior-scenario contract. A scenario starts a real game from
normal setup, replays legal commands, and makes typed assertions. The same
scenario must be the authority for local tests, later `inspect` / `explore`
diagnostics, exact-commit verification, dev-session materialization, Workbench
fixtures, and demo replay.

This is a breaking hard cut. Do not build an adapter that translates the old
base API into the new scenario API, and do not retain a second scenario shape
for legacy reference games. Intermediate commits on the implementation branch
may be non-mergeable while later game phases migrate the nine examples; do not
publish or merge the hard cut until the full plan's closeout gate is green.

## Current-State Evidence

The implementation must begin from the checked-out source, not from the old
tests as presumed truth:

- `packages/sdk/src/testing/definitions.ts` exports `BaseDefinition`,
  `defineBase`, `from`, `extends`, and an optional `game.patchState` mutation.
- `packages/sdk/src/testing-runtime.ts` requires `BaseStateArtifact` values and
  creates each scenario runtime from `scenario.from`.
- `packages/sdk/src/testing/create-test-runtime.ts` hydrates generated base
  snapshots and fingerprints rather than starting exclusively through normal
  game setup.
- `apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.ts` in
  the `dreamboard` repository discovers `test/bases`, generates
  `test/generated/base-states.generated.ts`, hydrates snapshots, and then calls
  the scenario's imperative `when` function.
- `apps/dreamboard-cli/src/commands/test.ts` invokes
  `generateReducerNativeArtifacts` before every test run and rejects a
  workspace without `test/bases/*.base.ts`.
- `apps/dreamboard-cli/src/templates/testing-types-content.ts` and
  `apps/dreamboard-cli/src/services/project/static-scaffold.ts` reproduce that
  model in every newly created project.

Those are migration inputs, not contracts to preserve.

## Frozen Authoring Contract

### One persistent scenario shape

The target public contract is structurally equivalent to the following. Exact
generic plumbing may follow the existing bound-authoring factory conventions,
but it must not change the authored fields or semantics:

```ts
type ScenarioSeatRef = { readonly seat: number };
type ScenarioActor = ScenarioSeatRef;

type ScenarioSetup = {
  /** Positive player count allowed by the manifest. */
  readonly players: number;
  /** A finite safe integer consumed by the normal runtime RNG. */
  readonly seed: number;
  /** Only a setup profile declared by the real game manifest. */
  readonly setupProfileId?: string | null;
};

type ScenarioCommand<InteractionId extends string, Params> = {
  readonly actor: ScenarioActor;
  readonly interactionId: InteractionId;
  readonly params: Params;
};

type ScenarioReplayDefinition<Game> = {
  readonly id: string;
  readonly description?: string;
  readonly setup: ScenarioSetup;
  /** Accepted commands that establish the state under test. */
  readonly given: readonly ScenarioCommandOf<Game>[];
  /** Accepted commands whose behavior this scenario proves. */
  readonly when: readonly ScenarioCommandOf<Game>[];
};

type ScenarioDefinition<Game> = ScenarioReplayDefinition<Game> & {
  /** Typed observations and clone-only rejection probes. */
  readonly then: (
    context: ScenarioAssertionContext<Game>,
  ) => void | Promise<void>;
};
```

The workspace helper is bound to the authored game instead of importing a
generated base-state type:

```ts
// test/testing-types.ts
import game from "../app/game";
import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";

export const { defineScenario } = createScenarioAuthoring(game);
```

An authored scenario therefore reads as ordinary data plus assertions:

```ts
import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "mosaic.master-share",
  setup: { players: 2, seed: 0 },
  given: [
    {
      actor: { seat: 0 },
      interactionId: "placeWorker",
      params: { workerId: "ordinary-1", spaceId: "timberYard" },
    },
  ],
  when: [
    {
      actor: { seat: 1 },
      interactionId: "placeWorker",
      params: { workerId: "master", spaceId: "timberYard" },
    },
  ],
  then: async ({ expect, view, probe }) => {
    expect(view({ seat: 1 })).toMatchObject({ resources: { wood: 3 } });

    // A rejection probe dispatches on a clone. It never changes the scenario
    // checkpoint used by this assertion or by inspect/explore.
    const wrongActor = await probe({
      actor: { seat: 1 },
      interactionId: "placeWorker",
      params: { workerId: "ordinary-2", spaceId: "stoneYard" },
    });
    expect(wrongActor).toRejectWith({ errorCode: "NOT_YOUR_TURN" });
  },
});
```

### Semantics

1. Validate `setup.players`, `setup.seed`, and `setup.setupProfileId` before
   creating a runtime. `seed` remains a JavaScript `number` in this hard cut
   and must satisfy `Number.isSafeInteger`; do not introduce a seed-string
   migration as collateral work.
2. Start the real reducer bundle using the declared player count, seed, and
   manifest-owned setup profile. Execute automatic setup/lifecycle work before
   replaying `given`.
3. Resolve `actor.seat` against the session's fixed seat order at dispatch
   time. Resolve every player-valued parameter leaf from the same
   `ScenarioSeatRef` shape before validating the production command. Scenario
   source must not depend on generated values such as `"player-1"`.
4. Replay `given` and `when` in source order through the same authorization,
   validation, reducer, lifecycle, and RNG path used by production dispatch.
   Every command in both arrays is expected to be accepted. A rejection fails
   replay with the segment, zero-based source index, interaction ID, structured
   error code, and trace.
5. Run `then` only after all accepted commands have replayed. The assertion
   context may read state, projected views, descriptors, explanations, flow
   diagnostics, and dispatch diagnostics. It must not expose `patchState` or a
   main-runtime `submit` method.
6. `probe(command)` clones the final checkpoint, attempts one typed canonical
   command, and returns a typed accepted/rejected result. Each call receives a
   fresh clone, so one probe cannot affect another or the scenario. This is the
   only scenario-level facility for negative dispatch assertions.
7. `given: []` and `when: []` are valid. They allow setup observations and an
   agent-authored skeleton without inventing a base.
8. Scenario command objects must be JSON-serializable data: no functions,
   symbols, class instances, cyclic values, `undefined` object values, or
   non-finite numbers. Validate this at definition load and report an exact
   field path.
9. Derive one canonical serializable `ScenarioReplayDefinition` projection by
   selecting `id`, `description`, `setup`, `given`, and `when` from the loaded
   definition. `then` remains executable test source and is never serialized.
   Bind every receipt or compiled replay to a `sourceDigest` over the canonical
   local module-dependency closure used to evaluate the scenario, including
   `then` and imported helpers. External package identity is bound separately.
   Changing an assertion or helper must invalidate prior proof.

`ScenarioCommandOf<Game>` is an authoring command, not the production wire
command type verbatim. The generated interaction contract must mark
player-valued input leaves semantically. At only those marked leaves, its
scenario parameter type substitutes `ScenarioSeatRef` for runtime `PlayerId`;
arrays and nested form values are transformed recursively. The loader resolves
those refs to current runtime IDs immediately before trusted dispatch. Do not
infer player references from names such as `targetPlayerId`, transform ordinary
strings, or let authors paste runtime IDs. `explore` emits the same seat-based
authoring representation, so every returned command can be pasted into source
and replayed in a fresh session.

`given` is organization inside one scenario, not a reusable fixture layer. A
scenario cannot import another scenario's prefix as runtime state authority.
Authors may share pure constants or command-producing TypeScript helpers, but
the evaluated scenario must contain a complete setup and fully materialized
command arrays. Receipt generation must serialize the evaluated replay
projection plus its `sourceDigest` so reviewers can see the actual path without
pretending a function-valued assertion callback is data.

`probe` deliberately accepts only contract-typed commands. It covers
wrong-actor, insufficient-resource, blocked, stale, and otherwise well-typed
runtime rejection. Schema-invalid interaction IDs, unknown manifest IDs, and
malformed wire values belong to shared SDK/ingress conformance tests that can
construct raw wire payloads; reference-game authors must not cast around the
generated contract merely to prove generic decoding.

### Deliberate exclusions

Do not add any of the following:

- `arrange`, `patch`, `mutateState`, snapshot hydration, or a differently named
  test backdoor;
- `defineBase`, `BaseDefinition`, `BaseStateArtifact`, `from`, `extends`, or
  `baseId` compatibility aliases;
- test-only setup profiles or setup profiles whose only purpose is to place a
  game near a desired terminal state;
- authored player IDs in canonical commands;
- imperative `given(ctx)` / `when(ctx)` callbacks;
- a runner selector on behavior scenarios; reducer behavior has one runner,
  while UI scenarios remain a separate consumer of the behavior scenario;
- `phase` or `stage` assertion metadata that duplicates a typed assertion in
  `then`; or
- an explicit random-stream field in the base scenario contract. Authors find
  a normal seed with Phase 02's read-only tooling and persist that number.

If a complete rule branch is too long to reach through legal play, first decide
whether it can be proven by a pure helper unit test. If integration behavior
still requires unreachable state, stop and fix the game/runtime design. Do not
solve it with test mutation.

## Runtime And Checkpoint Contract

Create one replay primitive in `@dreamboard-games/sdk/testing` and make every
consumer call it:

```ts
type ScenarioCheckpoint =
  | { readonly segment: "setup"; readonly completed: 0 }
  | { readonly segment: "given"; readonly completed: number }
  | { readonly segment: "when"; readonly completed: number };

type ReplayScenarioOptions<Game> = {
  readonly game: Game;
  readonly scenario: ScenarioReplayDefinition<Game>;
  readonly at?: ScenarioCheckpoint;
};

declare function replayScenario<Game>(
  options: ReplayScenarioOptions<Game>,
): Promise<ScenarioReplay<Game>>;

declare function assertScenario<Game>(options: {
  readonly replay: ScenarioReplay<Game>;
  readonly assertion: ScenarioDefinition<Game>["then"];
}): Promise<void>;
```

`completed` is a command count, not an array index. `given:0` is the node after
setup and before the first `given` command; `when:0` is the node after all
`given` commands and before the first `when` command. The default full test
replay completes both arrays. Phase 02 maps the CLI's `--at` syntax onto this
type.

The behavior scenario does not author checkpoint labels. A Workbench, UI, or
demo consumer may give a presentation label such as “mid-game” to the tuple
`{ scenarioPath, at }`, but that label cannot change commands, replay, or
assertions and is never a second behavior authority.

The replay object owns:

- the authoritative reducer checkpoint and deterministic checkpoint digest;
- fixed seat-to-player resolution;
- command and RNG trace through the selected node;
- projected view, descriptor, explanation, and scheduler-diagnostic readers;
- a `clone()` operation used by `probe`, `explore`, Workbench compilation, and
  backend parity checks.

The test runner loads the full `ScenarioDefinition`, extracts its canonical
`ScenarioReplayDefinition`, calls `replayScenario`, and then calls
`assertScenario` with `then`. `assertScenario` refuses a partial checkpoint and
builds the typed assertion/probe context from the replay; it does not replay or
own state. Compiled Workbench, dev, demo, and perf consumers call the same
`replayScenario` with the serializable projection and never need an assertion
function. Do not add an alternate replay overload that silently invents or
drops `then`.

Do not create separate replay implementations in the CLI, Workbench, exact
commit verifier, or internal demo tools.

## Implementation Tasks

### 1. Replace the SDK public testing types

Change:

- `packages/sdk/src/testing/definitions.ts`
- `packages/sdk/src/testing/index.ts`
- `packages/sdk/src/testing.ts`
- `packages/sdk/src/testing-runtime.ts`
- `packages/sdk/package.json` testing exports only if a new module is required
- generated API reference inputs that are driven by those exports

Add the bound `createScenarioAuthoring(game)` factory, canonical step types,
setup validation, serializable replay projection, separate `assertScenario`,
read-only assertion context, and clone-only `probe` result.
Infer interaction IDs and their parameter shapes from the bound reducer game;
do not make authors import or repeat the UI contract.

Change `CandidateVerificationInput` to accept `reducer` plus scenarios. Delete
its `bases` input and all normalization/hydration of base artifacts. Candidate
verification must call the same `replayScenario` primitive as local tests.

### 2. Build one SDK replay implementation

Refactor:

- `packages/sdk/src/testing/create-test-runtime.ts`
- `packages/sdk/src/testing/reducer-scenario/create-reducer-scenario-runner.ts`
- `packages/sdk/src/testing/reducer-scenario/types.ts`
- `packages/sdk/src/testing/create-expect-api.ts`
- their colocated tests

The runtime must construct a fresh session from normal setup and replay typed
canonical steps. Remove public hydration and fingerprint options. Preserve
diagnostic capture and interaction explanations from the completed
agent-first-authoring work; those become observations on `ScenarioReplay`.

Use a shared clone-and-dispatch primitive for both `probe` and Phase 02
exploration. A cloned rejected dispatch must leave the clone at its input
checkpoint, return the structured rejection, and never alter the source
replay.

### 3. Hard-cut the public CLI harness

In the `dreamboard` repository, refactor or split
`apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.ts` so it
loads `test/scenarios/*.scenario.ts` and delegates replay to the SDK. A split
into `scenario-loader.ts`, `scenario-replay.ts`, and test-runner modules is
preferred over adding more branches to the current large harness.

Update:

- `apps/dreamboard-cli/src/commands/test.ts`
- `apps/dreamboard-cli/src/templates/testing-types-content.ts`
- `apps/dreamboard-cli/src/services/project/static-scaffold.ts`
- `apps/dreamboard-cli/src/services/verification/exact-commit-verifier.ts`
- `apps/dreamboard-cli/src/agent-verifier/agent-workspace-verifier.ts`
- their tests and published-package smoke fixtures

Plain `dreamboard test` remains the execution command. Do not add a required
`run` subcommand. Remove the artifact-generation pass and the requirement for
at least one base. Exact-commit and agent verification require at least one
self-contained scenario and report scenario results, not base counts.

Project creation must scaffold `test/testing-types.ts` and one scenario with
normal setup. It must not create `test/bases`, `base-states.generated.ts`, or a
placeholder base snapshot. Phase 02 completes the machine-output contract and
rewires `dev --from-scenario`.

### 4. Define the cross-repository cutover sequence

Because the SDK and public CLI publish separately:

1. implement and pack the SDK candidate;
2. run the `dreamboard` CLI harness against that exact packed candidate;
3. migrate the reference games in Phases 02 through 05 on the same integration
   branch family;
4. publish the SDK hard-cut version only after the CLI consumer and all nine
   games pass their source gates;
5. pin the released SDK in the CLI release set and rerun published-package
   smoke tests; and
6. remove temporary packed-candidate wiring before merge.

Do not publish a compatibility SDK containing both base and scenario
authorities merely to make repository ordering easier.

## Deletion Ledger

| Repository       | Delete in this phase                                                                                                                                       | Replacement                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `dreamboard-sdk` | `BaseDefinition`, `BaseContext`, `defineBase`, `BaseStateArtifact`, `CandidateVerificationBase`, `from`, `extends`, `patchState`                           | bound scenario definition, normal setup, canonical steps, clone-only `probe` |
| `dreamboard-sdk` | test-runtime `baseId`, `baseStates`, base fingerprint, hydrate paths                                                                                       | `replayScenario({ game, scenario, at })`                                     |
| `dreamboard`     | typed-base discovery, inheritance resolution, base fingerprinting, base projection emission, `generateReducerNativeArtifacts` as an execution prerequisite | scenario discovery and direct replay                                         |
| `dreamboard`     | scaffolded `test/bases/initial-turn.base.ts`, `test/generated/base-states.generated.*`, generated base IDs in testing types                                | source `test/testing-types.ts` bound to `app/game.ts`                        |
| `dreamboard`     | verifier failures such as `No bases found` and base-count proof                                                                                            | `No scenarios found` plus structured scenario replay results                 |

Tracked generated files already present under the nine reference games are
removed game by game in the migration and artifact phases. Do not bulk-delete
them before their consumers have moved; do not allow them to remain execution
inputs after this phase.

## Tests And Proof

### SDK tests

- Type tests prove interaction IDs and `params` are inferred from the bound
  game, a wrong parameter shape fails compilation, and `actor.seat` is the
  only authored actor identity.
- Definition validation rejects unsafe seeds, invalid player counts, unknown
  real setup profiles, non-serializable command data, and out-of-range seats
  with stable field paths.
- Replay tests prove setup, `given`, and `when` ordering; automatic lifecycle
  execution; deterministic RNG; checkpoint count semantics; and precise
  rejection location.
- Clone tests prove `probe` accepted and rejected attempts do not alter the
  source replay and that two probes are isolated.
- Candidate-verification tests run without a `bases` property and cannot
  hydrate a supplied snapshot.
- Compile-time negative tests prove `defineBase`, `from`, `extends`,
  `patchState`, imperative `when`, runner selectors, and test-only setup fields
  are absent from the public contract.

### CLI tests

- A newly scaffolded workspace contains a self-contained scenario and no
  `test/bases` or generated base-state file.
- `dreamboard test` loads and runs the scenario without calling an artifact
  generator.
- A missing scenario, duplicate ID, invalid command, and rejected replay are
  structured failures with the scenario path and command segment/index.
- Exact-commit verification and the agent verifier call the same replay path
  and do not inspect a base count.
- Grep tests prevent the deleted base vocabulary from returning in testing
  templates, help text, or runtime code.

### Required commands

From `dreamboard-sdk`:

```bash
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm pack:consumer-check
```

From `dreamboard` against the exact packed SDK candidate:

```bash
pnpm --dir apps/dreamboard-cli typecheck
pnpm --dir apps/dreamboard-cli test
pnpm --dir apps/dreamboard-cli run build
```

Focused greps must return no matches outside the phase ledger and intentionally
unmigrated reference-game files:

```bash
rg -n "defineBase|BaseDefinition|BaseStateArtifact|patchState|baseId|baseStates" packages/sdk/src
rg -n "generateReducerNativeArtifacts|test/bases|base-states.generated|No bases found" apps/dreamboard-cli/src
```

## Phase Receipt

Write
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-01-closeout-<YYYYMMDD>.md`
with:

- exact SDK and CLI commits;
- packed SDK tarball name and SHA-256 used by the CLI proof;
- old-to-new public symbol ledger;
- focused test and command output;
- the list of reference-game files still awaiting migration in later phases;
  and
- confirmation that no base compatibility adapter or test state mutation was
  added.

## Entry Criteria

- Phase 00 has frozen the authority order, game conformance matrix, and current
  generated-artifact inventory.
- The SDK and CLI baseline commands and current expected failures are recorded.
- The implementation branch is explicitly marked non-publishable until all
  nine games and cross-repository consumers complete the hard cut.

## Exit Criteria

- The SDK exposes only the self-contained scenario contract.
- One replay/checkpoint implementation powers test execution and candidate
  verification.
- Plain `dreamboard test` executes base-free scenarios from a newly scaffolded
  workspace.
- The SDK and CLI focused gates pass against the same packed candidate.
- All deleted symbols and execution dependencies are absent from framework and
  CLI source.
- The phase receipt identifies, rather than conceals, the reference-game work
  that keeps the integration branch non-mergeable until later phases.

## STOP Conditions

Stop this phase and record the blocker instead of weakening the contract if:

- a consumer requires arbitrary snapshot hydration for correctness;
- interaction parameter types cannot be inferred without checking in a
  generated testing contract;
- clone-and-dispatch cannot guarantee isolation from the source replay;
- a normal setup profile is insufficient and the proposed fix is a test-only
  profile or state patch;
- CLI and candidate verification would need different replay semantics;
- repository sequencing appears to require publishing both old and new public
  testing APIs; or
- a runtime capability needed by multiple game families is missing. Record it
  as an explicit framework task with generic semantics; do not hide a
  game-specific workaround in the test runtime.
