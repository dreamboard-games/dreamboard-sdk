# Phase 02: Authoritative `GameOutcome` Hard Cut

Status: SDK source-complete on 2026-06-18; internal monorepo migration pending.

Depends on Phases 00-01.

Primary repositories: `dreamboard-sdk` and the internal monorepo.

SDK source receipt:

- Reducer wire schema now exposes `GameOutcome` as the only `terminal`
  payload and generated reducer-contract artifacts are at protocol version
  `0.3.0`.
- SDK reducer runtime, trusted bundle normalization, ingress types, public
  exports, and characterization tests use `GameOutcome`; the public
  `TerminalOutcome` alias is removed.
- SDK UI replaces `GameEndDisplay` with `OutcomeDialog` and `StandingsTable`.
  The controlled components render reducer-owned rows without score sorting or
  winner inference.
- `examples/reference-games/multiplayer-ranking-and-ties/` implements Harbor
  Fair with unique winner, complete-set tie-break, coin tie-break, true tie,
  non-first tied rank, scoreless cancellation, and reconnect serialization
  scenarios.
- Harbor Fair has an executable Workbench scenario:
  `multiplayer-ranking-and-ties.draft-stall.desktop`.

SDK verification receipts:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract generate:check
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract test
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:catalog:generate
mise exec node@24 -- pnpm docs:generate
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:hard-cut:check
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --game multiplayer-ranking-and-ties
mise exec node@24 -- pnpm reference-games:test:packed
```

Latest Workbench receipt:

- `artifacts/ui/2026-06-18T13-25-47-904Z/receipt.json`
- `ui:test` passed across 20 scenario results, including
  `multiplayer-ranking-and-ties.draft-stall.desktop`.

Latest reference-game receipts:

- `reference-games:check` passed at `2026-06-18T13:30:33.161Z`.
- `reference-games:test:packed --game multiplayer-ranking-and-ties` passed for
  Harbor Fair outcome scenarios.
- `reference-games:test:packed` passed for all seven current reference games at
  `2026-06-18T13:28:53.207Z`.
- packed SDK tarball:
  `sha256:5b345d2c5cf6c4146b1fbd0dba1fd23edebbdad0e76f2fcfaad000aa9cbf4788`.

Hard-cut scans:

```bash
rg -n "\bTerminalOutcome\b|\bPlayerScore\b|winnerPlayerId|finalScores" packages/sdk packages/reducer-contract examples/reference-games/*/demo-workspace/app examples/reference-games/*/demo-workspace/ui examples/reference-games/*/src examples/reference-games/*/scenarios scripts/ui scripts/ui-fixtures fixtures/ui
rg -n "\bTerminalOutcome\b|\bPlayerScore\b|winnerPlayerId\?:|finalScores\?:|export type TerminalOutcome" packages/sdk/src packages/sdk/REFERENCE.md docs/reference/agent-api.md docs/reference/llms.txt packages/reducer-contract/generated packages/reducer-contract/schema examples/ui-scenarios/src/ui.mjs examples/reference-games/hex-network-trading/demo-workspace/app/phases/check-game-end.ts
```

Both scans returned no matches.

Remaining phase work:

- Land the internal monorepo contract, executor, authority, persistence,
  backend, API-client, and host migrations described below.
- Repin the internal monorepo to the exact SDK artifact used for real-host
  proof.
- Run the internal verification commands and real-host reconnect proof.
- `pnpm check` remains blocked by the repository's pre-existing
  `format:check` backlog outside this phase slice. The latest run reports 53
  formatting warnings after all changed files that overlapped the warning set
  were formatted.

Phase 00 brief jobs cited:

- `multiplayer-ranking-and-ties-01`: `rank tied players with score and
tie-break evidence`, `emit a scoreless cancellation outcome`.
- `roll-and-write-scorecard-01`: `total marked regions at game end`.
- `solo-countdown-puzzle-01`: `end in win or countdown loss`.
- `cooperative-threshold-01`: `resolve team win or loss`.
- `route-race-tiebreaker-01`: `break ties by cards remaining`.
- `asymmetric-objective-cards-01`: `score revealed objectives`, `show final
private-score evidence`.
- `drafting-scoring-breakdown-01`: `score several independent categories`,
  `rank tied players after deterministic tie-break`.

## Objective

Replace the current optional winner plus integer score map with one canonical
outcome that represents:

- ranked and tied results;
- games without numeric scores;
- per-player score breakdowns;
- deterministic tie-break evidence;
- collective wins/losses; and
- a stable reason for game termination.

The same payload must survive reducer execution, wire validation, authority
persistence, backend callback, reconnect, plugin projection, and end-game UI.

## Why This Is A Hard Cut

The current SDK type:

```ts
type TerminalOutcome = {
  winnerPlayerId?: string;
  finalScores?: Record<string, number>;
  reason: string;
};
```

cannot represent co-winners, ranked ties, no-score victory, elimination,
breakdowns, or tie-break evidence. The SDK UI separately infers a winner by
sorting `PlayerScore[]`, so reducer authority and presentation can disagree.

The internal executor, authority, outbox, backend callback, database, API
client, and host reducer all parse the old fields explicitly. An additive UI
model would therefore create two sources of truth.

This phase removes the old payload and migrates all consumers in one release
train.

## Canonical Contract

Add:

```ts
export type OutcomeResult = "win" | "draw" | "loss" | "eliminated";

export type OutcomeScoreComponent = {
  id: string;
  label: string;
  value: number;
};

export type OutcomeTieBreak = {
  id: string;
  label: string;
  value: number | string;
};

export type OutcomeStanding<PlayerId extends string = string> = {
  playerId: PlayerId;
  rank: number;
  result: OutcomeResult;
  score?: number;
  scoreBreakdown?: readonly OutcomeScoreComponent[];
  tieBreaks?: readonly OutcomeTieBreak[];
};

export type GameOutcome<PlayerId extends string = string> = {
  reason: {
    code: string;
    message?: string;
  };
  standings: readonly OutcomeStanding<PlayerId>[];
};
```

Keep the reducer result property named `terminal` because it indicates that the
accepted transition terminates the session:

```ts
export type ReducerAccept<State> = {
  type: "accept";
  state: State;
  instructions?: RuntimeInstructionForState<State>[];
  terminal?: GameOutcome<PlayerIdOfState<State>>;
};
```

Remove the public `TerminalOutcome` type. Do not retain an alias.

## Runtime Invariants

`endGame(state, outcome)` validates and normalizes:

1. Every configured player appears exactly once.
2. No unknown player ID appears.
3. `rank` is a positive integer.
4. Equal ranks are allowed; ordering is canonical by rank then session player
   order.
5. `score`, score-component values, and numeric tie-break values are finite.
6. Score-component and tie-break IDs are unique within a standing.
7. `reason.code` and labels are non-empty and bounded.
8. Payload depth, string lengths, row counts, and component counts obey reducer
   contract limits.
9. No `undefined`, `NaN`, `Infinity`, functions, or class instances cross the
   wire.

The runtime does not infer winners from score. The author explicitly declares
rank and result after applying game-specific tie-break rules.

Example tie:

```ts
return endGame(state, {
  reason: { code: "DECK_EXHAUSTED" },
  standings: [
    {
      playerId: "player-1",
      rank: 1,
      result: "draw",
      score: 21,
      tieBreaks: [{ id: "coins", label: "Coins", value: 3 }],
    },
    {
      playerId: "player-2",
      rank: 1,
      result: "draw",
      score: 21,
      tieBreaks: [{ id: "coins", label: "Coins", value: 3 }],
    },
  ],
});
```

Example cooperative win:

```ts
return endGame(state, {
  reason: {
    code: "ALL_BEACONS_LIT",
    message: "Every beacon was lit before the storm arrived.",
  },
  standings: playerOrder.map((playerId) => ({
    playerId,
    rank: 1,
    result: "win",
  })),
});
```

## Reducer Wire

Change the source schema, then regenerate:

- `packages/reducer-contract/schema/reducer-runtime.schema.json`;
- generated TypeScript wire and Zod output;
- SDK trusted/ingress bundle types;
- reducer conformance fixtures; and
- Kotlin engine contract/conformance in the internal monorepo.

Target wire:

```ts
export type ReduceResultAccept = {
  kind: "accept";
  state: ReducerSessionState;
  terminal?: GameOutcome;
  effects: Effect[];
  continuations: ContinuationMap;
};

export type DispatchResultAccept = {
  kind: "accept";
  state: ReducerSessionState;
  terminal?: GameOutcome;
  trace: DispatchTrace[];
};
```

Do not hand-edit generated files.

## SDK UI Hard Cut

Replace score-sorting props with controlled components that render authority.

Target public UI:

```tsx
<OutcomeDialog
  outcome={session.outcome}
  playerName={(playerId) => playersById[playerId].name}
  onReturnToLobby={onReturnToLobby}
/>
```

Add a reusable standings presentation:

```tsx
<StandingsTable
  rows={view.provisionalStandings}
  playerName={(playerId) => playersById[playerId].name}
  provisional
/>
```

`StandingsTable` is controlled presentation. It may render game-view preview
rows, but it never calculates rank, winner, or tie-break order.

Hard-cut changes:

- delete `PlayerScore`;
- replace `GameEndDisplay` or rename it to `OutcomeDialog`;
- remove `isWinner` and local score sorting;
- support multiple rank-1 rows and non-score outcomes;
- render breakdowns and tie-breaks accessibly; and
- avoid winner-only language when the result is a draw, collective win, or
  elimination.

All reference games migrate in this phase.

## Private Product Contract Migration

Update private product source contracts first:

- gameplay execution result schemas;
- gameplay/session API schemas;
- session-ended callback request; and
- public API contract if game-session results expose terminal data.

Regenerate:

- TypeScript clients and Zod schemas;
- Kotlin models and controller interfaces;
- API documentation; and
- package outputs.

Then update:

- executor validation and runner guards;
- engine conformance;
- local and remote executor schemas;
- repository normalization;
- terminal notification and callback handling;
- session persistence and row mapping;
- host runtime notification parsing;
- API-client consumers; and
- all focused tests and fixtures.

Every parser must be strict about the new shape. Do not accept both old and new
payloads after the migration PRs merge.

## Persistence Migration

The canonical JSON outcome is the storage source of truth.

Desired schema direction:

```sql
ALTER TABLE public.gameplay_terminal_outbox
  ADD COLUMN outcome_json JSONB;

UPDATE public.gameplay_terminal_outbox
SET outcome_json = /* deterministic backfill from legacy columns */;

ALTER TABLE public.gameplay_terminal_outbox
  ALTER COLUMN outcome_json SET NOT NULL;

ALTER TABLE public.gameplay_terminal_outbox
  DROP COLUMN winner_player_id,
  DROP COLUMN final_scores_json,
  DROP COLUMN reason;
```

Apply the same principle to product game-session result storage:

- add one `ended_outcome_json` field;
- backfill rows that must remain readable;
- update row mappers and API projections;
- remove old winner/final-score/reason columns in the same migration train; and
- do not dual-write after cutover.

Use `packages/database/schema/public.sql` as source of truth, generate the
pgschema diff, review it, hash it, and run development validation.

The backfill must be deterministic about information the legacy shape cannot
recover. Use `reason.code: "LEGACY_RESULT"`, preserve the old reason as
`reason.message`, preserve the old declared winner as authoritative, and do not
invent historical co-winners. If historical rows are disposable in the target
environment, document and approve that explicitly instead of silently skipping
the backfill.

## Anchor Reference Game

Create `examples/reference-games/multiplayer-ranking-and-ties/`:

Implement **Harbor Fair** from its authoritative
[`rule.md`](../../../examples/reference-games/multiplayer-ranking-and-ties/rule.md).
That file owns normal scoring, both tie-break levels, true ties, and the
scoreless cancellation branch.

- two to four players;
- deterministic compact shared-card play;
- at least three score components;
- one scenario with a unique winner;
- one true tie scenario;
- one scenario where equal raw scores are separated by tie-break evidence;
- one no-score early termination scenario;
- outcome UI at desktop and mobile width;
- reconnect after terminal commit.

The reducer scenario asserts the full `GameOutcome`, not only the winner.

```ts
expect(result.terminal).toEqual({
  reason: { code: "ROUND_LIMIT_REACHED" },
  standings: [
    {
      playerId: seat(0),
      rank: 1,
      result: "win",
      score: 18,
      scoreBreakdown: [
        { id: "routes", label: "Routes", value: 12 },
        { id: "bonuses", label: "Bonuses", value: 6 },
      ],
      tieBreaks: [{ id: "cards-left", label: "Cards left", value: 2 }],
    },
    // ...
  ],
});
```

## Delivery Order

1. Land SDK source-schema, runtime, UI, and reference-game changes on a release
   branch.
2. Publish an SDK local-registry snapshot.
3. Repin the internal monorepo with a receipt.
4. Land internal source-contract, engine, executor, authority, persistence,
   backend, API-client, and host changes.
5. Run real-host parity against the exact snapshot.
6. Publish the public SDK version.
7. Replace the internal snapshot pin with the exact public version.
8. Remove migration-only fixtures and any old-name references.

Do not publish an SDK version whose terminal payload cannot be consumed by the
current product host unless the release is explicitly marked incompatible and
the coordinated internal deployment is ready.

## Tests

SDK:

- schema validation and bounds;
- unknown/missing/duplicate players;
- tied ranks;
- scoreless outcomes;
- breakdown and tie-break ordering;
- wire encode/decode conformance;
- ingress/trusted bundle parity;
- `OutcomeDialog` visual and accessibility states;
- packed reference-game typecheck and runtime.

Internal:

- strict executor parser;
- Kotlin/JS contract conformance;
- authority commit and duplicate-delivery behavior;
- terminal outbox retry;
- database backfill;
- backend callback;
- session reload/reconnect;
- API-client parsing;
- host state reducer; and
- browser end-game rendering.

## Verification

SDK:

```bash
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract generate:check
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract test
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm check
```

Internal:

```bash
pnpm harness:contract
pnpm harness:engine
pnpm verify:embedded
pnpm verify:browser
pnpm verify:package
pnpm fin
pnpm verify:dev
```

Database changes additionally run:

```bash
pnpm --dir packages/database db:migrate:hash
pnpm --dir packages/database db:migrate:validate:dev
```

## Exit Criteria

- `GameOutcome` is the only terminal payload in source contracts.
- Old terminal fields and UI props are absent from source and generated output.
- Every player is represented exactly once in accepted outcomes.
- Ties, scoreless wins, collective results, breakdowns, and tie-breaks pass
  contract and UI tests.
- The multiplayer ranking example persists and reloads the exact canonical
  outcome.
- Real-host browser proof renders the same outcome after reconnect.
- The internal monorepo is pinned to the exact SDK artifact used for proof.

## Stop Conditions

Stop and revise if:

- product requirements require team entities as first-class participants in
  this release;
- historical outcome data cannot be deterministically backfilled;
- a downstream consumer still needs to infer winners from score;
- generated contract parity cannot be achieved across JS and Kotlin; or
- deployment ordering would expose incompatible SDK and host versions without
  a controlled release train.
