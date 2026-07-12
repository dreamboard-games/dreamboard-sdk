# Canonical Rule Brief Index

Status: superseded as a rules authority on 2026-07-12.

The authoritative gameplay and theme contract for each canonical reference game
now lives in that game's `rule.md`. This file remains as a compatibility index
for the execution-plan links that previously targeted four duplicated briefs.

Current implementations, tests, generated fixtures, screenshots, and historical
base states are candidate evidence. They do not override an approved `rule.md`.

## Shared Contract

Every canonical reference game must:

- be a complete, finishable game with a visible multi-turn arc;
- teach one primary SDK pattern and no more supporting mechanics than the game
  needs to remain coherent;
- use original prose, visual identity, content, and assets, except that Hearts
  remains the traditional game Hearts;
- define public, player-private, and engine-hidden information explicitly;
- define action actors, availability, inputs, automatic procedures, terminal
  precedence, scoring, rankings, and ties;
- use seeded Dreamboard entropy for gameplay randomness;
- support deterministic scenarios for required branches without treating a
  checked-in mid-game state as the rules authority; and
- keep protocol concerns such as reconnect and request idempotency out of the
  gameplay rules.

## Adapted Teaching Games

| Family                | Display name    | Authoritative brief                                                                                          |
| --------------------- | --------------- | ------------------------------------------------------------------------------------------------------------ |
| Trick-taking          | Hearts          | [`hearts/rule.md`](../../../examples/reference-games/hearts/rule.md)                                         |
| Simultaneous drafting | Lantern Market  | [`simultaneous-card-drafting/rule.md`](../../../examples/reference-games/simultaneous-card-drafting/rule.md) |
| Deck building         | Sketchbook      | [`deck-building-market/rule.md`](../../../examples/reference-games/deck-building-market/rule.md)             |
| Worker placement      | Mosaic Workshop | [`worker-placement-tableau/rule.md`](../../../examples/reference-games/worker-placement-tableau/rule.md)     |
| Hex network trading   | Stormtrail      | [`hex-network-trading/rule.md`](../../../examples/reference-games/hex-network-trading/rule.md)               |

## `roll-and-write-scorecard`: Cloudline Survey

Rules authority:
[`roll-and-write-scorecard/rule.md`](../../../examples/reference-games/roll-and-write-scorecard/rule.md).

The game proves a shared seeded roll resolved on ordinary per-player square
boards in seat order.

## `multiplayer-ranking-and-ties`: Harbor Fair

Rules authority:
[`multiplayer-ranking-and-ties/rule.md`](../../../examples/reference-games/multiplayer-ranking-and-ties/rule.md).

The game proves authoritative standings, score components, tie-break evidence,
competition ranks, true ties, and scoreless cancellation.

## `solo-countdown-puzzle`: Last Light

Rules authority:
[`solo-countdown-puzzle/rule.md`](../../../examples/reference-games/solo-countdown-puzzle/rule.md).

The game proves player decisions followed by deterministic environment phases
and system events without an opponent identity.

## `automa-river-rival`: River Guild

Rules authority:
[`automa-river-rival/rule.md`](../../../examples/reference-games/automa-river-rival/rule.md).

The game proves a deterministic rival held in ordinary state, with no fake
player seat or actor identity.
