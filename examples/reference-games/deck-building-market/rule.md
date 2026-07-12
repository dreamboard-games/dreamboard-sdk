# Sketchbook

> **Status: approved rules and theme authority.** This document is normative
> for the reference game. The current implementation, tests, fixtures, base
> states, and generated artifacts are not rules authority until they have been
> brought into conformance with this brief.

## Teaching scope

Sketchbook is the canonical compact example for a two-player deck-building
market. It teaches private hands, public finite supply piles, repeated
action/buy/cleanup turns, card movement through deck/hand/in-play/discard
zones, seeded reshuffles, card-driven follow-up inputs, and supply-based game
termination.

This is a complete multi-turn game. Players repeatedly improve their decks and
cycle newly acquired cards until a shared supply ending condition is reached.

## Theme brief

Two artists develop competing portfolios inside hand-drawn sketchbooks.
`Doodle`, `Sketch`, and `Inkwork` cards generate inspiration to acquire new
work. `Idea`, `Concept`, and `Masterpiece` cards represent portfolio progress.
Five technique cards change how a turn works.

Keep the loose ink, pencil, paper, annotation, and studio-shelf visual language.
Cards should visibly progress from rough Doodles to finished Masterpieces, and
the player's discard, draw cycle, and growing portfolio should be legible in a
landing-page demo.

## Players and objective

- Exactly 2 human players.
- Alternate complete turns until an end condition is observed at the end of a
  turn.
- Own the highest total portfolio value when the game ends.

## Information visibility

- A player's hand is visible only to that player; the opponent sees its card
  count, not card identities. Draw-deck order is hidden from every player.
- Cards in play, discard piles, trash, supply piles, pile counts, current
  player, turn step, actions, buys, and inspiration are public.
- Each player may inspect the identities in either discard pile, but nobody may
  inspect or reorder a draw deck.
- Seeded shuffle results remain hidden until cards are drawn.

## Components and setup

### Starting decks

Each player starts with exactly 10 cards:

- 7 `Doodle` cards.
- 3 `Idea` cards.

### Shared supply

Supply counts below are the cards placed in public piles after the two starting
decks have been created.

| Card             | Supply | Cost | Type        | Effect or value                                      |
| ---------------- | -----: | ---: | ----------- | ---------------------------------------------------- |
| **Doodle**       |     30 |    0 | Inspiration | Produces 1 inspiration when played                   |
| **Sketch**       |     20 |    3 | Inspiration | Produces 2 inspiration when played                   |
| **Inkwork**      |     12 |    6 | Inspiration | Produces 3 inspiration when played                   |
| **Idea**         |      8 |    2 | Portfolio   | Worth 1 point at game end                            |
| **Concept**      |      8 |    5 | Portfolio   | Worth 3 points at game end                           |
| **Masterpiece**  |      8 |    8 | Portfolio   | Worth 6 points at game end                           |
| **Brainstorm**   |      8 |    4 | Technique   | Draw 3 cards                                         |
| **Studio**       |      8 |    3 | Technique   | Draw 1 card; gain 2 actions                          |
| **Gallery**      |      8 |    5 | Technique   | Draw 1 card; gain 1 action, 1 buy, and 1 inspiration |
| **Eraser**       |      8 |    2 | Technique   | Trash 0–4 selected cards from the remaining hand     |
| **Studio Visit** |      8 |    4 | Technique   | Gain one selected supply card costing at most 4      |

Setup is automatic:

1. Create both starting decks from cards reserved for that purpose.
2. Shuffle each starting deck independently using trusted seeded entropy.
3. Deal 5 cards from each deck into its owner's private hand.
4. Seat 1 becomes the first active player and begins the action step.

The same seed and player order must reproduce both opening shuffles.

## Complete game arc

```text
seeded setup and opening hands
  -> player 1 action / buy / cleanup
  -> end-condition check
  -> player 2 action / buy / cleanup
  -> end-condition check
  -> repeat, cycling acquired cards through each deck
  -> score every owned card when a supply condition is met
  -> publish the terminal outcome
```

The game does not end at an arbitrary point threshold. A normal playthrough
must demonstrate multiple turns, acquisitions entering later hands, at least
one discard reshuffle, and a supply-triggered outcome.

## Turn and phase sequence

At the start of every turn, the active player has 1 action, 1 buy, and 0
unspent inspiration.

### 1. Action step

The active player may play a Technique card from hand by spending 1 action.
Move the played card to the player's public in-play area, then resolve its
effect completely. Actions granted by a card are added after paying the action
used to play it.

The player may continue while they have actions and playable Technique cards,
or end the action step early. Once the buy step begins, the player cannot
return to the action step.

If a Technique requires a follow-up selection, no other interaction is
available until that selection resolves:

- **Eraser:** select 0–4 distinct cards still in hand and move them to the
  shared trash. The Eraser itself is already in play and cannot select itself.
- **Studio Visit:** select the top card of one nonempty supply pile with cost 4
  or less and gain it to the discard pile. Studio Visit is playable only while
  at least one such card exists.

Whenever an effect draws cards, draw as many of the requested number as
possible using the draw procedure below.

### 2. Buy step

The active player may play any number of Inspiration cards from hand. Move each
played card to the in-play area and add its printed inspiration value to the
turn total.

For each available buy, the player may select the top card of one nonempty
supply pile whose cost does not exceed their unspent inspiration. Move that
card to the player's discard pile, subtract its cost, and spend one buy. Cards
gained this turn never enter the current hand unless a later rule explicitly
says so.

The player may leave inspiration or buys unspent and end the turn at any time.

### 3. Cleanup and end check

Ending the turn automatically:

1. Moves every card remaining in the active player's hand and in-play area to
   that player's discard pile.
2. Draws a new hand of 5 cards using the draw procedure.
3. Checks the shared supply end conditions.
4. If the game continues, resets the turn resources and makes the other player
   active.

An end condition reached during an action or buy does not interrupt the turn.
The active player completes or ends the current turn, and the game ends during
this end check.

## Draw and reshuffle procedure

To draw `N` cards:

1. Draw from the top of the player's deck until either `N` cards have been
   drawn or the deck is empty.
2. If more cards are required and the discard pile is nonempty, shuffle the
   entire discard pile into a new deck using trusted seeded entropy, then
   continue drawing.
3. If both deck and discard are empty, stop; the player draws fewer than `N`.

Never shuffle while the deck can satisfy the remainder of the draw. Never mix
the current hand or in-play area into a mid-turn reshuffle. During cleanup,
those zones move to discard before the five-card draw begins.

## Canonical interactions

| Canonical action ID             | Actor         | Available when                                                                                       | Input and effect                                                                                                  |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `playerTurn.brainstorm`         | Active player | Action step, at least 1 action, selected Brainstorm is in hand                                       | `cardId`; spend 1 action, play it, then draw 3.                                                                   |
| `playerTurn.studio`             | Active player | Action step, at least 1 action, selected Studio is in hand                                           | `cardId`; spend 1 action, play it, draw 1, then gain 2 actions.                                                   |
| `playerTurn.gallery`            | Active player | Action step, at least 1 action, selected Gallery is in hand                                          | `cardId`; spend 1 action, play it, draw 1, then gain 1 action, 1 buy, and 1 inspiration.                          |
| `playerTurn.eraser`             | Active player | Action step, at least 1 action, selected Eraser is in hand                                           | `cardId`; spend 1 action, play it, then enter its required resolution.                                            |
| `playerTurn.resolveEraser`      | Active player | An Eraser resolution is pending                                                                      | `cardIds`: 0–4 distinct cards in the remaining hand; trash them and return to the action step.                    |
| `playerTurn.studioVisit`        | Active player | Action step, at least 1 action, selected Studio Visit is in hand, and an eligible supply card exists | `cardId`; spend 1 action, play it, then enter its required resolution.                                            |
| `playerTurn.resolveStudioVisit` | Active player | A Studio Visit resolution is pending                                                                 | `cardId`: top card of a nonempty supply pile costing at most 4; gain it to discard and return to the action step. |
| `playerTurn.endActionStep`      | Active player | Action step with no unresolved Technique                                                             | No input; enter the buy step.                                                                                     |
| `playerTurn.playInspiration`    | Active player | Buy step and selected Inspiration card is in hand                                                    | `cardId`; move it to in-play and add its printed inspiration. Repeat as desired.                                  |
| `playerTurn.buyCard`            | Active player | Buy step, at least 1 buy, and at least one nonempty affordable pile exists                           | `cardId`: top card of an affordable supply pile; gain it to discard, pay its cost, and spend 1 buy.               |
| `playerTurn.endTurn`            | Active player | Buy step                                                                                             | No input; run cleanup, draw, and the end-condition check automatically.                                           |

`playInspiration` is the sole authoritative inspiration-playing interaction. A
UI may offer a local "play all" convenience that submits legal
`playInspiration` actions, but a bulk-play action is not a second gameplay rule
or conformance path.

## Automatic procedures and precedence

- Setup, shuffles, card draws, cleanup, end-condition checking, scoring, and
  outcome publication are automatic.
- A pending Eraser or Studio Visit selection blocks every other action until it
  resolves.
- Supply-card eligibility and hand ownership are revalidated on commit; a stale
  client cannot gain a covered, emptied, or newly unaffordable card.
- Empty piles remain in the supply as empty public piles.
- The end check runs only after cleanup and the new five-card draw completes.
- If both end conditions become true in the same turn, score the game once.

## End conditions, scoring, and outcome

The game ends at the end of a turn when either:

- The `Masterpiece` pile is empty, or
- Any 3 supply piles are empty.

At game end, each player scores every Portfolio card they own across their
hand, deck, discard, and in-play zones. Technique and Inspiration cards score 0. Trashed cards have no owner and never score.

Rank players by descending portfolio score. A sole highest scorer receives
rank 1 and `win`. If scores are equal, both players share rank 1 and receive
`draw`. There is no turn-count or first-player tie-breaker.

## Deliberate exclusions

- No attack cards, penalty cards, opponent deck mutation, or reaction timing.
- No Open Mic, Critic, Sketchpad, or additional Technique catalogue.
- No variable market, random Technique selection, or expansions.
- No cards with effects in another player's turn.
- No point threshold, fewer-turn tie-break, or instant mid-turn ending.
- No separate bulk-play gameplay interaction.
- No checked-in opening hand, shuffled deck, or mid-game base state as the
  normal setup path.

## Acceptance obligations

Conformance must prove all of the following from this brief:

- A seeded normal setup creates two valid 10-card starter decks and private
  five-card opening hands.
- Every shared supply count, cost, type, effect, and portfolio value matches the
  component table.
- A full turn follows action, buy, cleanup, end check, and opponent rotation in
  that order.
- Each of the five Technique archetypes resolves its exact effect, including
  Eraser's optional multi-selection and Studio Visit's cost-limited target.
- Technique chains correctly spend and grant actions, buys, and inspiration.
- Purchased and gained cards enter discard, survive cleanup, and can appear in
  a later hand after a deterministic reshuffle.
- Drawing across deck exhaustion preserves every owned card exactly once and
  never shuffles a hand or in-play card mid-turn.
- Masterpiece exhaustion and three-pile exhaustion end only at the end check.
- A full normal playthrough takes multiple turns, cycles acquired cards, and
  reaches a supply-triggered terminal outcome.
- Sole winners and an exact tied-score draw are both covered.
- Opponent and spectator projections do not reveal hand identities or deck
  order.
- Scenario setup may isolate rare branches, but scenarios, fixtures, snapshots,
  and base states must never redefine these rules.
