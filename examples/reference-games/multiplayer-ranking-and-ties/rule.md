# Harbor Fair

Status: **approved and authoritative**.

This file is the gameplay and theme authority for Harbor Fair. The current
implementation, generated fixtures, snapshots, and tests describe legacy
behavior until they have been brought into conformance with this brief. A test
that disagrees with this file must be corrected; it does not amend the rules.

## Teaching scope

Harbor Fair teaches authoritative multiplayer outcomes: numeric score
breakdowns, ordered tie-break evidence, true ties, competition ranking, and a
valid scoreless terminal result. Drafting is intentionally open and small so
the outcome model, not card-game infrastructure, remains the lesson.

The game is a complete six-round public-market draft. A representative product
demo should show festival rows accumulating, at least one guild set becoming
visible, and either final ranked standings or the fair's dramatic cancellation.
A single draft is an interaction scenario, not the full experience.

## Theme brief

Players are organizers assembling rows of food, craft, and music stalls for a
harbor festival. Prestige rewards attractive stalls, complete guild sets make
the fair feel balanced, and coins represent commercial support. Storms revealed
while the harbor is preparing can cancel the event before judging.

The tone should be communal and celebratory rather than cutthroat. Use public
market awnings, harbor flags, changing weather, and visibly growing festival
rows. Storm cards are interruptions resolved while refilling; they are never
stalls and never occupy market spaces.

Canonical vocabulary:

- **festival deck**: the seeded deck of stall and storm cards;
- **market**: four face-up stall cards shared by everyone;
- **festival row**: one player's public collection of drafted stalls;
- **guild set**: one food, one craft, and one music stall; and
- **cancellation**: the scoreless outcome caused by the second storm.

## Players and objective

Harbor Fair supports two to four human players in fixed session seat order. In
a normal game, every player drafts one stall in each of six rounds and tries to
finish with the strongest ranked festival.

If the second storm appears at any refill boundary, the fair is cancelled
immediately. Cancellation is a complete, valid ending; it is not an error and
does not use numeric scores.

## Information visibility

All gameplay information is public:

- the four-card market;
- every festival row;
- the current round, active player, and number of storms revealed;
- the discard/history of revealed storms; and
- final scoring evidence and standings.

The order of the unrevealed festival deck is hidden. Players have no hands and
make no secret choices.

## Components and setup

The festival deck contains 30 stall cards and two storm cards. Each stall has a
stable ID, guild, prestige value, and coin value. For each guild—`food`,
`craft`, and `music`—create this ten-card recipe:

| Prestige | Coins | Cards per guild |
| -------- | ----- | --------------- |
| 1        | 1     | 2               |
| 2        | 0     | 4               |
| 2        | 1     | 2               |
| 3        | 0     | 2               |

Ordinary setup shuffles all 32 cards through Dreamboard's seeded random source,
sets the round to 1, makes the first session seat active, and performs an
initial market refill until four stall cards are face up.

Every storm encountered during any refill is revealed, recorded, and removed
from the deck without occupying a market slot. If the second storm appears
during the **initial setup refill**, stop immediately with
`FESTIVAL_CANCELLED`; no player drafts a card.

Scenario tests may supply an explicit deck order to isolate a branch. The
normal game always uses the seeded shuffle.

## Complete game arc

For each of six rounds:

1. The active player chooses one of the four face-up stalls.
2. Move it to that player's public festival row.
3. Refill the vacated market space, resolving every storm encountered.
4. If the refill reveals the second storm, cancel immediately.
5. Otherwise activate the next player in seat order.
6. After the last player completes a non-cancelling draft, either advance to
   the next round or, after round 6, calculate standings.

The refill belongs to the draft that caused it. It always resolves before
advancing the seat or calculating normal final standings. Therefore, if the
last player of round 6 drafts and that **final refill** reveals the second
storm, cancellation takes precedence over `SIX_ROUNDS_COMPLETE`. No partial or
provisional normal score survives cancellation.

## Phases and actions

| Phase      | Actor               | Available action | Input                                  | Availability and effect                                                                                                                       |
| ---------- | ------------------- | ---------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup`    | Automatic procedure | None             | None                                   | Seed-shuffle the deck and refill the initial market, resolving storms before play.                                                            |
| `drafting` | Active human only   | `draftStall`     | `stallId` naming a current market card | Move that stall to the actor's festival row, refill its market space, then cancel, advance the seat, advance the round, or score as required. |
| `gameOver` | None                | None             | None                                   | Expose the authoritative normal or cancellation outcome.                                                                                      |

`draftStall` is available only to the active player and only for a stall
currently in the market. The card must be revalidated on submission. There is
no pass action, reservation, blind draw, or player-authored storm action.

## Refill and cancellation procedure

Refill one empty market position at a time:

1. Draw the next festival-deck card.
2. If it is a stall, place it in the empty position and stop filling that
   position.
3. If it is the first storm, increment `stormsRevealed`, publish the storm, and
   continue drawing for the same position.
4. If it is the second storm, increment `stormsRevealed`, publish the storm,
   and end immediately with `FESTIVAL_CANCELLED`.

This procedure applies identically during setup and after every draft,
including the last draft in round 6. No later automatic transition may
overwrite a committed cancellation outcome.

## Normal scoring and ranking

After a non-cancelled sixth round, calculate for each player:

- `stall-prestige`: the sum of printed prestige;
- `guild-set-points`: 4 points for each complete food/craft/music set; and
- `coin-bonus`: 1 point per printed coin.

One stall can contribute to at most one guild set. The number of complete sets
is the minimum of that player's three guild counts. The three score components
sum to the authoritative numeric score.

Rank players by this ordered tuple:

1. total score, descending;
2. complete guild sets, descending; and
3. total coins, descending.

Players with identical values for all three fields are tied. Assign
**competition ranks**, not dense ranks: the rank is one plus the number of
players ahead of that row. Example rank sequences include `1, 2, 2, 4` and
`1, 1, 3, 4`.

- A sole rank-1 player receives `win`.
- Players tied at rank 1 each receive `draw`.
- Every lower-ranked player receives `loss`, including players tied with one
  another below first place.

The terminal reason is `SIX_ROUNDS_COMPLETE`. Every standing includes total
score, the three score components, and ordered tie-break evidence for
`complete-guild-sets` and `coins`.

## Cancellation outcome

On the second storm, the terminal reason is `FESTIVAL_CANCELLED` and every
human receives rank 1 with result `draw`.

Cancellation standings omit all of the following:

- `score`;
- `scoreBreakdown`; and
- `tieBreaks`.

Festival rows may remain visible as historical state, but the UI must not infer
or present provisional winners from them.

## Deliberate exclusions

Harbor Fair deliberately does not include:

- private hands, simultaneous selection, bidding, trading, or card powers;
- player control over refills or storms;
- partial scoring or tie-breaks after cancellation;
- dense ranking such as `1, 2, 2, 3`;
- UI-side sorting or winner inference;
- a generic SDK scoring DSL or framework ranking engine;
- production card volume, asymmetric organizers, or campaign progression; or
- checked-in shuffled decks or mid-game base states as rules authority.

The reducer owns refill precedence, score components, tie-break comparison,
competition ranks, and final result labels.

## Acceptance obligations

Conformance must prove:

- seeded shuffle reproducibility and a four-stall initial market;
- initial refill skips the first storm and cancels on the second;
- only the active player can draft a current market stall;
- market refill and seat-order progression after every accepted draft;
- a complete six-round game with two, three, and four players;
- final-refill cancellation takes precedence over normal six-round scoring;
- unique winner by score;
- equal score separated first by complete sets and then by coins;
- true first-place ties and non-first ties;
- competition rank gaps such as `1, 2, 2, 4`;
- score components sum to every normal standing's score;
- cancellation produces only rank-1 scoreless draws;
- strict rejection of missing, duplicate, or unknown player standings;
- pointer and keyboard play on desktop and at 390 by 844.
