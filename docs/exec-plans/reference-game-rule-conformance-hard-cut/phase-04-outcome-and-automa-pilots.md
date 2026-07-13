# Phase 04: Outcome And Automa Pilots

Status: complete

Depends on: Phases 00-03

Primary repository: `dreamboard-sdk`

## Objective

Bring Harbor Fair and River Guild into conformance with their approved rule
briefs. Together they must prove that the base-free scenario and inspection
model covers:

- numeric ranked outcomes with ordered tie-break evidence;
- a valid scoreless cancellation outcome;
- a cooperative team result shared by one or two humans; and
- a deterministic non-human procedure represented as ordinary reducer state,
  never as a fake player.

This phase consumes the generic authoring and scheduler contracts proven in
Phases 01-03. It must not create a scoring DSL, ranking DSL, generalized bot
API, event framework, or second scenario-authoring path.

## Authority And Stable Paths

| Stable directory ID            | Display name | Rules authority                                                 | Implementation root                                      |
| ------------------------------ | ------------ | --------------------------------------------------------------- | -------------------------------------------------------- |
| `multiplayer-ranking-and-ties` | Harbor Fair  | `examples/reference-games/multiplayer-ranking-and-ties/rule.md` | `examples/reference-games/multiplayer-ranking-and-ties/` |
| `automa-river-rival`           | River Guild  | `examples/reference-games/automa-river-rival/rule.md`           | `examples/reference-games/automa-river-rival/`           |

Keep directory IDs, package names, manifest IDs, and release slugs stable.
Adopt the approved display names and theme vocabulary everywhere users or
agents see the game. Existing implementation and tests remain non-authoritative
until each acceptance bullet is proven against `rule.md`.

## Entry Criteria

- Phases 00-02 have provided the rule ledger, base-free legal replay, and
  JSON-only inspect/explore contracts.
- Phase 03 has proven that automatic procedures do not need fake actors and
  that actionability is derived rather than authored.
- The canonical outcome contract can represent numeric score components,
  ordered tie-break evidence, competition ranks, scoreless standings, and
  cooperative equal-rank results without game-specific transport types.
- Any old fixture that implies different rules is labeled characterization
  evidence and is safe to delete.

## Cross-Game Invariants

- Both games start through normal setup with a safe-integer seed and replay
  only legal accepted command steps.
- `actions` lists only interactions for which the active human has at least one
  legal complete input assignment now; explore returns the concrete commands
  for one selected player perspective. Neither storms nor the rival guild
  creates a required player action.
- Automatic refill, cancellation, rival resolution, round advancement,
  scoring, and outcome publication settle through reducer-owned procedures.
- The same seed, player seats, and command sequence reproduce hidden deck
  order, public events, state, and terminal outcome.
- Outcome assertions read the reducer's authoritative outcome. UI and tests do
  not sort players, infer winners, manufacture ranks, or add provisional
  scores.
- No base state, snapshot, test-only setup profile, deck injection, outcome
  injection, or state patch is accepted as scenario authority.

The briefs' permissive note that a scenario may supply an explicit deck order
predates the base-free workflow. This plan deliberately uses seed-range
discovery plus legal replay instead; the note is not a requirement to expose a
deck-order override and does not change normal gameplay.

## Scenario Matrix

This phase varies player count, public action domains, hidden seeded decks,
automatic-procedure ordering, terminal outcome kind, tie semantics, and system
events. It does not depend on dice and must not be implemented as a
dice-specific matrix helper.

A row may name a scenario family. Every distinct player count, seed-dependent
branch, or mutually exclusive terminal result is one file with one default
export; use suffixes and group them in the ledger rather than exporting several
scenarios from one module.

### Harbor Fair

Create or rewrite scenarios under
`examples/reference-games/multiplayer-ranking-and-ties/test/scenarios/`:

| Scenario source                                | Dimensions and required proof                                                                                                                                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`                    | Normal seeded setup and a legal six-round game with a growing public festival row, at least one complete guild set, final refill, numeric score breakdown, tie-break evidence, competition ranks, and terminal outcome. This is the canonical multi-turn demo replay. |
| `supported-player-count-<n>.scenario.ts`       | Separate complete normal seeded games with two, three, and four humans; four-stall initial market; six drafts per player; seat-order progression.                                                                                                                     |
| `refill-and-cancellation-<branch>.scenario.ts` | Separate initial-first-storm, initial second-storm cancellation, ordinary first-storm refill, and final-refill cancellation replays. Each branch starts normally with a discovered seed.                                                                              |
| `draft-actionability.scenario.ts`              | Active-player-only `draftStall`, exact current-market `stallId` domain, wrong-seat and manifest-known nonmarket/removed/stale rejection, refill before seat or round progression, and no storm action.                                                                |
| `ranking-and-ties-<branch>.scenario.ts`        | Separate unique-winner, guild-set tie-break, coin tie-break, true rank-1 tie, and lower-place tie replays; rank gaps such as `1, 2, 2, 4`; exact component sums and ordered tie-break evidence.                                                                       |
| `scoreless-cancellation.scenario.ts`           | `FESTIVAL_CANCELLED`; every player rank 1 and `draw`; no score, breakdown, or tie-break fields; no provisional winner inferred from festival rows.                                                                                                                    |
| `outcome-validation.test.ts`                   | Isolated pure contract tests reject missing, duplicate, or unknown player standings. This test validates the outcome boundary and does not construct gameplay state.                                                                                                  |

Implementation tasks:

- conform the deck to 30 stable stall cards using the exact three-guild recipe
  plus two storms;
- seed-shuffle once, maintain a four-stall market, and make `draftStall` the
  only player interaction;
- implement one refill procedure for setup and every post-draft boundary,
  including the last draft of round 6;
- commit the second-storm cancellation before any later seat, round, or normal
  score transition can run;
- calculate `stall-prestige`, `guild-set-points`, and `coin-bonus`, then compare
  score, complete guild sets, and coins in the approved order;
- assign competition ranks and win/draw/loss labels authoritatively; and
- derive opening market, growing rows, tie-break evidence, cancellation, and
  normal terminal Workbench/UI checkpoints from legal scenario prefixes.

The ranking helper may have focused pure tests for hand-constructed score rows,
but complete legal gameplay must still reach representative unique, tie-break,
true-tie, and cancellation outcomes. A pure ranking test cannot satisfy the
complete-game obligation.

### River Guild

Create or rewrite scenarios under
`examples/reference-games/automa-river-rival/test/scenarios/`:

| Scenario source                             | Dimensions and required proof                                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-game.scenario.ts`                 | Normal seeded two-human setup, two human claims in seat order followed by exactly one rival procedure for each of six rounds, evolving river, contribution breakdown, and cooperative terminal outcome. This is the canonical multi-turn demo replay. |
| `complete-game-solo-<result>.scenario.ts`   | Separate one-human normal seeded games reaching win, draw, and loss against rival progress.                                                                                                                                                           |
| `setup-and-determinism.scenario.ts`         | Exact 24-card cargo and six-instruction compositions, independent seeded shuffles, four public cards left to right, sufficient cargo without reshuffle, and same-seed replay identity.                                                                |
| `claim-actionability.scenario.ts`           | Active-human-only `claimCargo`, exact current-river `cargoId` domain, printed-value award, exact-position refill, and wrong-player plus manifest-known nonriver/removed/stale rejection.                                                              |
| `rival-instruction-<branch>.scenario.ts`    | Separate legal seeded paths for `claimHighest` unique/leftmost tie, every `claimKind` highest/matching tie/absent fallback, and `sweepLeft` discard with exactly one progress.                                                                        |
| `procedure-events.scenario.ts`              | Exact instruction-revealed, cargo-claimed or river-swept, refill, and round-advanced event order and payloads; exactly one rival procedure after all humans; no human action during automatic resolution.                                             |
| `cooperative-outcome-<players>.scenario.ts` | Separate one- and two-human results; all humans rank 1 with the same result and team score; stable per-seat contribution components sum to team score; rival remains ordinary non-standing state.                                                     |
| `no-fake-player.scenario.ts`                | No rival player ID, session seat, actor descriptor, collector, player view, player-targeted API value, available action, required actor, or `blockedBy`; no game-authored claim ID or processed-request structure.                                    |

Implementation tasks:

- model the rival as deck, history, claimed/discarded cargo, and progress fields
  in reducer state without allocating any player identity;
- independently seed-shuffle the exact cargo and instruction decks during
  ordinary setup;
- make `claimCargo` the sole human interaction and refill the selected river
  position after every human claim;
- after all humans act, reveal and resolve exactly one instruction
  deterministically against current left-to-right river order;
- emit the four ordered procedure-event classes without describing a rival
  player action;
- after the round-6 rival procedure, compute one shared team score and one
  stable contribution component per human seat; and
- derive opening river, mid-game instruction variety, accumulated team cargo,
  and terminal Workbench/UI checkpoints from the complete replay.

Transport idempotency remains engine-owned. Do not add `claimId`,
`processedClaims`, deduplication maps, or reconnect-specific gameplay fields to
River Guild. Reconnect proof may replay the authoritative log in a later
integration phase; it is not a separate game rule or scenario mode here.

## Complete-Game Demo Standard

Both games must expose at least four reusable structural checkpoints from
`test/scenarios/complete-game.scenario.ts`:

1. normal setup;
2. an early accepted choice and automatic refill;
3. a mid-game board showing accumulated progress and procedure history; and
4. the authoritative terminal outcome.

Workbench and landing-page consumers select those checkpoints from the
scenario replay by `{ scenarioPath, at: "given:<n>" | "when:<n>" }`. A
consumer may attach a presentation label, but the behavior scenario does not
gain named-checkpoint metadata. Consumers do not check in editable demo state
or shorten the game to one turn. Phase 07 decides which complete game is
featured on the landing page; it does not change the game rules or maintain a
second replay.

## Obsolete Test/Profile Deletion And Fixture Readiness

Make every checked-in generated/projection path below unused and mark it
`deletion-ready`; Phase 07 performs the coordinated deletion after internal
consumers can compile a clean archive:

```text
examples/reference-games/multiplayer-ranking-and-ties/test/generated/**
examples/reference-games/automa-river-rival/test/generated/**
```

Replace the current fixture-shaped Harbor Fair `draft-flow`,
`draft-stall-ready`, `outcomes`, and `cancellation` scenarios with the canonical
base-free matrix above; preserve a valid assertion only by moving it into the
new legal replay. Delete `app/setup-profiles.ts` if its sole purpose is to name
an otherwise ordinary `standard` setup.

Replace River Guild's legacy `claim-cargo`, `duplicate`, `reconnect`, and
`terminal` fixture scenarios and `test/helpers`/testing adapters if they bypass
the canonical runner. The old duplicate scenario is specifically not authority
for a game-owned request ID. Retain any reconnect coverage only as a derived
replay/integration assertion with no game-state deduplication model.

No test-only profile may inject festival deck order, river cards, instruction
order, scores, standings, progress, phase, or terminal outcome. Seed discovery
and legal command replay replace those fixtures.

Raw unknown IDs and malformed values are proved once by the SDK/wire ingress
conformance suite and linked from the rule ledger. Game scenarios use typed
manifest-known IDs that are illegal in the current node; they do not cast
around the contract to manufacture schema-invalid commands.

## Rule Acceptance Coverage Ledger

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-04-rule-conformance-ledger.md`.
For every acceptance bullet in Harbor Fair and River Guild, record the bullet's
opening text, proof path, exact assertion/checkpoint, and result.

Do not introduce rule IDs, `covers` arrays, annotations in scenario source, or
a generated gameplay specification. The ledger is a phase receipt pointing
back to the approved prose; it does not become another rules authority.

## Tests And Verification

Focused package gates:

```sh
mise exec node@24 -- pnpm --dir examples/reference-games/multiplayer-ranking-and-ties verify
mise exec node@24 -- pnpm --dir examples/reference-games/automa-river-rival verify
```

For each game, run JSON inspect/explore from its package root against
`test/scenarios/complete-game.scenario.ts` and at least one automatic-procedure
checkpoint using Phase 03's exact packed `DREAMBOARD_CLI_BIN`. Inspect every
player/spectator perspective and explore every actionable player separately.
Assert one JSON envelope on stdout, no fake actor, and no private hidden-deck
data in any wrong perspective.

Repository gates:

```sh
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:fixtures:compile
mise exec node@24 -- pnpm ui:fixtures:check
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm docs:check
```

Run the complete-game scenarios twice from clean setup and compare canonical
replay digests. Harbor Fair outcome ordering and River Guild event ordering
must be byte-stable after normalization of receipt timestamps and paths.

## Receipts

Create
`docs/exec-plans/reference-game-rule-conformance-hard-cut/artifacts/phase-04-receipt.md`
with:

- SDK commit and packed candidate digest;
- completed rule-acceptance ledger links;
- complete-game seeds, player counts, command counts, terminal reasons, and
  normalized replay digests;
- Harbor Fair evidence for normal numeric, tie-break, true-tie, lower-tie, and
  scoreless cancellation outcomes;
- River Guild evidence for every instruction, procedure event order, one- and
  two-human results, and absence of a rival player identity;
- opening/mid-game/terminal `{ scenarioPath, at }` tuples plus any
  consumer-owned Workbench labels derived from the complete scenarios;
- focused, packed, Workbench, and documentation gate results; and
- before/after tracked line and byte counts plus the deletion audit.

Keep large state dumps and generated projections out of the receipt. Record
digests and the smallest useful evidence excerpts.

## Exit Criteria

- Harbor Fair completes normal two-, three-, and four-player games and proves
  cancellation at both setup and the final refill boundary.
- Harbor Fair publishes authoritative score components, ordered tie-breaks,
  competition ranks, ties, and scoreless cancellation without UI inference.
- River Guild completes six rounds with one and two humans, one deterministic
  rival procedure per round, and no fake player or gameplay deduplication
  model.
- Every rival instruction, public procedure event order, and cooperative result
  branch has executable evidence.
- Each game has a normal-setup `complete-game.scenario.ts` with opening,
  developing, and terminal demo checkpoints.
- Every rule acceptance bullet is mapped in the phase ledger without new rule
  metadata.
- Obsolete authored profiles and legacy scenario adapters are removed;
  generated fixtures/snapshots are unused and deletion-ready for Phase 07.
- Focused, packed, Workbench, and documentation gates pass.

## STOP Conditions

Stop and report instead of inventing a local workaround if:

- the canonical outcome contract cannot represent either ordered tie-break
  evidence or scoreless cancellation without a game-specific transport type;
- Harbor Fair cancellation can be overwritten by a later scoring transition,
  or UI/test code must infer its own standings;
- River Guild requires a rival `PlayerId`, authenticated actor, collector,
  player view, or player-authored action to advance;
- deterministic rival behavior requires a generalized bot/AI framework or
  model-generated choice;
- a required outcome or instruction branch can be reached only by injecting a
  deck, score, progress value, or terminal state;
- inspect/explore exposes hidden deck order or describes an automatic
  procedure as a player obligation;
- a complete replay needs game-authored request deduplication to be stable;
- source and packed candidate replay digests differ; or
- a legacy test contradicts `rule.md` and resolving it would require an
  unapproved rule amendment.
