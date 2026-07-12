# Mosaic Workshop

> **Authority status: approved gameplay and theme brief.** This document is the
> rules authority for the `worker-placement-tableau` reference game. When the
> implementation, tests, fixtures, or generated documentation disagree with
> this brief, this brief wins until it is deliberately amended.

## Teaching scope

Mosaic Workshop is a compact, complete worker-placement game. It teaches only:

- shared action-space blocking;
- a master worker with one precise exception to ordinary placement;
- dependent action inputs;
- resource conversion;
- crafting onto a personal spatial tableau; and
- deterministic multi-round cleanup and scoring.

It must play from normal setup through four seasons to an authoritative outcome.
It is not a one-turn mechanic sample.

## Theme brief

Two workshops have four seasons to complete a civic mosaic. Their artisans
collect timber for frames, shape stone reliefs, earn coin from patrons, and fit
finished pieces into a six-cell display. The theme should feel like a warm,
busy public workshop: visible supplies, crowded shared work sites, and a mosaic
that becomes more complete every season.

The folder and package identifier remains `worker-placement-tableau`. The
public display name is **Mosaic Workshop**. UI copy and art should use the terms
in this document rather than the former guild, apprentice-card, order-card, or
wake-up-track vocabulary.

## Players, length, and objective

- Players: exactly 2.
- Length: exactly 4 seasons.
- Objective: finish with the most Prestige.
- Expected play time: 8–15 minutes once both players know the actions.

## Information visibility

All gameplay information is public:

- each player's wood, stone, and coin;
- each worker's type and location;
- every item and cell on both workshop tableaux;
- the current season, active player, passed players, and first player; and
- the running printed value of crafted items.

Final adjacency bonuses and outcomes are computed authoritatively after season 4. There are no hands, decks, secret objectives, or hidden random values.

## Components

- 1 fixed action board with five spaces:
  `timberYard`, `stoneYard`, `patronSquare`, `exchangeHouse`, and
  `mosaicBench`.
- 2 personal workshop tableaux, each a 2-row by 3-column orthogonal grid.
- Per player:
  - 2 ordinary workers: `ordinary-1` and `ordinary-2`;
  - 1 master worker: `master`;
  - a public inventory of `wood`, `stone`, and `coin`.
- An unlimited shared supply of resource tokens and the three item types below.
- 1 season marker with positions 1 through 4.
- 1 first-player marker.

Resource and item supplies are not intended to run out. A player's tableau is
the only limit on the number of items they may craft.

### Items

Each item occupies exactly one tableau cell.

| Item ID        | Display name  | Cost                      | Printed Prestige | Placement rule                                                                                      |
| -------------- | ------------- | ------------------------- | ---------------: | --------------------------------------------------------------------------------------------------- |
| `timberFrame`  | Timber Frame  | 2 wood                    |                2 | Any empty cell                                                                                      |
| `stoneRelief`  | Stone Relief  | 2 stone + 1 coin          |                3 | Any empty cell                                                                                      |
| `joinedMosaic` | Joined Mosaic | 1 wood + 1 stone + 2 coin |                4 | The chosen cell must be orthogonally adjacent to at least one item already on that player's tableau |

Diagonal cells are never adjacent. A Joined Mosaic cannot be the first item on
an empty tableau.

## Setup

1. Seat the players as player 1 and player 2. No random first-player selection
   is performed.
2. Give each player their empty 2x3 tableau, two ordinary workers, one master,
   1 wood, 1 stone, and 2 coin.
3. Put all five action spaces in play. The board never changes during a game.
4. Put the season marker on season 1.
5. Player 1 receives the first-player marker for season 1 and takes the first
   placement.

There is no setup entropy.

## Complete game arc

Every season has a placement phase followed by automatic cleanup:

1. The season's first player takes a placement turn.
2. Players alternate placement turns while both remain active.
3. On a placement turn, a player either places one unused worker and resolves
   that action space, or passes for the rest of the season.
4. A player who has placed all three workers is finished for the season and is
   skipped. If one player has passed or finished, the other continues taking
   turns until they also pass or finish.
5. When both players have passed or placed all three workers, cleanup returns
   every worker and clears both pass markers.
6. After seasons 1, 2, and 3, advance the season marker, give the first-player
   marker to the other player, and begin the next placement phase.
7. After season 4 cleanup, score the game and publish the outcome.

Player 1 is first in seasons 1 and 3. Player 2 is first in seasons 2 and 4.

## Worker placement rules

- Each worker may be placed at most once per season.
- An ordinary worker may be placed only on an empty action space.
- A master may be placed on an empty action space or on a space occupied by
  exactly one ordinary worker, regardless of who owns that ordinary worker.
- A master may not share with another master.
- An ordinary worker may not be added to a space already occupied by a master.
- No action space may ever contain more than two workers.
- Placing the master does not displace or reactivate the ordinary worker already
  there. Both placements resolve the space once at their respective times.
- A placement is available only when the chosen worker, space, and complete
  space-specific inputs are legal. Resources are paid and effects resolve as
  one atomic action.

## Action spaces

| Space ID        | Display name   | Immediate effect                                                                           |
| --------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `timberYard`    | Timber Yard    | Gain 2 wood.                                                                               |
| `stoneYard`     | Stone Yard     | Gain 2 stone.                                                                              |
| `patronSquare`  | Patron Square  | Gain 3 coin.                                                                               |
| `exchangeHouse` | Exchange House | Return either 1 or 2 resources, then gain the same number of resources in a different mix. |
| `mosaicBench`   | Mosaic Bench   | Pay for and craft one legal item into one legal empty cell.                                |

For Exchange House:

- wood, stone, and coin are all valid resources;
- the returned and received totals must be equal and must be either 1 or 2;
- all quantities must be non-negative integers;
- a resource type cannot appear in both the returned and received maps; and
- the received map must therefore be materially different from the returned
  map.

Examples: 2 wood may become 1 stone and 1 coin; 1 coin may become 1 wood. A
no-op exchange such as 1 wood for 1 wood is illegal.

For Mosaic Bench, the player chooses the item type and destination cell as part
of the placement. The action is unavailable when the player cannot afford any
legal item-cell combination.

## Canonical interactions

These IDs are the public gameplay vocabulary exposed by action discovery,
inspection, tests, and UI bindings.

| Phase       | Interaction ID  | Actor          | Inputs                                                                                                               | Availability and result                                                                                                                                                                              |
| ----------- | --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement` | `placeWorker`   | Current player | `workerId`, `spaceId`; plus `give` and `receive` for `exchangeHouse`; plus `itemType` and `cellId` for `mosaicBench` | Available when the worker is unused, the occupancy rule is satisfied, and every dependent input is legal. Place the worker, pay any cost, resolve the space, then advance to the next active player. |
| `placement` | `passPlacement` | Current player | none                                                                                                                 | Always available while the player still participates in the season. Mark that player passed for the remainder of the season, then advance or clean up.                                               |

Action discovery may present the dependent inputs progressively, but submitting
`placeWorker` is one atomic gameplay interaction. There are no separate
`chooseExchange`, `chooseItem`, or `chooseCell` rules actions.

## Automatic procedures

The runtime performs these procedures without inventing a system player:

- skip a player who passed or has no unused workers;
- begin cleanup as soon as both players are passed or finished;
- return all six workers during cleanup;
- clear pass state;
- alternate the first-player marker;
- advance the season marker; and
- after season 4 cleanup, compute scores and publish the outcome.

No player action is available during cleanup or scoring.

## Scoring and outcome

After season 4 cleanup, each player scores:

1. the printed Prestige of every crafted item; plus
2. 1 Harmony Prestige for every unique orthogonally adjacent pair of crafted
   items with different item IDs.

Count each shared edge once. Same-type neighbors, diagonal neighbors, empty
cells, workers, and leftover resources score nothing.

The player with more Prestige wins and receives rank 1; the other receives rank 2. If both totals are equal, both players receive rank 1 and a draw result.
There are no tiebreakers.

## Deliberate exclusions

Mosaic Workshop intentionally has no:

- wake-up or turn-order selection track;
- variable or randomly selected action spaces;
- worker growth, temporary workers, worker recall, or repeated workers;
- cards, hands, orders, contracts, or persistent powers;
- hidden information or random setup;
- mid-season first-player manipulation;
- additional crafting spaces or discounted costs; or
- scoring from leftover resources, collections, orders, or private goals.

These omissions are part of the approved design. They must not be restored to
make the game resemble an earlier implementation.

## Acceptance obligations

The executable proof suite must include, at minimum:

1. A complete four-season game from normal setup to win and a separate complete
   game ending in a draw, without a checked-in mid-game base state.
2. Ordinary-worker blocking, a legal master share with one ordinary worker,
   and rejection of ordinary-on-occupied, master-on-master, and third-worker
   placements.
3. Permanent passing, skipping a finished player, automatic cleanup, worker
   return, and first-player alternation across all four seasons.
4. Every action space resolving once for an ordinary worker and once for a
   legally sharing master.
5. Valid one- and two-resource exchanges plus rejection of unaffordable,
   unequal, empty, and no-op exchanges.
6. Successful crafting of all three item types, insufficient-cost rejection,
   occupied-cell rejection, Joined Mosaic rejection without a neighbor, and a
   legal Joined Mosaic beside an existing item.
7. Exact end scoring, including unique-edge Harmony scoring, same-type and
   diagonal non-scoring, leftover-resource non-scoring, ranks, and draw output.
8. Action discovery showing only the current actor's legal workers, spaces,
   exchange values, items, and cells without relying on rejection to discover
   normal legal play.
