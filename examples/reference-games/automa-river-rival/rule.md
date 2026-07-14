# River Guild

Status: **approved and authoritative**.

This file is the gameplay and theme authority for River Guild. The current
implementation, generated fixtures, snapshots, and tests describe legacy
behavior until they have been brought into conformance with this brief. A test
that disagrees with this file must be corrected; it does not amend the rules.

## Teaching scope

River Guild teaches that a deterministic non-human rival is ordinary reducer
state and an automatic procedure, not a fake player. It also demonstrates a
one- or two-human cooperative result, a selectable public market, seeded decks,
system events, and multi-step automatic resolution after all humans act.

The game is a complete six-round contest. A representative product demo should
show the river changing after several human claims, different rival
instructions resolving, and team cargo accumulating toward a shared outcome.
A fixed two-point click followed by one rival event is neither the rule nor an
adequate game demo.

## Theme brief

One or two river merchants cooperate to secure timber, grain, and ore from a
changing four-card river before an impersonal rival guild's standing orders
claim or sweep cargo away. The rival is an institution represented by a deck,
claimed cargo, and a progress track—not a character taking authenticated turns.

The visual language should emphasize a left-to-right river current, public
cargo cards, a cooperative warehouse for each human seat, and stamped rival
instructions. Rival events should feel like a procedure resolving against the
board, never like chat or animation from another player.

Canonical vocabulary:

- **river**: the ordered row of four public cargo cards;
- **cargo**: timber, grain, or ore with printed value 1 through 3;
- **human cargo**: public cargo claimed by a cooperating player;
- **rival instruction**: the automatic rule resolved once per round; and
- **rival progress**: value accumulated by claimed cards plus sweep bonuses.

## Players and objective

River Guild supports one or two cooperating human players in fixed session
seat order. The game lasts six complete rounds. In every round, each human
claims one cargo card and then the rival resolves one instruction.

After round 6, compare the combined value of all human cargo with rival
progress. All humans share the same win, draw, or loss.

## Information visibility

All human-facing gameplay information is public:

- the four ordered river cards;
- every human's claimed cargo;
- the current round and active human;
- rival progress, claimed cargo, discarded cargo, and revealed instructions;
  and
- ordered public procedure events and the final outcome.

The unrevealed cargo-deck and rival-instruction order are hidden. Humans have no
private hands or secret choices.

## Components and setup

Create 24 cargo cards. For each of `timber`, `grain`, and `ore`, use printed
values:

```text
1, 1, 2, 2, 2, 3, 3, 3
```

Every cargo card has a stable unique ID in addition to its kind and value.

Create exactly six rival instruction cards:

```text
claimHighest:      2
claimKind timber:  1
claimKind grain:   1
claimKind ore:     1
sweepLeft:         1
```

Ordinary setup independently seed-shuffles the cargo and instruction decks,
deals four cargo cards left to right into the river, sets rival progress to 0,
sets the round to 1, and activates the first human seat. Scenario tests may
provide explicit deck order to isolate a branch, but normal play uses
Dreamboard's seeded random source.

The rival has a label, hidden instruction deck, revealed instruction history,
claimed cargo, discarded cargo, and progress in game state. It has no
`PlayerId`, session seat, actor descriptor, authentication identity, hand
projection, or interaction collector.

## Complete game arc

Each of six rounds follows this sequence:

1. The first human in seat order claims one selected cargo from the river.
2. Refill that exact river position from the cargo deck.
3. In a two-human game, the second human claims one selected cargo and the
   vacated position refills.
4. After every human has acted, enter `resolveRival` and reveal one rival
   instruction.
5. Execute the instruction deterministically against the current river.
6. If it removes a river card, refill that exact position.
7. Enter `advanceRiverRound` and publish the round-advance event.
8. After round 6, calculate the cooperative outcome; otherwise increment the
   round and return control to the first human.

The rival resolves once per round, not once per human action. Humans never act
between instruction reveal and completion of the rival procedure.

## Phases and actions

| Phase               | Actor               | Available action | Input                                 | Availability and effect                                                                                                          |
| ------------------- | ------------------- | ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `setup`             | Automatic procedure | None             | None                                  | Shuffle both decks, deal the four-card river, and activate the first human.                                                      |
| `humanTurn`         | Active human only   | `claimCargo`     | `cargoId` naming a current river card | Move exactly that selected card to the actor's cargo, refill its position, then activate the next human or enter `resolveRival`. |
| `resolveRival`      | Automatic procedure | None             | None                                  | Reveal and execute one rival instruction, append its public events, and refill the river.                                        |
| `advanceRiverRound` | Automatic procedure | None             | None                                  | Publish the round advance, then increment and activate the first human or calculate the outcome after round 6.                   |
| `gameOver`          | None                | None             | None                                  | Expose the authoritative cooperative outcome and rival comparison.                                                               |

`claimCargo` revalidates that the submitting player is active and the submitted
`cargoId` is currently in the river. It has no `claimId`, request ID, or
game-authored idempotency token. Transport-command idempotency belongs to the
Dreamboard engine and must not appear in River Guild's model or authored action
parameters.

No player-facing action is available during `resolveRival` or
`advanceRiverRound`. These phases do not create a required action for a fake
rival actor.

## Rival instructions

Instructions resolve against the river order visible when `resolveRival`
begins:

- `claimHighest`: move the highest-value river card to `rivalClaimed`; ties
  choose the leftmost tied card. Add its printed value to rival progress.
- `claimKind`: among cards of the named kind, move the highest-value one to
  `rivalClaimed`; ties choose the leftmost. If the kind is absent, claim the
  leftmost river card instead. Add the claimed card's printed value to rival
  progress.
- `sweepLeft`: move the leftmost river card to `rivalDiscarded` and add exactly
  1 to rival progress. Its printed value adds nothing.

After removal, draw one cargo into the same river position so left-to-right
ordering remains stable. The 24-card cargo composition is sufficient for every
legal one- and two-human six-round game; ordinary play never reshuffles cargo.

## Procedure events

Automatic resolution emits ordered public events as applicable:

1. `rival-instruction-revealed` identifies the instruction.
2. `rival-cargo-claimed` identifies a claimed cargo card and resulting rival
   progress, or `rival-river-swept` identifies the discarded card and +1 gain.
3. `river-refilled` identifies the new card and position.
4. `river-round-advanced` identifies the completed round and whether another
   begins.

The events describe a reducer-owned procedure and public result. They must not
claim that a rival player submitted an action.

## Scoring and cooperative outcome

After the rival procedure for round 6, sum the printed values of every cargo
card claimed by every human. This is the team score.

- Team score greater than rival progress: every human receives `win`.
- Team score equal to rival progress: every human receives `draw`.
- Team score lower than rival progress: every human receives `loss`.

Every human standing has rank 1, the same result, and the same team score. Its
score breakdown contains one stable component per session seat showing that
human's cargo contribution; the components sum to the team score. The terminal
reason is `SIX_RIVER_ROUNDS_COMPLETE`.

Rival progress is displayed beside the outcome as ordinary non-player game
state. It is not a standing, player score, or player tie-break.

## Deliberate exclusions

River Guild deliberately does not include:

- a rival `PlayerId`, fake session seat, actor, collector, or player view;
- a bot API, AI search, model-generated choice, or generalized automa
  framework;
- `claimId`, `processedClaims`, or gameplay-owned request deduplication;
- a fixed human score award independent of selected cargo;
- rival resolution after each human rather than after the whole team acts;
- hidden human hands, trading, negotiation, adversarial human ranking, or
  individual victory;
- cargo-deck reshuffling, an endless mode, or variable instruction decks; or
- checked-in shuffled decks or mid-game base states as rules authority.

## Acceptance obligations

Conformance must prove:

- one- and two-human setup from normal seeded randomness;
- exact 24-card cargo and six-card instruction compositions;
- four public river cards dealt left to right;
- `claimCargo` selects the submitted current cargo and awards its printed value;
- wrong-player, unknown-card, removed-card, and stale submissions are rejected;
- the river refills after each human and rival removal;
- two humans act in seat order before exactly one rival procedure;
- `claimHighest` with a unique high card and a leftmost tie;
- every `claimKind`, including highest matching value, leftmost matching tie,
  and absent-kind fallback;
- `sweepLeft` discards the leftmost card and grants exactly 1 progress;
- all six rounds and sufficient cargo without reshuffling;
- one-human win, draw, and loss plus a two-human cooperative outcome;
- all humans share rank 1, result, team score, and complete contribution
  breakdown;
- no rival identifier is accepted by any player-targeted API;
- no claim ID or processed-request structure exists in game-authored state;
- identical decks, claims, events, and outcome from the same seed; and
- pointer and keyboard play with a legible evolving river on desktop and at
  390 by 844.
