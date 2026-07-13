# Phase 03: Scheduler-Shape Pilots

Status: complete

Depends on: Phases 00-02

Primary repository: `dreamboard-sdk`

## Objective

Bring Lantern Market, Last Light, and Stormtrail into conformance with their
approved rules while proving that one engine-owned actionability model covers
three materially different scheduler shapes:

- a sealed simultaneous barrier;
- a solo turn followed by uninterrupted automatic procedures; and
- an ordinary turn graph that can enter either a multi-actor discard barrier
  or a targeted bilateral response.

This phase must prove the generic model. It must not add a game-authored
`decision`, `requiredActions`, `blockedBy`, or equivalent annotation to make
one of these examples pass.

## Authority And Stable Paths

The rule briefs below are the only gameplay and theme authority for this
phase. Existing reducers, scenarios, setup profiles, generated files, and
snapshots are characterization evidence only.

| Stable directory ID          | Display name   | Rules authority                                               | Implementation root                                    |
| ---------------------------- | -------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `simultaneous-card-drafting` | Lantern Market | `examples/reference-games/simultaneous-card-drafting/rule.md` | `examples/reference-games/simultaneous-card-drafting/` |
| `solo-countdown-puzzle`      | Last Light     | `examples/reference-games/solo-countdown-puzzle/rule.md`      | `examples/reference-games/solo-countdown-puzzle/`      |
| `hex-network-trading`        | Stormtrail     | `examples/reference-games/hex-network-trading/rule.md`        | `examples/reference-games/hex-network-trading/`        |

Keep the directory IDs, package names, manifest IDs, and release slugs stable.
Use the approved display names and vocabulary in UI, documentation, events,
and authored tests. Do not revive excluded legacy mechanics to preserve an old
fixture.

## Entry Criteria

- Phase 00 has recorded a current-behavior inventory and an acceptance-bullet
  ledger without treating either as normative.
- Phase 01's base-free scenario contract and legal replay runner are implemented
  and green on the coordinated integration branch; they are not independently
  merged or published.
- Phase 02's JSON-only `test inspect` and `test explore` commands, canonical
  command-step encoding, checkpoint addressing, and pagination contracts are
  implemented on that branch and proven by the Cloudline Survey pilot.
- The three rule briefs above remain approved and unchanged, or any amendment
  has been explicitly re-approved and recorded before implementation starts.
- The implementation branch contains no compatibility requirement for
  `defineBase`, checked-in base-state artifacts, state patching, or
  `dreamboard test generate`.

## Derived Actions And Obligation Contract

The runtime derives active/pending actors and causal continuation dependencies
from the active collector and settled flow graph. Game code declares legal
interactions and transition behavior; it does not restate the scheduler's
conclusion.

For every inspectable node:

- an interaction is visible descriptor metadata and may be unavailable;
- an action is an interaction whose authorization passes and whose complete
  dependent input domain has at least one legal assignment;
- explore returns concrete accepted commands for one selected perspective;
- `pendingActors` exposes unresolved actors whose response or commitment must
  resolve before an owned continuation can proceed, including simultaneous
  barriers, forced discards, and one targeted response; it is not an authored
  action list or a second vocabulary;
- `continuationWaiters` identifies actors whose owned progress is paused by
  another actor, including a committed simultaneous actor, trade offeror, or
  turn owner waiting for discards;
- `blockedBy` is emitted only when the scheduler can prove that one actor's
  continuation is causally waiting on another unresolved actor;
- no self-edge is emitted in `blockedBy`; an actor that still owes an action is
  represented by `activeActors` / `pendingActors` and, in its own perspective,
  `actions`, not by saying it blocks itself;
- absence of an available action does not, by itself, imply `blockedBy`; and
- automatic procedures settle without a fake actor, required player action,
  or `blockedBy` edge.

The pilot expectations are:

| Scheduler shape                        | Scheduler actors and selected-perspective actions                                                                                  | Continuation waiters and blockers                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Lantern Market after one commit        | Active and pending are exactly the uncommitted players. Each uncommitted player's own perspective has one or more actions.         | Every committed player is a waiter blocked by all remaining pending players until atomic reveal.    |
| Last Light `playerTurn`                | The sole human is active, pending is empty, and that player's perspective has actions.                                             | Waiters and blockers are empty.                                                                     |
| Last Light automatic weather/countdown | Active, pending, and continuation-waiter actor arrays are empty while procedures settle.                                           | No fake actor or blocker edge appears.                                                              |
| Stormtrail ordinary setup/roll/main    | The current actor is active and pending is empty. Its perspective has actions; a wrong-seat perspective has none.                  | Waiters and blockers are empty.                                                                     |
| Stormtrail discard barrier             | Active and pending are the unresolved players above seven supplies. Each unresolved player's own perspective has a discard action. | The turn owner is a waiter blocked by every other unresolved discard actor; never emit a self-edge. |
| Stormtrail pending trade               | Active and pending contain only the target; only the target perspective has `acceptTrade` or `rejectTrade` actions.                | The offeror is a waiter blocked by the target; the third player is absent from every set and edge.  |

If the current scheduler cannot derive one of these relationships from generic
collector/flow state, extend the engine-owned scheduler metadata and derivation
once. Do not add a field to any of the three games to identify a decision,
required action, continuation owner, or blocker.

## Scenario Authoring Rules

Every scenario added or retained in this phase must:

1. start through the game's ordinary setup with the supported player count and
   an authored safe-integer seed;
2. reach its subject by replaying canonical accepted command steps from setup;
3. use seat-based actor references in source and resolve runtime player IDs
   through the scenario runner;
4. assert exact reducer state, perspective-scoped projections, action
   discovery, scheduler diagnostics, events, and outcome where relevant;
5. remain replayable by both `dreamboard test` and the JSON inspect/explore
   runtime; and
6. contain no state patch, serialized snapshot input, test-only setup profile,
   fixed dice result, injected hand, injected inventory, injected weather
   order, or terminal base.

Use `test explore` to discover a seed or a legal command path for an uncommon
branch. A small, pure unit test may construct inputs for an isolated scoring,
topology, or resource-count algorithm, but it cannot replace an end-to-end
scenario where the rule brief requires executable gameplay proof.

Raw unknown interaction/manifest IDs and malformed values are shared SDK/wire
ingress conformance cases. Link them from the rule ledger; game scenarios use
typed wrong-actor, stale, blocked, or manifest-known ineligible values without
casts.

## Scenario Matrix

This matrix is organized by scheduler, action-domain, visibility, automatic
procedure, entropy, and outcome dimensions. Dice are only one entropy source;
the matrix is deliberately not a dice-case table.

Each row below names one scenario or a scenario **family**. A family that
varies player count, seed, or mutually exclusive outcome expands to one file
and one default-exported scenario per independent replay, using a descriptive
suffix. The phase ledger groups the files; no file exports an array or multiple
scenario definitions.

### Lantern Market

Create or rewrite scenarios under
`examples/reference-games/simultaneous-card-drafting/test/scenarios/`:

| Scenario source                          | Dimensions and required proof                                                                                                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`              | Normal seeded setup, six barriers in each of two rounds, fresh round-2 deal from the original deck, score/history preservation, all twelve picks per player, and terminal standings. This is the canonical multi-turn demo replay.                          |
| `supported-player-count-<n>.scenario.ts` | Two through five players, exact 60-card composition, deterministic deals from the same seed and seat order, six private cards per round, and hidden undealt cards.                                                                                          |
| `barrier-actionability.scenario.ts`      | Different commit orders, one submission per player, atomic reveal and one left rotation, committed-player `blockedBy`, uncommitted active/pending actors with actions only in their own perspective, no locked-card leak, and stale earlier-hand rejection. |
| `round-scoring.scenario.ts`              | Singles, multiple pairs, multiple triples, leftovers, round-1 clearing, public history, and score accumulation.                                                                                                                                             |
| `outcome-<branch>.scenario.ts`           | Separate sole-winner, tied-winner, and lower-place competition-rank-tie replays reached through legal complete play.                                                                                                                                        |
| `projection-privacy.scenario.ts`         | Owner-only hand identity before commit, sealed selection privacy during the barrier, simultaneous public reveal, and spectator-safe projections.                                                                                                            |

Implementation tasks:

- conform the deck recipe, single seeded shuffle, two deals, barrier lifecycle,
  scoring, clearing, history, and outcome to `rule.md`;
- make `drafting.submit` the sole player interaction and derive its concrete
  `cardId` domain from the current private hand;
- ensure barrier resolution is one atomic reducer transition with no
  seat-order reveal leak;
- expose commit status without selected-card identity;
- prove scheduler results before any commit, after each commit, after the final
  atomic reveal, and at game over; and
- derive opening, mid-round, round-transition, and terminal Workbench/UI
  checkpoints from `complete-game.scenario.ts` rather than authored state.

### Last Light

Create or rewrite scenarios under
`examples/reference-games/solo-countdown-puzzle/test/scenarios/`:

| Scenario source                           | Dimensions and required proof                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `complete-game.scenario.ts`               | Normal one-human seeded setup and a legal full path to `ALL_BEACONS_LIT`, showing energy changes, multiple beacon levels, weather history, and immediate win before later weather/countdown. This is the canonical multi-turn demo replay. |
| `complete-game-loss-<reason>.scenario.ts` | Separate complete normal seeded replays ending in `STORM_REACHED_LIGHTHOUSE` and `DAWN_ARRIVED`, with terminal precedence proved.                                                                                                          |
| `availability-<branch>.scenario.ts`       | Separate `charge`, `repairBeacon`, and `reinforce` boundaries; charge cap; resource costs; non-stacking reinforcement; legal beacon domain; and full/stale beacon rejection.                                                               |
| `weather-procedure-<branch>.scenario.ts`  | Separate seeded replays for Calm, Gale with/without reinforcement, and each of the three Squalls with/without reinforcement; together prove full effect ordering, reinforcement consumption/preservation, and exact event sequences.       |
| `determinism-and-actors.scenario.ts`      | Same seed plus commands gives the same hidden weather order, events, state, and outcome; no environment player ID, actor descriptor, player action, or `blockedBy` appears.                                                                |

Implementation tasks:

- replace legacy one-click behavior with the exact eight-card weather deck,
  eight-turn countdown, three two-level beacons, and the approved energy and
  reinforcement economy;
- implement weather and countdown as reducer-owned procedures that completely
  settle after each player command;
- enforce win, storm-loss, and dawn-loss precedence at their distinct check
  points;
- publish ordered, exactly-once procedure events without inventing an event
  actor; and
- derive initial, developing-puzzle, reinforcement-hit, and terminal
  Workbench/UI checkpoints from complete legal replays.

### Stormtrail

Create or rewrite scenarios under
`examples/reference-games/hex-network-trading/test/scenarios/`:

| Scenario source                  | Dimensions and required proof                                                                                                                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`      | Normal fixed-map setup, three legal starting pairs, repeated seeded turns, production, building/trading as useful, and immediate victory on a fourth camp with no post-victory command. This is the canonical multi-turn demo replay.                                       |
| `topology-and-setup.scenario.ts` | Exact seven-hex identity, 24 intersections, 30 edges, seat-order setup, camp occupancy, starting-trail adjacency, and starting supplies.                                                                                                                                    |
| `production.scenario.ts`         | Every resource terrain, multiple adjacent camps, 2/3/11/12 non-production, Bandits suppression, and deterministic 2d6 replay.                                                                                                                                               |
| `discard-barrier.scenario.ts`    | A 7 with no required discard and a 7 with multiple pending actors; totals 8 and 9; private exact-half discards; different response orders; active/pending actors, perspective-scoped `actions`, derived `blockedBy`, duplicate prevention, and transition to `moveBandits`. |
| `bandits.scenario.ts`            | Legal/illegal destination domains, no-victim omission, one/multiple victim domains without inventory leakage, and reproducible seeded steal visibility.                                                                                                                     |
| `network-and-costs.scenario.ts`  | Trail connectivity, interruption by an opponent camp, camp connectivity, occupied targets, piece exhaustion, insufficient resources, atomic payment, and immediate fourth-camp victory.                                                                                     |
| `depot-trades.scenario.ts`       | Valid and invalid 3:1 conversions and repeated legal trades during one main phase.                                                                                                                                                                                          |
| `bilateral-trade.scenario.ts`    | Offer validation, target-only accept/reject, offeror blocked by target, third-player ineligibility, rejection, acceptance, stale/unaffordable acceptance without mutation, atomic transfer, and return to the same offeror's `main`.                                        |
| `projection-privacy.scenario.ts` | Private inventory composition and discard types, participant-only stolen type, public supply counts, and public offer participants/terms.                                                                                                                                   |

Implementation tasks:

- replace the legacy board and excluded mechanics with the fixed approved map,
  one starting Camp-and-Trail pair per player, three resources, four-camp
  objective, and exact piece supplies;
- implement `rollDice` as a player command that consumes trusted seeded 2d6,
  then settle production or the seven-path scheduling automatically;
- derive discard obligations from authoritative inventory totals, and derive
  legal discard counts/domains without exposing private resource types;
- derive `moveBandits` destinations and optional/required victim inputs from
  topology, camps, and nonempty opponent inventories;
- mark Bandits victims and bilateral trade targets as player-valued input
  leaves so scenario/explore commands use `{ seat }` refs while production
  dispatch receives resolved runtime player IDs;
- implement only the approved build, Supply Depot, bilateral offer/response,
  and end-turn interactions;
- revalidate both inventories on acceptance and reject stale acceptance with
  no state change; and
- derive setup, production, discard-barrier, pending-trade, growing-network,
  and terminal Workbench/UI checkpoints from legal scenario prefixes.

## Obsolete Test/Profile Deletion And Fixture Readiness

Phase 01 may have already removed some global base infrastructure. This phase
must prove the following game-local paths are no longer read by test, dev,
Workbench, pack, or scenario discovery and mark them `deletion-ready` in the
ledger. Keep their tracked bytes until the coordinated post-consumer deletion
in Phase 07:

```text
examples/reference-games/simultaneous-card-drafting/test/bases/**
examples/reference-games/simultaneous-card-drafting/test/generated/**
examples/reference-games/solo-countdown-puzzle/test/generated/**
examples/reference-games/hex-network-trading/test/bases/**
examples/reference-games/hex-network-trading/test/generated/**
```

Delete or replace the legacy authored one-turn characterization scenarios that are
superseded by the matrix above. In particular:

- remove Lantern Market's `draft-one-pick.scenario.ts`,
  `five-player-draft.scenario.ts`, and `smoke-initial-turn.scenario.ts` once
  their still-valid assertions have moved;
- remove Last Light's legacy `initial`, `repair-beacon`, `reconnect`, and
  `terminal` scenario sources and its hand-rolled `test/helpers/runtime.ts`
  when the canonical runtime covers their valid concerns; and
- remove Stormtrail scenarios for charter cards, ports, relay rates, town
  upgrades, and old bank-trade vocabulary; remove references to the
  terminal-before-end-turn base and mark its bytes deletion-ready. These
  mechanics are deliberately excluded by `rule.md`.

Delete test-only setup profile entries, including Stormtrail's
`terminal-regression` and `charter-verification`. A game's implicit ordinary
setup is the scenario default. If `app/setup-profiles.ts` remains only to name
that default after the Phase 01 cut, collapse it into ordinary setup and delete
the file. Do not retain a profile that fixes a deck, dice, inventory, phase, or
terminal state for tests.

Reducer-state snapshots and checked-in projection snapshots cannot be
assertion authority. UI screenshots or Workbench fixtures may be generated as
derived visual evidence, but they must be reproducible from a scenario path
and must not be consumed as starting state.

## Rule Acceptance Coverage Ledger

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-03-rule-conformance-ledger.md`.
For every acceptance bullet in each of the three `rule.md` files, record:

| Game | Rule bullet opening text | Scenario or pure-test path | Exact assertion/checkpoint | Result |
| ---- | ------------------------ | -------------------------- | -------------------------- | ------ |

Use the bullet's existing order and opening text. Do not assign a new rule ID,
add `covers` metadata to scenarios, or create another gameplay authority. A
pure unit-test row is permitted only for a genuinely isolated algorithm; each
complete-game, visibility, scheduler, and transition obligation must point to
legal scenario replay.

## Tests And Verification

Focused package gates:

```sh
mise exec node@24 -- pnpm --dir examples/reference-games/simultaneous-card-drafting verify
mise exec node@24 -- pnpm --dir examples/reference-games/solo-countdown-puzzle verify
mise exec node@24 -- pnpm --dir examples/reference-games/hex-network-trading verify
```

Agent-authoring proof for each game's `complete-game.scenario.ts` uses the
exact packed public CLI installed in a disposable consumer. Set
`DREAMBOARD_CLI_BIN` to that absolute `node_modules/.bin/dreamboard`; do not
resolve a global binary or add the CLI to all nine game lockfiles:

```sh
"$DREAMBOARD_CLI_BIN" test inspect test/scenarios/complete-game.scenario.ts --perspective player:0
"$DREAMBOARD_CLI_BIN" test explore test/scenarios/complete-game.scenario.ts --perspective player:0
```

Run those commands from the corresponding game root, then repeat inspect for
every player seat and spectator and explore for every seat whose selected
perspective reports actions.
Assert that stdout is one valid JSON envelope, every returned concrete command
is accepted by replay, each perspective is independently projection-safe, and
the derived flow diagnostic contains the expected `activeActors`,
`pendingActors`, `continuationWaiters`, and `blockedBy`
relationships. Neither command uses `--json`, `--format`, or a human-output
mode.

Repository gates:

```sh
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm docs:check
```

The packed proof must run the same authored scenario sources against the
candidate tarball. It may not substitute generated base states or a private
scenario-author runtime.

## Receipts

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-03-receipt.md`
with:

- the SDK commit and candidate package digest;
- the three completed acceptance ledgers;
- seeds and command counts for every complete-game replay;
- before/after tracked byte and line counts for each game;
- representative inspect/explore JSON artifact digests for every scheduler
  shape;
- focused, packed, Workbench, and docs command results; and
- the deletion audit showing no base, state-patch, injected-randomness, or
  test-only profile authority remains.

Do not commit full inspect/explore transcripts or replay snapshots merely to
make the receipt self-contained. Record stable digests and focused excerpts.

## Exit Criteria

- Lantern Market completes two six-pick rounds for every supported player
  count and proves a sealed simultaneous barrier.
- Last Light completes seeded win, storm-loss, and dawn-loss games without a
  fake actor or player-authored automatic step.
- Stormtrail completes a normal seeded game and proves ordinary, discard
  barrier, and targeted-response scheduling.
- The generic runtime derives all actionability and `blockedBy`
  results with no game-authored decision or obligation metadata.
- Every acceptance bullet has executable evidence in the phase ledger.
- Every game has a normal-setup `test/scenarios/complete-game.scenario.ts` with
  opening, developing, and terminal demo checkpoints.
- Obsolete authored profiles and excluded-mechanic tests are deleted; base and
  generated trees are unused and marked deletion-ready for Phase 07.
- Focused, packed, Workbench, and documentation gates pass.

## STOP Conditions

Stop and report instead of weakening the plan if:

- an implementation or legacy test conflicts with `rule.md` and the conflict
  cannot be resolved without a rule amendment;
- `blockedBy` can only be made correct by adding an authored game-state field,
  action annotation, `playerTurn.decision`, or `requiredActions` concept;
- inspect and replay disagree about available commands, actor identity,
  dependent input domains, or the next scheduler node;
- a complete game can be reached only through a state patch, injected dice,
  injected deck order, or a terminal setup profile;
- a legal complete Stormtrail path cannot reach the fourth-camp objective on
  the approved compact map;
- private cards, resources, discards, or stolen supply types leak into the
  wrong labeled player/spectator projection or an unlabeled omniscient
  inspect, explore, Workbench, or receipt field;
- an automatic procedure stalls waiting for a fake player action; or
- packed-candidate behavior differs from source behavior.
