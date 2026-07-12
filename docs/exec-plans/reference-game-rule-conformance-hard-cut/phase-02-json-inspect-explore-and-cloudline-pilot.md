# Phase 02: JSON Inspect/Explore And Cloudline Survey Pilot

Status: implementation in progress

Depends on: Phase 01

Primary repositories: `dreamboard-sdk`, `dreamboard`

Pilot workspace:
`examples/reference-games/roll-and-write-scorecard` (Cloudline Survey)

## Objective

Ship the single agent-facing authoring loop on top of Phase 01's scenario
replay, then use it to bring Cloudline Survey into conformance with its
authoritative `rule.md` from normal setup through an eight-round outcome.

There are not two testing modes:

- a scenario file is the only persistent executable proof;
- `dreamboard test` replays scenarios and runs their assertions;
- `dreamboard test inspect` observes a node in that same replay; and
- `dreamboard test explore` speculatively enumerates accepted next commands
  from that same node without changing the scenario.

`inspect` and `explore` must not create source drafts, checked checkpoints,
authored caches, base states, or a second scenario language. A transparent,
ignored, content-addressed local cache may accelerate replay only when deleting
it cannot change results. The agent copies a returned canonical command into
the scenario and reruns `dreamboard test`.

## Public Command Surface

| Command                                                                           | Meaning                                                                                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `dreamboard test`                                                                 | Replay selected/all scenarios fully and run `then` assertions.                                                                  |
| `dreamboard test --scenario <path>`                                               | Run one scenario file; keep the existing option for scripts.                                                                    |
| `dreamboard test inspect <path> --perspective <value> [--at <node>]`              | Return one perspective's exact replay node, public state, view, interactions, actions, flow diagnostics, and entropy trace.     |
| `dreamboard test explore <path> --perspective <value> [--at <node>]`              | Return deterministic accepted concrete next commands visible and executable for that perspective, plus speculative after-nodes. |
| `dreamboard test explore <path> --perspective <value> --seed-range <start>:<end>` | Compare perspective-scoped normal replays across an inclusive bounded seed range, then let the agent persist one seed.          |

`--at` accepts exactly:

- `setup`;
- `given:<n>`; or
- `when:<n>`.

`n` is the number of commands completed, not a zero-based source index. The
default for `inspect` and `explore` is `given:<given.length>`, the node after
all setup commands and before the behavior under test. `given:0` is equivalent
to the node immediately after normal setup. `when:0` names the same reducer
node as the default but preserves the author's requested segment in the
response.

`--perspective` is required and accepts exactly `player:<zero-based-seat>` or
`spectator`. A player perspective receives only that player's normal view,
descriptors, explanations, and concrete command candidates. A spectator
receives the spectator view and no player commands. The selected perspective
is echoed in every result and is part of cursor identity. To author a
multiplayer path, an agent queries each acting seat separately; there is no
omniscient aggregate response.

The commands are read-only with respect to source and persistent runtime
state. `--seed <safe-integer>` and `--seed-range` are ephemeral diagnostic
overrides reported in the response. They never rewrite the scenario. An agent
must copy the chosen seed into `scenario.setup.seed` before that branch becomes
test authority.

Do not add `--format`, a human-output mode, an interactive chooser, a draft
file, or a test-specific query language.

## Machine-Output Contract

### One semantic envelope by default

Every command in the `test` family writes exactly one JSON object followed by
one newline to stdout, including plain `dreamboard test`. Successful stderr is
empty. Failures also write exactly one JSON failure envelope to stdout, set a
nonzero exit code, leave stderr empty, and do not require prose parsing. Detect
the `test` command family before ordinary command parsing and catch validation,
assertion, and unexpected execution failures at that boundary. Only a process
bootstrap failure that occurs before the command family can be recognized may
fall back to the CLI's ordinary stderr behavior.

Use the existing `CommandResult<T>` envelope in
`packages/cli-core/src/results/command-result.ts`:

```json
{
  "schemaVersion": 2,
  "ok": true,
  "command": "test.inspect",
  "result": {
    "schemaVersion": 1,
    "scenario": {
      "id": "cloudline.complete-game",
      "path": "test/scenarios/complete-game.scenario.ts",
      "sourceDigest": "sha256:..."
    },
    "node": {},
    "seedSource": "scenario"
  },
  "nextActions": []
}
```

Retain the portable `test` command ID and extend `CommandId` only with
`test.inspect` and `test.explore`; these small result identifiers belong in
`cli-core`. Reducer
DTOs, scenario loading, rendering, and presentation do not. Keep them in the
SDK testing package or `apps/dreamboard-cli` in accordance with the CLI-core
architecture boundary.

The current CLI globally consumes `--json` / `--json-events` in
`apps/dreamboard-cli/src/machine-output.ts` and wraps captured terminal output.
The implementation must special-case semantic-JSON commands at the command
runner boundary rather than printing JSON inside the old capture wrapper:

- the test command family selects semantic JSON even without a flag;
- a globally consumed `--json` is a redundant compatibility spelling and
  produces the same single envelope, never an envelope containing escaped JSON
  in `result.stdout`;
- do not declare or document a test-local `--json` option; and
- reject `--json-events` for this non-streaming family with one failure
  envelope and stable code `TEST_JSON_EVENTS_UNSUPPORTED`. Do not emit a
  started event plus a terminal event.

Add a semantic-output path to `apps/dreamboard-cli/src/cli-main.ts` and
`apps/dreamboard-cli/src/machine-output.ts`. Do not scatter direct
`process.stdout.write` calls across test services. Remove `consola` rendering
from `apps/dreamboard-cli/src/commands/test.ts`; `--debug`, if retained for
backward compatibility during this plan, may only add typed diagnostic fields
to the result and must not print side-channel logs. The preferred closeout is
to remove that presentation flag because inspect already exposes the trace.

### Stable failures

Use `CommandFailure.problem.code` plus typed `problem.context`. At minimum,
reserve and test:

| Code                            | Exit code             | Required data or context                                  |
| ------------------------------- | --------------------- | --------------------------------------------------------- |
| `TEST_SCENARIO_NOT_FOUND`       | `ExitCode.Validation` | requested path                                            |
| `TEST_SCENARIO_DUPLICATE_ID`    | `ExitCode.Validation` | scenario ID and paths                                     |
| `TEST_SCENARIO_INVALID`         | `ExitCode.Validation` | path and field path                                       |
| `TEST_CHECKPOINT_INVALID`       | `ExitCode.Validation` | requested node and valid bounds                           |
| `TEST_SCENARIO_REPLAY_REJECTED` | `ExitCode.Validation` | segment, source index, interaction ID, reducer error code |
| `TEST_SCENARIOS_FAILED`         | `ExitCode.Validation` | deterministic `TestRunResult`                             |
| `TEST_PERSPECTIVE_INVALID`      | `ExitCode.Validation` | requested perspective and valid player seats              |
| `TEST_SEED_RANGE_INVALID`       | `ExitCode.Validation` | requested range and maximum width                         |
| `TEST_EXPLORE_CURSOR_STALE`     | `ExitCode.Conflict`   | scenario digest and checkpoint digest                     |
| `TEST_EXPLORE_LIMIT_INVALID`    | `ExitCode.Validation` | requested and allowed pagination/evaluation limits        |
| `TEST_JSON_EVENTS_UNSUPPORTED`  | `ExitCode.Validation` | requested mode                                            |
| `TEST_UNEXPECTED`               | `ExitCode.Unexpected` | stable failure category and optional safe diagnostic ID   |

Messages may improve without a schema bump; agents branch on codes and typed
context only.

Extend the portable result helper with an optional JSON-value payload on
`ProblemDetails`, for example `data?: JsonValue`. `JsonValue` is a
dependency-free CLI-core primitive; it must not import reducer, scenario,
browser, React, or presentation types. `TEST_SCENARIOS_FAILED` places the same versioned
`TestRunResult` in `problem.data`, so a failure retains the complete summary
without widening the primitive-only `context` map or inventing captured
stdout.

### Test-run result

Plain `dreamboard test` returns a semantic result rather than a captured PASS /
FAIL transcript:

```ts
type TestRunResult = {
  readonly schemaVersion: 1;
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly scenarios: readonly {
    readonly id: string;
    readonly path: string;
    readonly status: "passed" | "failed";
    readonly failure?: {
      readonly code: string;
      readonly message: string;
      readonly context: Readonly<Record<string, JsonValue>>;
    };
  }[];
};
```

Order scenarios by normalized repo-relative path and then ID. One failed
scenario makes the command envelope a failure with a nonzero exit code, while
`problem.data` retains the complete deterministic scenario summary. Do not
make agents join a human transcript back to scenario paths.

## Inspect DTO

Add versioned DTOs under `packages/sdk/src/testing`, re-exported from
`@dreamboard-games/sdk/testing`. The CLI should serialize them, not rebuild
them from private runtime fields.

```ts
type ActorRef = {
  readonly seat: number;
  readonly playerId: string;
};

type PerspectiveRef =
  | { readonly kind: "player"; readonly actor: ActorRef }
  | { readonly kind: "spectator" };

type FlowDiagnostic = {
  readonly phase: string;
  readonly step: string | null;
  /** Actors to whom the scheduler currently offers interaction collection. */
  readonly activeActors: readonly ActorRef[];
  /** Actors with an unresolved response or commitment obligation. */
  readonly pendingActors: readonly ActorRef[];
  /** Actors whose owned continuation is paused by another actor. */
  readonly continuationWaiters: readonly ActorRef[];
  /** Causal continuation dependencies proven by scheduler authority. */
  readonly blockedBy: readonly {
    readonly actor: ActorRef;
    readonly blockers: readonly ActorRef[];
    readonly source: "scheduler";
  }[];
};

type InspectInteraction = {
  readonly actor: ActorRef;
  readonly interactionId: string;
  readonly availability: {
    readonly status:
      | "available"
      | "notYourTurn"
      | "insufficientResources"
      | "blocked";
    readonly code?: string;
    readonly reason?: string;
  };
  readonly inputs: readonly {
    readonly key: string;
    readonly kind: string;
    readonly eligibleCount: number | "lazy";
  }[];
  readonly explanation: InteractionExplanation;
};

type InspectAction = {
  readonly actor: ActorRef;
  readonly interactionId: string;
  readonly inputs: InspectInteraction["inputs"];
  readonly explanation: InteractionExplanation;
  readonly hasConcreteCommand: true;
};

type ScenarioDispatchTraceEntry =
  | {
      readonly kind: "acceptedCommand";
      readonly actor: ActorRef;
      readonly interactionId: string;
    }
  | {
      readonly kind: "appliedInstruction";
      readonly instructionKind: string;
    }
  | {
      readonly kind: "entropyDraw";
      /** Index into the adjacent structured entropy.draws array. */
      readonly drawIndex: number;
    };

type InspectNode = {
  readonly checkpoint: ScenarioCheckpoint;
  readonly checkpointDigest: `sha256:${string}`;
  readonly setup: ScenarioSetup;
  readonly flow: FlowDiagnostic;
  readonly perspective: PerspectiveRef;
  /** Public reducer projection; never the authoritative private snapshot. */
  readonly publicState: unknown;
  /** Exactly the selected player or spectator projection. */
  readonly view: unknown;
  /** Every descriptor visible in the selected perspective. */
  readonly interactions: readonly InspectInteraction[];
  /** Interactions proven to have at least one legal complete parameter set. */
  readonly actions: readonly InspectAction[];
  readonly entropy: {
    readonly seed: number;
    readonly draws: readonly {
      readonly index: number;
      readonly cursorBefore: number;
      readonly cursorAfter: number;
      readonly operation: {
        readonly kind: string;
        readonly parameters: Readonly<
          Record<string, string | number | boolean>
        >;
      };
    }[];
  };
  readonly dispatchTrace: readonly ScenarioDispatchTraceEntry[];
};
```

`interactions` contains the descriptors visible to exactly one perspective and
their authoritative availability. `actions` contains only interactions for
which trusted authorization passes and the complete dependent input domain has
at least one legal assignment. The collector/domain layer must provide a
budget-independent `hasAny` operation; a bounded explore page is not the test
for actionability. An action is performable now, but that does **not** make it
required. The framework adds no `requiredActions` field.

Feed that same satisfiability result into the trusted production descriptor. If
authorization passes but the dependent domain has no complete assignment, the
interaction is `blocked` with a typed no-legal-input code and is greyed out in
normal UI projection; inspection must not repair a production availability bug
only for tests.

The CLI never serializes the authoritative private reducer snapshot or combines
player views. `publicState`, `view`, `interactions`, `actions`, explanations,
dispatch trace, entropy projection, and explore candidates are all scoped to
the echoed perspective. Entropy trace fields are structured JSON, never a
string an agent must parse. Raw sampled values are omitted; their observable
consequences appear only when the selected public/player view normally exposes
them.

Do not expose the current `DispatchTraceSummaryEntry` directly: its RNG branch
contains a string `traceEntry`. Preserve a structured entropy draw index at the
reducer trace-emission source and project it into
`ScenarioDispatchTraceEntry`. If the current raw trace lacks that metadata,
version the raw RNG entry and its summarizer; never recover it by parsing the
legacy string. Filter instruction and accepted-command entries through the
same perspective projection, omitting an entry rather than leaking private
content.

### Scheduler-derived obligations and blockers

The current SDK already has per-interaction `blocked` availability and an
`InteractionExplanation.actor.required` list. It does not have a `blockedBy`
contract. This phase adds one diagnostic projection derived from scheduler
authority; authors do not declare it.

Calculation rules:

1. Ask the trusted phase/step scheduler for current interaction actors,
   unresolved response/commitment actors, continuation waiters, and causal
   dependencies at the selected node. `pendingActors` includes simultaneous
   commitments, forced-discard responders, and a single targeted responder; an
   ordinary active turn actor is not pending. Do not infer these sets by
   parsing descriptor text or game-state conventions.
2. Resolve actor IDs to fixed seats and order every actor list by seat.
3. Emit a `blockedBy` edge only when the scheduler can prove that the named
   actor's continuation is waiting for the named unresolved actor(s). Omit an
   uncertain edge rather than guessing.
4. `continuationWaiters` contains every `blockedBy.actor` exactly once. A
   waiter may be outside `activeActors`; it owns progress that cannot continue
   until its blockers resolve.
5. An inactive player in an ordinary single-actor turn is not reported as
   blocked by the active player. Cloudline Survey therefore shows its one
   marker in `activeActors`, with empty `pendingActors`,
   `continuationWaiters`, and `blockedBy` arrays. Whether that actor has a
   performable command is expressed only by the selected perspective's
   `actions` array.
6. Later phases must prove simultaneous barriers, targeted responses, and
   forced multi-actor procedures against this same DTO. If the scheduler lacks
   enough internal metadata, add typed scheduler metadata inside trusted
   runtime machinery. Do not add `playerTurn.decision`, authored `blockedBy`,
   or a game-authored decision object.

Actor identities in `activeActors`, `pendingActors`, `continuationWaiters`, and
`blockedBy` are universally public scheduler metadata in schema version 1.
They may describe who owes a response, but never whether another player's
private input domain is satisfiable or what that player selected. A future game
with secret scheduler participation requires a versioned flow-redaction design
before adoption; it must not overload these fields or silently leak identities.

Implement the trusted projection near the existing decision machinery in:

- `packages/sdk/src/reducer/bundle/trusted/interaction-decision.ts`;
- `packages/sdk/src/reducer/bundle/trusted/interaction-types.ts`;
- the phase/step scheduler and lifecycle modules that actually own actor
  continuation; and
- `packages/sdk/src/testing` as the local diagnostic consumer.

Do not put test-only flow fields onto production game state.

## Explore DTO And Enumeration Rules

Default/single-seed exploration returns only accepted, fully concrete command
steps:

```ts
type ExploreTransitionResult = {
  readonly schemaVersion: 1;
  readonly mode: "transitions";
  readonly scenario: ScenarioIdentity;
  readonly perspective: PerspectiveRef;
  readonly node: InspectNode;
  readonly candidates: readonly {
    readonly ordinal: number;
    readonly command: ScenarioCommand;
    readonly after: {
      readonly checkpointDigest: `sha256:${string}`;
      readonly flow: FlowDiagnostic;
      readonly publicStateDigest: `sha256:${string}`;
      readonly viewDigest: `sha256:${string}`;
      readonly actions: readonly {
        readonly actor: ActorRef;
        readonly interactionId: string;
      }[];
      readonly entropy: InspectNode["entropy"];
      readonly dispatchTrace: readonly ScenarioDispatchTraceEntry[];
    };
  }[];
  readonly omissions: readonly {
    readonly actor: ActorRef;
    readonly interactionId: string;
    readonly code: "INPUT_DOMAIN_NOT_ENUMERABLE" | "INPUT_DOMAIN_BUDGET";
    readonly inputKey?: string;
  }[];
  readonly page: {
    readonly limit: number;
    readonly evaluated: number;
    readonly truncated: boolean;
    readonly nextCursor: string | null;
  };
};
```

Enumeration is framework-generic:

1. Start from Phase 01's replay checkpoint and clone it once per attempted
   concrete command.
2. Consider only actions in the selected player perspective. A spectator
   perspective returns no candidates. Never aggregate candidate parameters
   from multiple private views.
3. Materialize dependent input domains in their declared dependency order.
   Use collector/domain authority; never scrape UI labels or assume board,
   card, dice, resource, or phase names.
4. Convert contract-marked player-valued domain leaves from runtime IDs to
   Phase 01 `ScenarioSeatRef` values in the returned authoring command. Resolve
   them back only for cloned dispatch. Never infer player values from property
   names or expose a session's generated ID as pasteable source.
5. Dispatch each fully materialized command on a fresh clone. Return it only
   if trusted dispatch accepts it. Exploration is a list of accepted next
   transitions, not a claim that every schema-valid parameter set is legal.
6. Order candidates by interaction declaration order and canonical JSON
   parameter bytes. The order must be identical across processes for the same
   source digest, checkpoint, and perspective.
7. An opaque cursor encodes enumeration version, scenario source digest,
   checkpoint digest, perspective, seed override, and next ordinal. Reject it
   as stale when any authority changes.
8. `--limit` defaults to 50 and has a maximum of 200. A deterministic
   `--max-evaluations` defaults to 5,000. Do not use wall-clock time to decide
   which candidates appear. A safety timeout may fail the whole command but
   may not return a machine-dependent partial page.
9. A lazy or unbounded domain that cannot be completely materialized within
   the declared budget produces a typed omission. Do not invent representative
   values and do not describe an omitted candidate as accepted.
10. No speculative dispatch may mutate the observed node, a sibling clone, a
    backend session, or any source/generated file.

### Generic seed discovery

`--seed-range <start>:<end>` selects a second discriminated result mode:

```ts
type ExploreSeedResult = {
  readonly schemaVersion: 1;
  readonly mode: "seeds";
  readonly scenario: ScenarioIdentity;
  readonly perspective: PerspectiveRef;
  readonly checkpoint: ScenarioCheckpoint;
  readonly variants: readonly {
    readonly seed: number;
    readonly status: "replayed" | "rejected";
    readonly checkpointDigest?: `sha256:${string}`;
    readonly entropy?: InspectNode["entropy"];
    readonly observable?: {
      readonly publicState: unknown;
      readonly view: unknown;
    };
    readonly signature?: {
      readonly phase: string;
      readonly step: string | null;
      readonly actions: readonly {
        readonly seat: number;
        readonly interactionId: string;
        readonly concreteOptionCount: number | "lazy";
      }[];
    };
    readonly rejection?: {
      readonly segment: "given" | "when";
      readonly sourceIndex: number;
      readonly interactionId: string;
      readonly errorCode: string;
    };
  }[];
};
```

The range is inclusive, safe-integer only, ordered ascending, and limited to 64
seeds per invocation because each replay includes the selected perspective's
structured observable state. It replays the same scenario/checkpoint under
each normal setup seed. The agent can select a branch by JSON fields in
`observable`—for example a public dice total—without parsing trace prose or
seeing a hidden deck. It is not a dice matrix: shuffled decks, random setup,
automa choices, and any future seeded procedure use the same structured trace,
observable projection, and action signature. An agent selects a candidate
seed, reruns `inspect` / `explore` with `--seed <n>`, then persists it in
source.

## Typical Agent Workflow

```bash
# 1. Create a scenario skeleton with setup and empty command arrays.
dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:0

# 2. Discover generic seeded branches when the next node consumes entropy.
dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup --seed-range 1:64

# 3. Inspect the chosen normal seed and see exact available commands/reasons.
dreamboard test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at setup --seed 17

# 4. Enumerate concrete accepted commands at the current scenario prefix.
dreamboard test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:0 --at given:3 --seed 17 --limit 50

# 5. Copy one returned `candidate.command` into `given` or `when`, persist
#    setup.seed = 17, and prove the authored file.
dreamboard test --scenario test/scenarios/complete-game.scenario.ts

# 6. Start a real backend session at the same authored prefix for visual work.
dreamboard dev \
  --from-scenario test/scenarios/complete-game.scenario.ts \
  --at given:3
```

No step parses prose, edits a generated snapshot, or translates between an
exploration format and a test format.

## Implementation Tasks

### 1. Add SDK inspection and exploration services

Create focused modules under `packages/sdk/src/testing`, for example:

```text
inspection/
  inspect-scenario.ts
  flow-diagnostic.ts
  types.ts
exploration/
  enumerate-commands.ts
  explore-scenario.ts
  cursor.ts
  types.ts
```

Reuse Phase 01's replay, clone, authorization explanations, collector domains,
and diagnostics. Add no CLI imports to the SDK. Version the result DTOs and
canonicalize all hashes/cursors with one tested serializer.

Add a deterministic non-random SDK fixture game to the exploration tests. It
must prove that the enumerator works for an ordinary single-actor action with
dependent non-board inputs. Cloudline supplies the entropy pilot, but no
exploration code or schema may branch on `roll`, `dice`, `markCell`, square
boards, or Cloudline IDs.

### 2. Implement the public CLI commands and output boundary

In `dreamboard`, update:

- `apps/dreamboard-cli/src/commands/test.ts` and its tests;
- `apps/dreamboard-cli/src/cli-main.ts`;
- `apps/dreamboard-cli/src/machine-output.ts`;
- `packages/cli-core/src/results/command-result.ts` for command IDs and the
  dependency-free optional JSON failure payload only;
- the Phase 01 testing service split under
  `apps/dreamboard-cli/src/services/testing`; and
- `apps/dreamboard-cli/src/published-package-smoke.test.ts` and command-tree
  allowlist tests.

The canonical selector for test, inspect, explore, and dev is one normalized
repo-relative scenario file path. The CLI resolves it inside the project root,
loads exactly one default export, calls the SDK service, and serializes its DTO.
The authored scenario ID appears in results and must be unique across the
discovered workspace, but it is not a second command selector. Reject absolute
paths outside the project, `..` traversal, duplicate IDs, and multiple
scenarios per requested file. Keep all path/error data structured.

### 3. Rewire `dev --from-scenario`

Update `apps/dreamboard-cli/src/commands/dev.ts` and the scenario materializer
currently implemented by `createScenarioActionPlan` /
`createSessionFromScenario` in
`apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.ts`:

- accept the same repo-relative scenario path and
  `--at setup|given:n|when:n` syntax;
- default to the end of `given`, so the author can perform `when` manually;
- create a normal backend session with the scenario's players, seed, and real
  setup profile;
- replay the selected accepted prefix through backend dispatch in order;
- remove generated-base creation, fingerprint trust, and snapshot hydration;
- compare local checkpoint and backend projection/flow digests before opening
  the host; and
- fail with the exact divergent source command when backend replay differs.

`dev --from-scenario` is a consumer of the scenario, not another test mode. It
does not run `then` and does not write back a backend snapshot.

### 4. Migrate Cloudline Survey vertically

Treat
`examples/reference-games/roll-and-write-scorecard/rule.md` as authority and
the current reducer/tests as legacy evidence. At minimum:

1. Replace the fixed `cloudlineRolls` / `rollForRound` path in
   `app/model.ts` and the fixed setup roll in `app/phases/setup.ts` with two
   real engine-owned seeded d6 results for each of eight rounds.
2. If automatic lifecycle code cannot currently sample an integer without a
   player submission, add the smallest generic seeded mutation helper to the
   SDK (for example `random.integer({ minInclusive, maxInclusive })`) and trace
   each draw. Do not create a hidden player `roll` interaction, use
   `random.subset` as a fake die, or retain a checked-in result list.
3. Preserve strict seat-order `markCell` resolution, legal matching/fallback
   target derivation, public per-player grids, and terminal outcome in reducer
   authority. Align terminal reason and score component IDs exactly with the
   approved rule.
4. Replace the current `node:test` files that merely construct `PublicState`
   helpers with Phase 01 scenarios that run the reducer. Add
   `test/scenarios/complete-game.scenario.ts` from ordinary setup through all
   eight rounds and `gameOver`.
5. Cover the rule's integration obligations with focused scenario families:
   same-seed replay, separate 1/2/3/4-player seat-order files, separate
   multiple/one/no-matching-target branches, wrong-player/wrong-board/illegal-
   cell rejection through clone-only probes, public projections, and terminal
   standings. Each file default-exports exactly one setup/seed/path.
6. Move scoring and connectivity edge cases that are genuinely algorithmic to
   pure unit tests over typed score inputs. They may construct score inputs;
   they may not hydrate reducer state or masquerade as complete-game proof.
7. Update `reference-game.json` behavior-scenario paths and every
   `test/ui-scenarios` import to the new behavior scenarios. Add the complete
   game to behavior authority even if a shorter scenario remains the preferred
   screenshot node.
8. Update visible metadata from the legacy “Roll And Write Scorecard” name to
   Cloudline Survey where Phase 00 has not already done so. Remove stale claims
   about simultaneous marking and fixed seeded roll lists.

Use `explore --seed-range` to select and document seeds for each entropy branch.
The scenario source stores only normal numeric seeds and accepted commands.

### 5. Update agent help and skill authority

Change the source docs in `dreamboard`:

- `docs/reference/testing.mdx`;
- `docs/reference/cli.mdx`;
- `docs/quickstart.mdx` where the command summary appears;
- `docs/tutorials/building-your-first-game.mdx`; and
- `skills/dreamboard/SKILL.md`.

Then run `apps/dreamboard-cli/scripts/sync-skill-docs.ts` through the repository
script so generated files under `skills/dreamboard/references` match their MDX
sources. Document one workflow only: author scenario, inspect, explore, copy a
canonical command, run test, optionally launch dev from the prefix.

Help snapshots must show JSON-by-default behavior, exact `--at` grammar,
pagination, seed override/range limits, and stable failure codes. Do not
describe “human mode,” “required actions,” `playerTurn.decision`, or base
generation.

## Deletion Ledger

| Delete                                                      | Location                                     | Replacement                                                                      |
| ----------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| Human PASS/FAIL and summary rendering                       | `apps/dreamboard-cli/src/commands/test.ts`   | one `CommandResult<TestRunResult>` JSON envelope                                 |
| JSON double-wrapping through captured stdout                | `cli-main.ts`, `machine-output.ts` test path | semantic-JSON command runner                                                     |
| Generated base prerequisite in dev scenario materialization | `dev.ts`, testing harness                    | normal setup plus canonical prefix replay                                        |
| Fixed eight-roll table and fixed-roll manifest copy         | Cloudline `app/model.ts`, setup/metadata     | seeded engine RNG trace                                                          |
| State-construction files presented as behavior scenarios    | Cloudline `test/scenarios`                   | reducer-native self-contained scenarios; pure algorithm tests live as unit tests |
| Legacy testing/base guidance                                | CLI docs, skill, help text                   | inspect/explore workflow                                                         |

Do not delete shared Workbench or release fixtures in this phase; later phases
cut those consumers over after more scheduler shapes are proven.

## Tests And Verification

### SDK contract tests

- Inspecting `setup`, every valid `given:n`, and every valid `when:n` returns
  the same checkpoint as direct prefix replay; invalid bounds fail stably.
- Running inspect separately for every player seat and spectator yields only
  that perspective's view/interactions/actions; public state, explanations,
  dispatch trace, and structured entropy trace are JSON-serializable and
  deterministic.
- An ordinary single-actor turn emits no false `blockedBy` edges.
- Exploration returns only commands accepted by a fresh cloned dispatch;
  replaying every returned command from the source node reaches its reported
  after digest.
- Enumeration order and cursors are stable across separate processes; a source
  or checkpoint change makes an old cursor stale.
- Candidate/evaluation limits, budget-independent `hasAny`, lazy-domain
  omissions, and seed-range limits are deterministic. Pagination cannot change
  `actions`.
- A non-random, non-board fixture proves dice-independent enumeration.
- Seed variants reproduce normal RNG traces and perspective-scoped observable
  JSON; selecting one with `--seed` gives the same node as persisting that seed
  in a copy of the scenario.

### CLI output tests

- Capture the actual process for `test`, `test inspect`, and `test explore`;
  assert stdout has exactly one newline-terminated JSON object, stderr is empty
  for recognized-family success and failure, and no ANSI/progress text appears.
- Default output and redundant global `--json` deserialize to the same semantic
  envelope; neither contains `result.stdout` or escaped nested JSON.
- Global `--json-events` returns one `TEST_JSON_EVENTS_UNSUPPORTED` envelope.
- Every stable failure code has a process-level exit-code assertion and typed
  context assertion.
- Throw once from scenario loading, replay, and assertion execution; each
  recognized-family case must become one `TEST_UNEXPECTED` envelope with no
  stack, terminal transcript, or stderr side channel. Separately characterize
  the narrow pre-recognition bootstrap fallback.
- Omitting or forging `--perspective`, requesting an out-of-range seat, and
  exploring as spectator fail or return no candidates exactly as specified.
- Published-package smoke tests exercise inspect and explore from a generated
  project, not only source imports.

### Cloudline conformance proof

- Two d6 draws per round and exactly sixteen draws in a complete game.
- Same setup seed and accepted command path produce identical dice, marks,
  projections, traces, scores, and standings in two fresh processes.
- A seed-range discovery receipt shows at least two distinct legal-target
  branches without embedding a roll matrix in the game or test runtime.
- Complete eight-round scenarios pass for representative player counts,
  including solo and multiplayer terminal outcomes.
- Focused scenarios/probes cover every acceptance obligation in `rule.md`;
  pure unit tests are explicitly separated in the receipt.
- UI scenario imports resolve and the mobile/desktop required path remains
  keyboard- and pointer-operable.
- `dreamboard dev --from-scenario test/scenarios/complete-game.scenario.ts --at given:<n>`
  reaches the same projection/flow digest as local inspect before the browser
  opens.

### Required commands

From `dreamboard-sdk`:

```bash
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk test
pnpm --dir examples/reference-games/roll-and-write-scorecard verify
pnpm reference-games:check
pnpm ui:fixtures:check
pnpm pack:consumer-check
```

From `dreamboard` against the exact packed SDK candidate:

```bash
pnpm --dir apps/dreamboard-cli typecheck
pnpm --dir apps/dreamboard-cli test
pnpm --dir apps/dreamboard-cli run build
pnpm skills:sync-docs
git diff --exit-code -- skills/dreamboard/references
```

Run process-level smoke commands from a freshly scaffolded fixture and retain
the raw stdout/stderr/exit-code triplets in the phase receipt.

## Phase Receipt

Write
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-02-closeout-<YYYYMMDD>.md`
with:

- exact SDK and CLI commits and packed-candidate SHA-256;
- JSON schemas/examples for run, inspect, transition exploration, seed
  exploration, and every stable failure;
- Cloudline's rule-obligation-to-scenario/unit/UI proof matrix;
- selected seeds and the seed-range command that discovered them;
- a complete-game trace summary showing 8 rounds and 16 d6 draws;
- local-versus-backend digest proof for `dev --from-scenario`;
- before/after Cloudline tracked bytes and lines; and
- confirmation that no dice-specific branch, authored blocker, base state,
  state patch, or second scenario format was added.

## Entry Criteria

- Phase 01's base-free scenario types, replay checkpoints, clone operation, and
  CLI test runner are available from the exact packed SDK candidate.
- Phase 00 records Cloudline's current drift, including the fixed roll list and
  state-construction tests.
- The approved Cloudline `rule.md` is frozen as gameplay authority.

## Exit Criteria

- Agents have one documented JSON workflow across authoring, observation,
  exploration, proof, and dev launch.
- `test`, `inspect`, and `explore` each emit one stable semantic envelope by
  default with no human mode.
- Flow diagnostics and `blockedBy` are derived by scheduler/runtime authority;
  no new authored decision field exists.
- Exploration is proven with both generic non-dice SDK fixtures and seeded
  Cloudline behavior.
- Cloudline conforms to its approved complete game arc and has a normal-setup
  complete-game scenario.
- Public CLI help, source docs, generated skill references, and the installed
  agent skill describe the same single path.
- All focused SDK, CLI, packed-consumer, reference-game, and UI gates pass.

## STOP Conditions

Stop and record the blocker instead of adding a local workaround if:

- active/pending actors or causal blockers cannot be derived from scheduler
  authority without reading game-specific state;
- concrete input enumeration requires scraping UI output or inventing values
  outside collector/domain authority;
- a dependent/lazy collector cannot answer `hasAny` without bounded enumeration,
  causing actionability or deadlock to depend on pagination;
- speculative dispatch cannot be isolated by Phase 01's clone primitive;
- output would need prose parsing, multiple JSON envelopes, or nested captured
  JSON for any test-family command;
- automatic Cloudline RNG cannot be expressed without a hidden player action,
  fixed roll table, fake subset sampling, or test-only random stream;
- a seed branch can be reached only by patching state or introducing a
  test-only setup profile;
- backend scenario materialization requires snapshot hydration rather than
  normal setup and accepted prefix replay;
- Cloudline's current tests disagree with `rule.md` and the proposed response
  is to preserve the test instead of correcting the implementation/proof; or
- the CLI-core package would need reducer, browser, React, dev-host, or
  presentation dependencies. Keep those concerns in their owning package.
