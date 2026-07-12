# Phase 05: Remaining Adapted-Game Conformance

Status: proposed

Depends on: Phases 00-04

Primary repository: `dreamboard-sdk`

## Objective

Bring Hearts, Sketchbook, and Mosaic Workshop into full conformance with their
approved compact teaching briefs. These are the remaining recognisable
adaptations and deliberately exercise substantially different authoring jobs:

- trick-taking with a private hand, simultaneous sealed pass, and contextual
  card legality;
- multi-turn deck building with private zones, seeded reshuffles, nested
  follow-up inputs, and supply-triggered ending; and
- deterministic worker placement with shared occupancy, dependent atomic
  inputs, multi-season cleanup, spatial crafting, and adjacency scoring.

The goal is not compatibility with the current implementation. The goal is a
small, complete, teachable implementation of each approved brief using the one
agent-optimized scenario path established by earlier phases.

## Authority And Stable Paths

| Stable directory ID        | Display name    | Rules authority                                             | Implementation root                                  |
| -------------------------- | --------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `hearts`                   | Hearts          | `examples/reference-games/hearts/rule.md`                   | `examples/reference-games/hearts/`                   |
| `deck-building-market`     | Sketchbook      | `examples/reference-games/deck-building-market/rule.md`     | `examples/reference-games/deck-building-market/`     |
| `worker-placement-tableau` | Mosaic Workshop | `examples/reference-games/worker-placement-tableau/rule.md` | `examples/reference-games/worker-placement-tableau/` |

Keep these directory IDs, package names, manifest IDs, and release slugs.
Hearts retains its established name. Sketchbook and Mosaic Workshop use the
approved rethemes in all player-facing copy and assets. Former names and
excluded commercial mechanics are not compatibility requirements.

## Entry Criteria

- The base-free legal scenario contract and JSON inspect/explore authoring
  workflow are stable from Phases 01-02.
- Phase 03 has proven simultaneous barriers, automatic procedures,
  actor-dependent actionability, and derived `blockedBy` without game-authored
  decision metadata.
- Phase 04 has proven canonical outcomes, competition ranks, tied winners, and
  seeded automatic card procedures.
- Phase 00's inventory identifies all old bases, profiles, generated state,
  excluded mechanics, and hand-rolled test adapters for these games.
- The three rule briefs remain the sole approved gameplay and theme authority.

## Authoring And Proof Constraints

Every scenario in this phase starts from ordinary setup and uses a deterministic
safe-integer seed. It reaches the subject by replaying legal canonical command
steps. Mosaic Workshop has no gameplay entropy; give its scenarios a stable
seed for uniform replay identity and assert that the game consumes no random
result.

Do not use:

- `defineBase`, `from`, `extends`, `patchState`, or serialized starting state;
- fixed hands, deck/discard contents, market piles, worker placement, resources,
  season, score, or terminal outcome injected by a test profile;
- checked-in reducer snapshots as assertion authority;
- UI-only action availability or rejection-driven discovery; or
- game-authored `decision`, `requiredActions`, or `blockedBy` fields.

Use inspect/explore and deterministic seed search to find legal paths. Pure
unit tests may construct isolated trick comparison, scoring, ranking,
connectivity, or adjacency inputs, but complete arcs, hidden-information
boundaries, action discovery, zone movement, and transition ordering require
scenario replay.

## Scenario Matrix

The matrix covers simultaneous and sequential scheduling, contextual action
domains, private/public information, seeded and entropy-free setup, nested
input resolution, shared-space blocking, automatic cleanup, spatial scoring,
and multiple outcome forms. It is intentionally broader than dice or any one
game family.

A row may name a scenario family. Every distinct seed-dependent branch or
mutually exclusive terminal result is one file with one default export and a
descriptive suffix; the ledger groups the family. No module exports multiple
scenario definitions.

### Hearts

Create or rewrite scenarios under
`examples/reference-games/hearts/test/scenarios/`:

| Scenario source                            | Dimensions and required proof                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`                | Normal seeded 52-card deal, four sealed left passes, all 13 four-card tricks, trick-winner leadership, hearts breaking, automatic scoring, and terminal outcome. This is the canonical full-hand demo replay. |
| `setup-and-pass.scenario.ts`               | 52 unique cards; 13 per private hand; exactly three distinct original-hand cards per player; commit privacy/actionability/derived barrier blocking; atomic left rotation; 2-of-Clubs holder activation.       |
| `card-legality-<branch>.scenario.ts`       | Separate first-lead, follow-suit, first-trick penalty/all-penalty exception, off-suit, hearts-not-broken/all-hearts exception paths, exact eligible `cardId` domains, and stale illegal rejection.            |
| `trick-resolution.scenario.ts`             | Lead-suit-only comparison, Ace high, four-card atomic resolution, captured penalties, hearts breaking, winner becomes next leader, and final-trick transition to scoring.                                     |
| `scoring-and-outcome-<branch>.scenario.ts` | Separate ordinary-penalty, shoot-the-moon, sole-winner, tied-lowest, and lower-place-rank replays with exact win/draw/loss labels.                                                                            |
| `projection-privacy.scenario.ts`           | Owner-only hand, opponent/spectator hand counts, sealed pass identity privacy, received-card visibility only to recipient, public trick/history/counts, and hidden deck/random source.                        |

Implementation tasks:

- build exactly one standard 52-card deck, seed-shuffle once, and deal all
  cards in seat order;
- implement only `passing.submit` and `playing.playCard` as player
  interactions;
- reuse the generic simultaneous-barrier derivation from Phase 03 for pass
  actionability and causal waits;
- derive the exact legal hand-card domain in reducer code and revalidate it on
  submission;
- resolve each trick, captured penalties, next leader, and hearts-broken state
  atomically;
- score exactly one hand, including shoot-the-moon replacement scoring, then
  publish ascending competition ranks; and
- derive deal, partially committed pass, early trick, mid-hand, final trick,
  and terminal Workbench/UI checkpoints from the complete replay.

### Sketchbook

Create or rewrite scenarios under
`examples/reference-games/deck-building-market/test/scenarios/`:

| Scenario source                           | Dimensions and required proof                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`               | Normal two-player seeded setup, multiple alternating turns, acquisitions, an acquired card appearing in a later hand after deterministic reshuffle, supply-triggered end check, complete owned-card scoring, and terminal outcome. This is the canonical growing-deck demo replay. |
| `setup-and-visibility.scenario.ts`        | Exact two ten-card starter decks, private five-card opening hands, independent seeded shuffles, exact supply table, public pile counts/zones, owner-only hand identity, public discard identity, and hidden deck order.                                                            |
| `turn-ordering.scenario.ts`               | Action step, buy step, cleanup, five-card draw, end-condition check, and opponent rotation in exact order; no return to action after buy starts; legal early ends.                                                                                                                 |
| `technique-<name-or-branch>.scenario.ts`  | Separate Brainstorm, Studio, Gallery, Eraser, and Studio Visit paths; action spend/grants; chaining; Eraser 0-4 distinct remaining-hand domain; Studio Visit nonempty cost-at-most-4 domain.                                                                                       |
| `zone-and-reshuffle.scenario.ts`          | Purchases/gains enter discard; cleanup movement; draw across exhaustion; discard-only reshuffle; every owned card exists exactly once; hand/in-play never enter a mid-turn reshuffle.                                                                                              |
| `buying-and-actionability.scenario.ts`    | Individual Inspiration plays, repeatable `playInspiration`, buys and affordability, depleted piles, stale card/pile rejection, pending follow-up exclusivity, and no second bulk-play gameplay interaction.                                                                        |
| `ending-and-outcome-<branch>.scenario.ts` | Separate Masterpiece-exhaustion, three-empty-pile, simultaneous-ending, sole-winner, and tied-score-draw paths, all checked only at cleanup end.                                                                                                                                   |

Implementation tasks:

- replace legacy card names and catalogue with the exact approved starting
  decks, public supply counts, values, and five Techniques;
- represent each physical card once across hand, deck, discard, in-play,
  supply, and trash zones;
- implement the action/buy/cleanup flow and the draw/reshuffle procedure in the
  approved precedence order;
- make Eraser and Studio Visit same-actor pending resolutions where only the
  required resolver interaction is available; do not model this as a
  cross-player `blockedBy` relation;
- expose dependent card domains through action discovery before submission and
  revalidate ownership, pile state, cost, and resources on commit;
- check supply ending only after cleanup and the replacement hand draw; and
- derive opening hand, first purchase, acquired-card recycle, technique chain,
  depleted supply, and terminal Workbench/UI checkpoints from legal prefixes.

### Mosaic Workshop

Create or rewrite scenarios under
`examples/reference-games/worker-placement-tableau/test/scenarios/`:

| Scenario source                            | Dimensions and required proof                                                                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`                | Normal entropy-free setup and a legal four-season game through cleanup to a unique winner, with visible resource growth, blocked spaces, crafted tableau, first-player alternation, scoring, and outcome. This is the canonical multi-season demo replay. |
| `complete-game-draw.scenario.ts`           | A separate legal four-season normal-setup replay ending in an exact draw.                                                                                                                                                                                 |
| `worker-occupancy.scenario.ts`             | Ordinary on empty; master sharing exactly one ordinary; ordinary-on-occupied, master-on-master, and third-worker rejection; both legal placements resolve the space once.                                                                                 |
| `turn-and-cleanup.scenario.ts`             | Permanent pass, finished-player skip, other player continuing alone, automatic cleanup, all workers returned, pass clear, season advance, and first-player alternation through all four seasons.                                                          |
| `action-spaces.scenario.ts`                | Timber, stone, patron, valid one/two-resource exchanges, and atomic Mosaic Bench craft; unaffordable, unequal, empty, overlapping, and no-op exchanges rejected.                                                                                          |
| `crafting-and-domains.scenario.ts`         | All three items, exact costs, occupied cell rejection, Joined Mosaic neighbor rule, orthogonal/diagonal distinction, and discovery of only legal worker/space/item/cell combinations.                                                                     |
| `scoring-and-outcome-<branch>.scenario.ts` | Printed Prestige, each unique different-type orthogonal Harmony edge once, same-type/diagonal/empty/leftover-resource non-scoring, ranks, unique win, and draw, split where terminal paths differ.                                                        |

Implementation tasks:

- delete the legacy variable spaces, cards, hands, order/contracts, wake-up
  track, six-season flow, and old scoring model;
- implement the fixed five-space action board, two ordinary workers and one
  master per player, public resources, fixed 2x3 tableaux, and exactly four
  seasons;
- make `placeWorker` one atomic interaction whose dependent input domain
  reflects worker occupancy plus Exchange House or Mosaic Bench inputs;
- implement `passPlacement` and automatic skipping/cleanup without a fake
  actor or player cleanup command;
- alternate first player after each of the first three cleanups and score only
  after season 4 cleanup;
- calculate printed and unique-edge Harmony Prestige authoritatively; and
- derive opening workshop, crowded-space/master-share, growing tableau,
  season transition, and terminal Workbench/UI checkpoints from complete
  replay.

## Complete-Game Demo Standard

Each `complete-game.scenario.ts` is a real normal-setup game, not a short
mechanic exercise with a terminal fixture. Consumers must identify structural
`setup` / `given:<n>` / `when:<n>` checkpoints that demonstrate development
over time:

| Game            | Minimum reusable checkpoints                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Hearts          | dealt hand, sealed pass in progress, first completed trick, mid-hand, final outcome                           |
| Sketchbook      | opening hand/supply, first purchase, later draw of acquired card, mid-game deck cycle, supply ending, outcome |
| Mosaic Workshop | initial workshops, shared-space contention, first crafted item, season transition, developed mosaic, outcome  |

Workbench and product-demo consumers compile those checkpoints from the same
canonical scenario. They do not keep editable demo states, generated base
modules, or a second inspect/observe authoring mode. Friendly labels live only
in the UI/demo consumer mapping to `{ scenarioPath, at }`; they are not fields
in the behavior scenario.

## Obsolete Test/Profile Deletion And Fixture Readiness

Make the base and generated-state trees below unused by test, dev, Workbench,
pack, and scenario discovery, and mark them `deletion-ready`. Phase 07 deletes
them only after every downstream consumer has cut over:

```text
examples/reference-games/hearts/test/bases/**
examples/reference-games/hearts/test/generated/**
examples/reference-games/deck-building-market/test/bases/**
examples/reference-games/deck-building-market/test/generated/**
examples/reference-games/worker-placement-tableau/test/bases/**
examples/reference-games/worker-placement-tableau/test/generated/**
```

Delete or replace legacy scenario sources after moving any still-valid generic
assertion into the new matrix:

- Hearts' smoke-only initial-hand/initial-turn scenarios and wave-2 smoke test;
- Sketchbook's old Treasure/VP/Sketchpad terminology, browser-ready bases,
  terminal-before-end-turn fixtures, and any scenario that reaches supply
  ending by the `empty-masterpiece-regression` profile; and
- Mosaic Workshop's card-play, order, variable-space, wake-up, six-season,
  coin-conversion, old tiebreak, and legacy Artisans Guild Playwright scenarios
  are deleted; its old screenshots are unlinked and marked deletion-ready for
  Phase 07.

Delete test-only setup profile entries, specifically Sketchbook's
`empty-masterpiece-regression` and Mosaic Workshop's `test-fixed-spaces` and
`test-end-game`. Delete any whole `app/setup-profiles.ts` file that remains only
to name ordinary setup after Phase 01. No profile may prearrange a hand, deck,
supply, worker, resource, tableau, season, score, or outcome.

Remove `test:scenarios:generate` and every remaining invocation or instruction
for `dreamboard test generate`. Update each package's test glob to execute the
canonical scenario runner over the new sources. Generated UI/visual artifacts
may remain only outside authored source authority and must be reproducible from
scenario checkpoints.

## Rule Acceptance Coverage Ledger

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-05-rule-conformance-ledger.md`.
Map every acceptance bullet from the three approved briefs to a scenario or
permitted pure unit test, the exact assertion/checkpoint, and its result.

Reference each bullet by its existing order and opening words. Do not add rule
IDs, `covers` metadata, scenario annotations, or a generated intermediate
specification. If a bullet needs multiple scenarios, keep one ledger row with
multiple proof links rather than splitting it into invented sub-rules.

## Tests And Verification

Focused package gates:

```sh
mise exec node@24 -- pnpm --dir examples/reference-games/hearts verify
mise exec node@24 -- pnpm --dir examples/reference-games/deck-building-market verify
mise exec node@24 -- pnpm --dir examples/reference-games/worker-placement-tableau verify
```

From each package root, inspect and explore
`test/scenarios/complete-game.scenario.ts` using Phase 03's exact packed
`DREAMBOARD_CLI_BIN`. Run each player/spectator perspective separately.
Validate that stdout is exactly one JSON envelope, every advertised concrete
command is replay-accepted, hidden information is filtered for the selected
viewer, and multiple structural checkpoints can be materialized without
checked-in state.

Repository gates:

```sh
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm ui:test:runtime-visual
mise exec node@24 -- pnpm docs:check
```

Run every complete-game scenario twice from clean setup and compare normalized
replay digests. For Hearts and Sketchbook, also compare every viewer projection
at privacy-sensitive checkpoints. For Mosaic Workshop, assert no entropy is
consumed despite the stable scenario seed.

## Receipts

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-05-receipt.md`
with:

- SDK commit and packed candidate digest;
- completed acceptance-ledger links for all three games;
- complete-game seeds, player counts, command counts, structural checkpoint
  tuples and consumer-owned labels,
  terminal reasons/results, and normalized replay digests;
- privacy evidence for Hearts and Sketchbook;
- dependent-domain evidence for Hearts card legality, Sketchbook pending
  Technique inputs, and Mosaic Workshop atomic placement inputs;
- opening/mid-game/terminal `{ scenarioPath, at }` tuples plus consumer-owned
  Workbench labels;
- focused, packed, Workbench, visual, and docs gate results;
- before/after tracked byte and line counts by game; and
- a deletion audit for bases, generated state, test-only profiles, excluded
  mechanics, and retired `test generate` scripts.

Record digests and focused evidence, not large state dumps, generated TypeScript
modules, projection snapshots, or image binaries.

## Exit Criteria

- Hearts completes a full seeded pass and 13-trick hand with exact legality,
  privacy, scoring, moon, ranking, and outcome proof.
- Sketchbook completes a multi-turn seeded game that cycles an acquired card
  through discard and reshuffle to a later hand, then ends through an approved
  supply condition.
- Mosaic Workshop completes legal four-season win and draw games with exact
  occupancy, passing, cleanup, dependent inputs, crafting, adjacency scoring,
  and outcome proof.
- Each game has a normal-setup `test/scenarios/complete-game.scenario.ts` with
  multiple product-demo checkpoints beyond one turn.
- Every approved acceptance bullet is linked to executable proof without new
  rule metadata.
- No base or state snapshot is execution authority; their trees are
  deletion-ready for Phase 07. No test-only profile, excluded legacy mechanic,
  or `dreamboard test generate` command path remains.
- Source, packed-candidate, Workbench, visual, and docs gates pass.

## STOP Conditions

Stop and report instead of preserving a broken local maximum if:

- an existing reducer, scenario, fixture, screenshot, or test contradicts the
  approved brief and the conflict cannot be removed without a rule amendment;
- a full legal game requires a patched hand, supply, worker/resource state,
  fixed random result, or terminal profile;
- action discovery cannot enumerate Hearts' eligible cards, Sketchbook's
  pending card domains, or Mosaic Workshop's dependent atomic inputs without
  relying on rejection as normal discovery;
- a hidden hand, sealed pass, draw-deck order, or random source leaks into the
  wrong labeled player/spectator projection or an unlabeled omniscient
  inspect, explore, Workbench, or receipt field;
- the generic simultaneous barrier cannot support Hearts without new
  game-authored decision/obligation metadata;
- Sketchbook cannot preserve every physical card exactly once across zones or
  cannot reach either approved end condition through normal play;
- Mosaic Workshop cleanup or scoring needs a fake system player or a
  player-authored automatic action;
- a one-turn smoke state is proposed as a substitute for a complete-game demo;
- source and packed-candidate replay digests differ; or
- the only way to keep an old test passing is to restore a deliberately
  excluded mechanic.
