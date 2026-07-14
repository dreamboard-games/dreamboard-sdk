# Lantern Market

> **Status: approved rules and theme authority.** This document is normative
> for the reference game. The current implementation, tests, fixtures, base
> states, and generated artifacts are not rules authority until they have been
> brought into conformance with this brief.

The stable repository ID remains `simultaneous-card-drafting`.

## Teaching scope

Lantern Market is the canonical compact example for sealed simultaneous card
drafting. It teaches private rotating hands, one locked choice per player,
barrier completion, simultaneous reveal, deterministic hand passing, and
round-to-round score accumulation.

This is a complete two-round game. Each player makes six choices per round and
twelve choices over the full game.

## Theme brief

At a night market, each player decorates a festival stall with bright lanterns,
paired tea cups, and matching banners before dawn. The three card families must
be visually distinct at card size and must use the original names and scoring
icons below. The presentation should emphasize hands moving around the table
and every stall becoming fuller over time.

The theme must not use sushi, restaurants, chopsticks, pudding, or visual
language derived from an existing commercial drafting game.

## Players and objective

- 2–5 human players.
- Exactly 2 rounds.
- Exactly 6 picks per player in each round.
- Score the most total points across both rounds.

## Information visibility

- A hand is visible only to its current holder.
- A locked card remains sealed until every player has committed for that pick.
  Commit status may be public; selected card identity must remain private.
- Revealed cards in every player's stall, round scores, total scores, round
  number, and pick number are public.
- The draw-deck order and undealt cards are hidden from every player.
- At the end of a round, played cards may move to a public scored-card history;
  their identities do not become hidden again.

## Components and setup

The deck contains exactly 60 cards:

| Card                | Copies | Scoring family |                                             Points at round end |
| ------------------- | -----: | -------------- | --------------------------------------------------------------: |
| **Lantern**         |     20 | Singles        |                                             2 for every Lantern |
| **Tea Cup**         |     20 | Pairs          |            5 for every complete pair; an unpaired card scores 0 |
| **Festival Banner** |     20 | Triples        | 9 for every complete set of three; one or two leftovers score 0 |

Setup is automatic:

1. Shuffle all 60 cards once using trusted seeded entropy.
2. Preserve that single deck order for the entire game; never reshuffle scored
   or undealt cards.
3. For round 1, deal one card at a time in seat order until every player has 6
   cards.

At the start of round 2, deal the next 6 cards per player from the same undealt
deck using the same one-at-a-time seat order. With five players, all 60 cards
are used. With fewer players, unused cards remain hidden and never enter play.

The seed and player seat order therefore determine both rounds' deals exactly.

## Complete game arc

```text
seeded shuffle
  -> deal six cards per player for round 1
  -> six sealed pick/reveal/pass barriers
  -> score and clear round 1 stalls
  -> deal six cards per player for round 2
  -> six sealed pick/reveal/pass barriers
  -> score round 2
  -> publish the terminal outcome
```

A normal seeded playthrough must traverse the full arc. A one-pick scenario is
useful focused proof but is not a playable-game substitute.

## Turn and phase sequence

### 1. Drafting barrier

On each pick, every player chooses exactly one card from their current hand and
commits once. A committed choice cannot be changed, and the player has no
further action until the barrier resolves.

When every player has committed, resolve the barrier atomically:

1. Move every locked card face up into its chooser's stall.
2. Reveal all chosen cards together.
3. If cards remain in hand, pass each remaining hand to the next seat on the
   left, wrapping from the last seat to the first.
4. Increment the public pick number and open the next barrier.

After the sixth reveal, hands are empty and no pass occurs.

### 2. Round scoring

After pick 6, score each stall using all cards that player drafted during the
round. Add the round score to the player's total, preserve a public scored-card
history, and clear the active stall.

After round 1 scoring, deal round 2 automatically. After round 2 scoring,
publish the terminal outcome.

## Canonical interactions

| Canonical action ID | Actor                                                     | Available when                                                     | Input and effect                                                                                                                                                  |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drafting.submit`   | Every player who has not committed in the current barrier | Drafting is active and the actor's hand contains one or more cards | `cardId`: exactly one card in the actor's current hand. Seal the choice. Once every actor commits, reveal all choices and rotate remaining hands left atomically. |

Dealing, reveal, hand rotation, round scoring, and game-over publication are
automatic procedures. No second-choice mode or special-card interaction exists.

## Automatic procedures and precedence

- A drafting barrier resolves exactly once and only after all current actors
  commit.
- No locked card or remaining hand changes owner before barrier resolution.
- All selected cards become public in the same resolution; seat-order
  processing must not create an observable early reveal.
- Round scoring occurs immediately after the sixth reveal and before any round
  2 hand is visible or actionable.
- Game scoring occurs immediately after round 2 scoring.
- Eligibility and card ownership are revalidated when a submission commits, so
  a stale client cannot select a card from an earlier hand.

## Scoring and outcome

For each round and player:

```text
round score =
  2 * Lantern count
  + 5 * floor(Tea Cup count / 2)
  + 9 * floor(Festival Banner count / 3)
```

Round-card leftovers have no negative value. Total score is the sum of the two
round scores.

Rank players by descending total score. A sole highest scorer receives rank 1
and `win`. Players tied for the highest score share rank 1 and receive `draw`.
All other players receive `loss`; exact lower-place ties use competition ranks.
There is no tie-breaker.

## Deliberate exclusions

- No third round and no variable hand size by player count.
- No two-card pick, card exchange, retained tool, or action-card effect.
- No majority, second-place, persistent end-game, variable-value, or
  order-dependent scoring families.
- No special tie division; each player's set score is calculated independently.
- No changing pass direction.
- No reused scored cards or reshuffle between rounds.
- No checked-in hand or mid-draft base state as the normal setup path.

## Acceptance obligations

Conformance must prove all of the following from this brief:

- The deck has exactly 20 cards of each family and no other card type.
- The same seed and seat order reproduce both rounds' hands for every supported
  player count.
- Every player receives six private cards at each round start without leaks.
- One sealed card per player resolves as a simultaneous reveal, and remaining
  hands rotate left exactly once.
- Committed players cannot act twice or inspect another locked choice while
  waiting for the barrier.
- A full normal playthrough produces six picks in each of two rounds.
- Singles, multiple pairs, multiple triples, and leftover cards score exactly
  as specified.
- Round 1 cards clear without losing score or public history, and round 2 uses
  fresh cards from the undealt deck.
- Sole winners, tied winners, and lower-place ranking ties publish the correct
  terminal outcome.
- Scenario setup may isolate rare branches, but scenarios, fixtures, snapshots,
  and base states must never redefine these rules.
