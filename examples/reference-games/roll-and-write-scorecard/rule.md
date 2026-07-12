# Cloudline Survey

Status: **approved and authoritative**.

This file is the gameplay and theme authority for Cloudline Survey. The current
implementation, generated fixtures, snapshots, and tests describe legacy
behavior until they have been brought into conformance with this brief. A test
that disagrees with this file must be corrected; it does not amend the rules.

## Teaching scope

Cloudline Survey teaches that a roll-and-write scorecard can be modeled as an
ordinary per-player square board. It also demonstrates seeded shared
randomness, seat-order decisions derived from the same random result, legal
target calculation, and score breakdowns.

The game is a complete eight-round experience. A landing-page or product demo
must show the scorecards developing across multiple rolls, including a choice
between matching cells and at least one completed scoring feature. A single
mark is useful as an interaction test but is not a representative game demo.

## Theme brief

Each player leads a cloud-survey crew charting the same eight weather readings
on their own field grid. A successful survey places the rolled total on a
matching target cell. When no matching target remains, the crew must mark an
unusable observation site as a failed survey.

The visual language should evoke field notebooks, contour maps, weather
instruments, and annotated cloud formations. Every scorecard is personal to a
player but **not private**: all grids, marks, scores, and the shared dice are
publicly visible. The UI must never imply hidden paper sheets or secret marks.

Canonical vocabulary:

- **survey grid**: a player's 4 by 4 personal board;
- **target**: the printed number on an unmarked cell;
- **surveyed**: a successful mark matching the current roll;
- **failed survey**: a mark made because no matching target remains; and
- **weather reading**: the shared two-die result for a round.

## Players and objective

Cloudline Survey supports one to four human players in fixed session seat
order. The game lasts exactly eight shared rolls unless setup cannot create a
valid session.

Players score completed rows and columns, their largest connected surveyed
region, and penalties for failed surveys. The highest final score wins. A solo
player wins on completing the game, regardless of score.

## Information visibility

All gameplay information is public:

- both dice and their total;
- the current round and active player;
- every player's survey grid and marks; and
- final score components and standings.

The random source state remains engine-private. There is no player-private game
state and no hidden choice.

## Components and setup

Every player receives the same fixed target layout:

```text
 2   5   8  11
 6   9   3   7
10   4  12   6
 7  11   5   9
```

Each of the 16 cells starts unmarked and can hold exactly one mark:

```ts
type SurveyMark =
  | { kind: "surveyed"; round: number; rolledTotal: number }
  | { kind: "failed"; round: number };
```

The board is declared as an ordinary square grid with `scope: "perPlayer"`.
This creates one personal board per player; it does not make the board private.

Setup creates an empty grid for every session player, sets the round to 1, and
enters the automatic `roll` phase. Ordinary play does not contain a fixed list
of dice results. Each round rolls two real six-sided dice through Dreamboard's
seeded random source. The same setup seed and interaction sequence must produce
the same individual dice, totals, marks, and final outcome.

Scenario tests may inject an explicit random stream to isolate a branch. They
must not turn that stream into the normal game's rules or require a checked-in
mid-game base state.

## Complete game arc

Each of eight rounds follows this sequence:

1. `roll` automatically rolls two seeded six-sided dice and publishes both
   values and their total.
2. The first player in session seat order enters `markSurvey`.
3. That player marks exactly one legal cell and submits the choice.
4. Each remaining player resolves the same weather reading in seat order.
5. After the last player submits, advance the round and return to `roll`.
6. After every player resolves round 8, calculate scores and enter `gameOver`
   instead of rolling again.

The shared roll never changes while players are resolving it. A later player
cannot act before every earlier seat has submitted.

## Phases and actions

| Phase        | Actor               | Available action | Input                               | Availability and effect                                                                                                                   |
| ------------ | ------------------- | ---------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `roll`       | Automatic procedure | None             | None                                | Roll two seeded d6, publish the reading, set the first seat active, and enter `markSurvey`.                                               |
| `markSurvey` | Active human only   | `markCell`       | `cellId` on the actor's survey grid | Accept exactly one legal unmarked cell, derive whether it is surveyed or failed, commit the mark, then advance to the next seat or round. |
| `gameOver`   | None                | None             | None                                | Expose the authoritative outcome; gameplay actions are unavailable.                                                                       |

`markCell` is the only player-authored gameplay action.

The reducer calculates legal cells:

1. Find every unmarked cell on the active player's grid.
2. Filter those cells to targets equal to the current dice total.
3. If at least one matching target exists, only those matching cells are
   legal.
4. If no matching target exists, every unmarked cell is legal and the accepted
   choice becomes a failed survey.

The player cannot voluntarily take a failed survey while a matching target is
available. The submitted cell must belong to the active player's personal
board; another player's corresponding cell is not a legal target.

## Automatic procedures and ordering

The `roll` procedure consumes exactly two d6 results per round. It must commit
the dice before `markCell` becomes available. Rolling is not a player action
and no player can reroll, modify, or decline the reading.

After an accepted `markCell`:

- if another player has not resolved the round, activate the next seat without
  rolling;
- if all players resolved rounds 1 through 7, increment the round and execute
  `roll`; or
- if all players resolved round 8, calculate the outcome immediately and enter
  `gameOver`.

## Scoring and outcome

For each player, calculate these components from their final grid:

- `complete-rows`: 6 points for each row containing four surveyed cells;
- `complete-columns`: 6 points for each column containing four surveyed cells;
- `largest-region`: 1 point for each surveyed cell in the player's largest
  orthogonally connected group; and
- `failed-surveys`: minus 2 points for each failed survey.

Failed cells do not count toward completed rows, completed columns, or connected
regions. Diagonal cells are not connected. The four component values sum to
the player's authoritative score.

Sort players by descending score and assign competition ranks: equal scores
share a rank and the next rank skips the occupied positions, such as
`1, 2, 2, 4`.

- A sole rank-1 player receives `win`.
- Multiple rank-1 players each receive `draw`.
- Every lower-ranked player receives `loss`.
- In a one-player game, the player receives rank 1 and `win`.

The terminal reason is `EIGHT_ROUNDS_COMPLETE`. Every standing includes its
score and the four named score components.

## Deliberate exclusions

Cloudline Survey deliberately does not include:

- simultaneous submissions or a simultaneous-action framework;
- private scorecards, secret marks, or hidden player information;
- a special `Sheet` runtime or scorecard-specific collector;
- player-triggered rolling, rerolls, dice modification, or mitigation powers;
- variable grids, asymmetric targets, upgrades, or an extended campaign;
- generic framework-owned connectivity, scoring, or ranking rules; or
- checked-in random outcomes or mid-game base states as rules authority.

The reducer owns target legality, connected-region calculation, scoring, and
standings. The UI only presents those decisions.

## Acceptance obligations

Conformance must prove:

- ordinary setup performs real seeded 2d6 rolls rather than reading a fixed
  sequence;
- the same seed and interaction sequence reproduce both dice, all marks, and
  the outcome;
- one through four players resolve every roll strictly in seat order;
- all personal boards remain public to every player projection;
- multiple matching cells, one remaining match, and no-match fallback;
- the reducer, not the client, chooses `surveyed` versus `failed`;
- wrong-player, wrong-board, and illegal-cell submissions are rejected;
- complete-row, complete-column, orthogonal-region, and failure scoring;
- unique winners, tied winners, lower-rank ties, and solo completion;
- a complete eight-round game from normal seeded setup; and
- pointer and keyboard play on desktop and at 390 by 844 without horizontal
  scrolling.
