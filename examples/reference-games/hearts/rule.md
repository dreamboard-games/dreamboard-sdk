# Hearts

> **Status: approved rules and theme authority.** This document is normative
> for the reference game. The current implementation, tests, fixtures, base
> states, and generated artifacts are not rules authority until they have been
> brought into conformance with this brief.

## Teaching scope

Hearts is the canonical compact example for a four-player trick-taking game.
It teaches private hands, a sealed simultaneous pass, card eligibility based on
the current trick, deterministic trick resolution, and a terminal outcome with
low-score winners.

This reference game is one complete hand, not a one-turn demonstration. Every
player passes three cards and then plays all 13 tricks before the outcome is
known.

## Theme brief

Keep the established name **Hearts** and the familiar standard-card vocabulary.
The presentation should feel like a clear, contemporary card table: traditional
suit symbols and ranks, strong red/black contrast, readable trick history, and
no added fictional setting that makes the rules harder to recognise.

## Players and objective

- Exactly 4 human players.
- Capture as few penalty points as possible over one 13-trick hand.
- The player or players with the lowest final score win.

## Information visibility

- A player's hand is visible only to that player.
- The three selected pass cards remain sealed until all four players commit.
  Other players may see that a player has committed, but never which cards were
  selected.
- Received pass cards become visible only to their recipient.
- Cards in the current trick, completed-trick counts, captured penalty counts,
  whose turn it is, and whether hearts are broken are public.
- The seeded deck order is hidden from every player.

## Components and setup

Use one standard 52-card deck: four suits (`clubs`, `diamonds`, `spades`, and
`hearts`) with ranks 2 through 10, Jack, Queen, King, and Ace. Rank order is 2
low through Ace high. There is no trump suit.

Setup is automatic:

1. Shuffle the deck using trusted seeded entropy.
2. Deal one card at a time in seat order until every player has 13 cards.
3. Enter the simultaneous passing phase.

The seed determines the shuffle completely. Ordinary gameplay actions never
provide or choose random results.

## Complete game arc

```text
seeded shuffle and deal
  -> all players pass three cards left
  -> play 13 complete tricks
  -> score the hand, including shoot-the-moon
  -> publish the terminal outcome
```

The game never starts another hand. A normal seeded playthrough must traverse
this entire arc from setup to outcome.

## Turn and phase sequence

### 1. Passing

Every player selects exactly three distinct cards from their own original hand
and commits once. A committed selection cannot be changed. When all four
players have committed, pass each selection atomically to the next player in
seat order, wrapping from the last seat to the first. A player cannot include a
newly received card in the same pass.

After the pass resolves, the player holding the 2 of Clubs leads the first
trick.

### 2. Playing tricks

The active player plays exactly one legal card face up. The first card sets the
lead suit. Play continues in seat order until all four players have played.

A legal play obeys these rules in priority order:

1. The first card of the first trick must be the 2 of Clubs.
2. A player who holds at least one card of the lead suit must follow suit.
3. On the first trick, a player who is void in clubs may not discard a heart or
   the Queen of Spades while they hold any non-penalty card. If every card they
   hold is a penalty card, any card is legal.
4. On later tricks, any card may be discarded when the player cannot follow
   suit.
5. A heart may not lead a trick until hearts are broken, unless the leader's
   hand contains only hearts.

Playing any heart breaks hearts for the remainder of the hand, including a
heart legally played on the first trick.

When the fourth card is played, the highest-ranked card of the lead suit wins
the trick. Cards of other suits cannot win. The trick winner captures all four
cards and leads the next trick. After the thirteenth trick, scoring is
automatic.

## Canonical interactions

Only the following player interactions are part of the game contract.

| Canonical action ID | Actor                              | Available when                                            | Input and effect                                                                                                                             |
| ------------------- | ---------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `passing.submit`    | Every player who has not committed | Passing is active and the actor holds 13 cards            | `cardIds`: exactly 3 distinct cards in the actor's hand. Seal the choice. After all four commits, rotate the selected cards left atomically. |
| `playing.playCard`  | The active trick player            | Playing is active and at least one legal hand card exists | `cardId`: one eligible card in the actor's hand. Play it to the current trick; after four plays, resolve the trick automatically.            |

Setup, pass resolution, trick resolution, scoring, and game-over publication are
automatic procedures. They are not player decisions and must not require fake
player actions.

## Automatic procedures and precedence

- The simultaneous pass resolves exactly once, only after all four sealed
  submissions exist.
- The 2-of-Clubs holder becomes active only after the pass has resolved.
- A completed trick resolves before another player action becomes available.
- The trick winner, captured heart count, Queen-of-Spades owner, hearts-broken
  flag, and next leader update atomically.
- Scoring starts immediately after trick 13 and takes precedence over starting
  another trick or hand.
- Legality is validated against authoritative state again at submission time;
  a stale client cannot play an ineligible card.

## Scoring and outcome

Normally, each captured heart is worth 1 penalty point and the captured Queen
of Spades is worth 13 penalty points. All other cards are worth 0.

If one player captures all 13 hearts and the Queen of Spades, that player
shoots the moon. The shooter scores 0 and each other player scores 26. Do not
first assign the ordinary 26 points to the shooter.

Rank players by ascending score. Every player tied for the lowest score has
rank 1 and a `draw` result; a sole lowest scorer has rank 1 and a `win` result.
All other players receive `loss`. Exact lower-place ties share the same
competition rank, so a ranking may be `1, 2, 2, 4`.

## Deliberate exclusions

- No cumulative match to 100 points and no repeated hands.
- No right, across, or hold passing rounds; the only pass direction is left.
- No 3-player, 5-player, partnership, or bot rules.
- No Jack-of-Diamonds bonus, spot-heart values, or other scoring variants.
- No alternative moon choice such as subtracting 26 from the shooter's score.
- No checked-in deal or mid-hand base state as the normal setup path.

## Acceptance obligations

Conformance must prove all of the following from this brief:

- A seeded normal setup deals 52 unique cards with 13 private cards per player.
- Four sealed three-card submissions rotate left without leaking card identity.
- Only the 2 of Clubs can open the first trick.
- Follow-suit, first-trick penalty, and hearts-not-broken restrictions expose
  exactly the legal hand cards and reject stale illegal submissions.
- Off-suit play, hearts breaking, Ace-high trick comparison, and next-leader
  rotation resolve correctly.
- A full normal playthrough completes all 13 tricks and publishes an outcome.
- Ordinary scoring, shoot-the-moon scoring, a sole winner, and tied winners are
  each covered by executable scenarios.
- Spectator and opponent projections never reveal a private hand or sealed pass
  selection.
- Scenario setup may isolate rare branches, but scenarios, fixtures, snapshots,
  and base states must never redefine these rules.
