# Phase 04: Deterministic System Procedures And Game Events

Status: SDK event-contract, UI, canonical solo/automa examples, generated
catalog/docs, Workbench evidence, and packed consumer proof complete on
2026-06-18. Internal persistence/host proof remains pending.

Depends on Phases 00-03.

Primary repositories: `dreamboard-sdk` and the internal monorepo.

## Source Receipt: SDK Phase 04 Slice

Completed in `dreamboard-sdk` on 2026-06-18:

- Added bounded reducer `GameEvent`/`SystemActionEvent` types, the `gameEvent`
  helper, and options-object `accept`/`endGame` result APIs with
  `instructions` and `events`.
- Updated reducer-contract source schema, generated TypeScript/Zod output, and
  conformance fixtures so accepted reduce/dispatch results always materialize
  `events: []`.
- Threaded accepted reducer events through trusted and ingress bundle result
  shapes while preserving readonly instruction/trace contracts.
- Added strict event normalization tests covering bounded system-action events,
  malformed event rejection, terminal outcome plus events, and canonical outcome
  ranking.
- Added `recentEvents` to the plugin runtime contract, materialized gameplay
  frames, strict fixture frames, runtime snapshot types, and semantic projection
  digests.
- Added controlled `GameEventLog` and `SystemActionSummary` UI components,
  exported from the public components surface, with passive event presentation
  and no gameplay command affordances.
- Added the `solo-countdown-puzzle` and `automa-river-rival` canonical examples
  from `canonical-game-briefs.md`, including deterministic event replay,
  no-opponent/no-fake-seat checks, README/scenario coverage, generated fixtures,
  catalog entries, and generated reference docs.
- Recompiled portable UI fixtures so every strict protocol frame carries
  `recentEvents`; the required catalog now contains 16 scenarios and the
  reference-game check validates all nine canonical examples.
- Hardened docs and pack dry-run scripts so they build the SDK declaration/CSS
  artifact before reading package `dist` outputs in aggregate checks.

Verification run:

```sh
mise exec node@24 -- pnpm typecheck
mise exec node@24 -- pnpm --filter @dreamboard-games/reducer-contract test
mise exec node@24 -- pnpm --filter @dreamboard-games/sdk exec bun test src/testing/ui-fixture/ui-fixture.test.ts src/reducer/bundle/trusted/phase-04-characterization.golden.test.ts
mise exec node@24 -- pnpm docs:generate
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:catalog:check
mise exec node@24 -- pnpm ui:runtime:test
mise exec node@24 -- pnpm ui:coverage:check
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm ui:hard-cut:check
mise exec node@24 -- pnpm ui:test
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm pack:dry-run
mise exec node@24 -- pnpm check
```

Latest receipts:

- Full scenario replay: `artifacts/ui/2026-06-18T14-15-20-742Z/receipt.json`.
- Aggregate required replay: `artifacts/ui/2026-06-18T14-24-07-482Z/receipt.json`.
- Story baseline: `artifacts/ui-stories/2026-06-18T14-23-22-655Z/receipt.json`.
- Visual baseline: `artifacts/ui-visual/2026-06-18T14-23-36-031Z/receipt.json`.
- `reference-games:test:packed --required` SDK tarball:
  `sha256:f747bd546abb6a922d95476b8aefd7215ac16f1ee444989ff8c5041df0fe1a83`.

Remaining Phase 04 work:

- Extend the internal executor/authority/persistence/host stack so committed
  events survive duplicate delivery, persistence, reconnect, plugin projection,
  and real-host gameplay proof.
- Migrate internal consumers to the options-object reducer result shape and
  remove any remaining internal positional instruction-result compatibility.

Phase 00 brief jobs cited:

- `solo-countdown-puzzle-01`: `advance countdown after each player action`,
  `resolve deterministic environment procedure`, `explain automatic procedure
events`.
- `automa-river-rival-01`: `advance deterministic rival after human action`,
  `record rival action in inspectable event log`, `score human and rival state
without fake seats`.
- `cooperative-threshold-01`: `advance dusk countdown`.
- `dice-worker-scheduler-01`: `resolve cleanup after all dice placed`.

## Objective

Represent solo/automa behavior as deterministic reducer-owned procedures that
emit inspectable game events, without creating fake human seats or a general bot
participant model.

## User Outcome

A coding agent can implement both:

- a solo puzzle where the environment advances deterministically; and
- an automa rival whose deck, track, and actions are ordinary game state.

For both patterns:

- automated steps are reducer-owned;
- tests and UI explain what happened;
- replay with the same seed produces the same event sequence;
- reconnect restores recent events; and
- actor authorization refers only to real human players.

## Design Decision

Use existing auto phases and reducer state for automated behavior.

Do not add:

- `actorKind: "automa"`;
- non-human `PlayerId`;
- bot session actors;
- bot controller assignments;
- model-generated decisions; or
- a generic search/planning engine.

An automa deck, threat track, neutral opponent, or procedure state is ordinary
game state. A system action is an output event, not an interaction submitted by
a fictional user.

## Reducer Result API Hard Cut

Replace the positional instruction argument with an options object so accepted
results can carry typed events without another overload.

```ts
export type GameEventDetail = {
  label: string;
  value: string | number | boolean;
};

export type SystemActionEvent = {
  kind: "systemAction";
  procedureId: string;
  title: string;
  summary?: string;
  details?: readonly GameEventDetail[];
};

export type GameEvent = SystemActionEvent;

export type ReducerAcceptOptions<State> = {
  instructions?: readonly RuntimeInstructionForState<State>[];
  events?: readonly GameEvent[];
};

accept(
  state: State,
  options?: ReducerAcceptOptions<State>,
): ReducerAccept<State>;

endGame(
  state: State,
  outcome: GameOutcome<PlayerIdOfState<State>>,
  options?: ReducerAcceptOptions<State>,
): ReducerAccept<State>;
```

Remove `accept(state, instructions)` and `endGame(state, outcome,
instructions)` after all SDK reference games migrate. Do not retain a
long-lived overload.

## Authoring Example

```ts
const riverAdvanceAuthoring = authoring.phase("riverAdvance");

export const riverAdvance = riverAdvanceAuthoring.define({
  kind: "auto",
  name: "River advance",
  guidance: {
    summary: "Resolve the river before the next player action.",
  },
  enter: ({ state, edit, random, accept, fx }) => {
    const tx = edit(state);
    const [discardedId, ...remainingRiver] = state.publicState.river;
    const [revealedId] = random.subset({
      from: state.hiddenState.deck,
      count: 1,
    });
    tx.patchPublicState({
      river: [...remainingRiver, revealedId],
    });
    tx.patchHiddenState({
      deck: state.hiddenState.deck.filter((cardId) => cardId !== revealedId),
    });

    return accept(tx.state, {
      instructions: [fx.transition("playerTurn")],
      events: [
        gameEvent.systemAction({
          procedureId: "river-advance",
          title: "The river advanced",
          summary: "The oldest card was discarded and a new card was revealed.",
          details: [
            { label: "Discarded", value: cardNameById[discardedId] },
            { label: "Revealed", value: cardNameById[revealedId] },
          ],
        }),
      ],
    });
  },
});
```

The helper validates bounds and returns plain canonical JSON.

## Event Contract

Events are:

- deterministic reducer output;
- public/player-safe;
- ordered within the accepted transition;
- immutable after commit;
- included in scenario and dispatch diagnostics;
- persisted with the gameplay commit; and
- projected to UI as a bounded recent list.

Events are not:

- analytics events;
- host notifications;
- arbitrary logs;
- hidden-state transport;
- a replacement for game state; or
- commands that the host executes.

### Bounds

Enforce conservative limits in the reducer contract:

- at most 32 events per accepted dispatch;
- at most 16 details per event;
- stable non-empty `procedureId`;
- bounded title, summary, label, and string values;
- finite numeric values;
- no nested arbitrary JSON;
- no timestamps generated by game code; and
- no secrets or hidden card identities not already safe for the projected
  player.

If a game needs private event copy, it must project that through the player
view in a later design. Do not add event-level ACLs in this phase.

## Wire And Engine Changes

Update the reducer contract source:

```ts
export type ReduceResultAccept = {
  kind: "accept";
  state: ReducerSessionState;
  terminal?: GameOutcome;
  effects: Effect[];
  continuations: ContinuationMap;
  events: GameEvent[];
};

export type DispatchResultAccept = {
  kind: "accept";
  state: ReducerSessionState;
  terminal?: GameOutcome;
  trace: DispatchTrace[];
  events: GameEvent[];
};
```

Always materialize `events: []` on the wire. This avoids three states
(`undefined`, empty, populated) and keeps JS/Kotlin conformance simple.

Update:

- reducer schema and generated JS/Zod;
- trusted result helpers;
- lifecycle and instruction runners;
- ingress bundle;
- dispatch result and diagnostics;
- reducer runtime log/trace fixtures as needed;
- Kotlin engine contract and conformance; and
- executor operation result.

Events must not be replayed as effects. Re-running the deterministic reducer
produces them; committed storage preserves the historical output for reconnect
and audit.

## Internal Authority And Persistence

Extend the source gameplay-executor contract with `events`.

Authority behavior:

1. Strictly validate event bounds.
2. Persist events atomically with the accepted gameplay commit.
3. Return the same committed events for duplicate `clientActionId`.
4. Include recent events in the player-safe plugin/gameplay projection.
5. Restore them on reconnect without re-executing the reducer.

Desired schema:

```sql
ALTER TABLE public.gameplay_commits
  ADD COLUMN events_json JSONB NOT NULL DEFAULT '[]'::jsonb;
```

`events_json` is part of the commit record and action fingerprint result. It is
not written to `game_messages` as host chrome.

Project a bounded list:

```ts
type ProjectedGameEvent = GameEvent & {
  version: number;
  index: number;
};

type PluginState = {
  // existing fields
  recentEvents: readonly ProjectedGameEvent[];
};
```

`version + index` is the stable event key. Authors do not mint event IDs.

Expected internal touchpoints:

- gameplay-executor OpenAPI source and generated clients;
- `apps/gameplay-executor` result validation and runners;
- `packages/engine-core` contract;
- gameplay authority executor schemas;
- gameplay commit repository and database types;
- authority duplicate/stale/recovery tests;
- player projection/notifier path;
- `packages/ui-host-runtime` parsing and selectors; and
- browser reconnect fixtures.

## UI Components

Add controlled presentation:

```tsx
<GameEventLog events={recentEvents} empty="No automated actions yet." />
```

```tsx
<SystemActionSummary event={event} />
```

Requirements:

- chronological order;
- clear system/procedure visual treatment without pretending to be a player;
- accessible live announcement for a newly committed event;
- no repeated announcement on reconnect;
- bounded/collapsible history on mobile;
- reduced-motion support; and
- deterministic rendering for Workbench screenshots.

The UI does not trigger, acknowledge, or retry automated procedures.

## Canonical Examples

Create two separate original games.

### Solo Countdown Puzzle

```text
examples/reference-games/solo-countdown-puzzle/
```

Implement **Last Light** from
[Canonical Game Briefs](canonical-game-briefs.md#solo-countdown-puzzle-last-light).
That brief is the rules authority for player actions, weather resolution,
countdown ordering, terminal checks, and required event branches.

This game demonstrates:

- exactly one real player;
- deterministic environment or hazard procedures;
- at least two auto phases;
- a visible countdown or pressure track;
- seeded reveal behavior;
- scoreless success and failure outcomes;
- at least three distinct system-action events;
- recent event history on mobile;
- reconnect after an automated transition; and
- identical state, events, and outcome from the same seed.

There is no opponent entity. The example teaches how a one-player game uses
ordinary state plus auto phases.

### Automa River Rival

```text
examples/reference-games/automa-river-rival/
```

Implement **River Guild** from
[Canonical Game Briefs](canonical-game-briefs.md#automa-river-rival-river-guild).
That brief is the rules authority for human turns, rival instructions,
fallback selection, cooperative outcomes, and required event branches.

This game demonstrates:

- one or two real human players;
- a deterministic rival deck and progress track in ordinary game state;
- rival actions that claim or alter public opportunities;
- no automa `PlayerId`, seat, actor, hand, or authentication identity;
- at least three distinct rival action events;
- deterministic tie and victory resolution through `GameOutcome`;
- recent rival actions on mobile;
- duplicate-action and reconnect proof; and
- identical rival decisions and outcome from the same seed.

The automa can have authored state and presentation labels. It cannot be
modeled as a session participant.

Required scenario assertion:

```ts
expect(ctx.diagnostics.lastDispatch?.events).toEqual([
  {
    kind: "systemAction",
    procedureId: "river-advance",
    title: "The river advanced",
    summary: "The oldest card was discarded and a new card was revealed.",
    details: [
      { label: "Discarded", value: "Ford" },
      { label: "Revealed", value: "Storm" },
    ],
  },
]);
```

Run the scenario twice from the same base/seed and compare state, outcome,
dispatch trace, and events.

## Migration Sequence

1. Add event types and options-object result API in SDK source.
2. Migrate all SDK examples/tests from positional instructions.
3. Update reducer wire and Kotlin conformance.
4. Build the solo and automa canonical examples and Workbench fixtures.
5. Publish a local SDK snapshot.
6. Repin internal and update executor/authority/persistence/host.
7. Run duplicate-delivery, reconnect, and parity tests.
8. Delete positional overloads and old fixture shapes.
9. Close with packed and real-host proof.

## Tests

SDK:

- event bounds and canonical JSON;
- empty event materialization;
- auto-phase event ordering;
- random seed determinism;
- instruction plus event propagation;
- terminal outcome plus events in one accept;
- scenario diagnostics;
- controlled UI and accessibility;
- fixture digest stability.

Internal:

- strict parser rejects malformed events;
- commit atomicity;
- duplicate action returns identical events;
- stale action creates no event;
- reconnect restores committed events;
- bounded recent projection;
- no duplicate live announcement;
- database migration and row mapping;
- executor/authority/Kotlin contract parity.

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

## Exit Criteria

- Automated procedures use auto phases and ordinary game state.
- No non-human player/session actor type exists.
- Accepted reducer results carry bounded `GameEvent[]`.
- Events survive executor, authority commit, duplicate delivery, persistence,
  reconnect, plugin projection, and UI.
- The solo example replays identical environment events and outcome from the
  same seed.
- The automa example replays identical rival actions and outcome from the same
  seed without a fake player.
- Positional accept/end-game instruction arguments are removed.
- Packed consumer and real-host parity pass against the same SDK artifact.

## Stop Conditions

Stop and revise if:

- a target game truly requires an independent strategic agent with hidden
  knowledge and choices rather than a deterministic procedure;
- events require private per-seat payloads;
- event persistence cannot be atomic with gameplay commits;
- the host would need to execute event commands; or
- event output becomes an unbounded arbitrary logging API.
