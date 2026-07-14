# Stormtrail

> **Authority status: approved gameplay and theme brief.** This document is the
> rules authority for the `hex-network-trading` reference game. When the
> implementation, tests, fixtures, or generated documentation disagree with
> this brief, this brief wins until it is deliberately amended.

## Teaching scope

Stormtrail is a compact, complete three-player network and trading game. It
teaches only:

- structures placed on a shared hex topology;
- seeded 2d6 production;
- an outcome-dependent turn graph;
- a multi-player discard barrier after rolling 7;
- private resource inventories and a seeded-random steal;
- immediate building and depot trades; and
- one pending bilateral offer that temporarily changes the eligible actor.

It must play from normal setup through repeated turns to an immediate winner.
It is not a one-roll or one-build mechanic sample.

## Theme brief

Three expedition crews are opening the hazardous Stormtrail frontier. Pine
forests provide timber, clay flats provide brick, and grain fields provide
provisions. Crews connect camps with trails and barter scarce supplies. Bandits
use the region's violent weather as cover: when a 7 is rolled, overloaded crews
lose supplies before the active crew drives the bandits to a new district and
recovers one stolen supply from a neighboring rival.

The folder and package identifier remains `hex-network-trading`. The public
display name is **Stormtrail**. UI copy and art should use the terrain,
resources, structures, and Bandits vocabulary in this document.

## Players, length, and objective

- Players: exactly 3.
- Objective: be the first player to have 4 camps on the map.
- Expected play time: 10–20 minutes once players know the actions.
- Outcome: the first fourth camp wins immediately; ties are impossible.

## Information visibility

The following information is public:

- the map, terrain, number tokens, Bandits location, trails, and camps;
- active player, phase, dice result, production, and turn history;
- each player's total number of supplies, but not their resource breakdown;
- each bilateral offer's participants and terms; and
- whether an offer was accepted, rejected, or canceled.

Each player's exact Timber, Brick, and Provisions inventory is private to that
player. Discarded resource types are private, although each discarded count is
public. When a supply is stolen, the acting player and victim see its type;
other players see only that one supply moved between those players.

## Components

- 1 fixed seven-hex map containing:
  - 2 Pine Forest hexes, which produce Timber;
  - 2 Clay Flats hexes, which produce Brick;
  - 2 Grain Fields hexes, which produce Provisions; and
  - 1 central Barrens hex, which never produces.
- 6 fixed number tokens: 4, 5, 6, 8, 9, and 10.
- 2 six-sided dice resolved through trusted seeded entropy.
- 1 Bandits piece.
- Per player: 4 camps and 10 trails.
- An unlimited shared supply of Timber, Brick, and Provisions.

Camp, trail, and resource supplies are not interchangeable. A player with no
remaining piece of the required kind cannot build that piece.

## Fixed map and topology

The map is one center hex surrounded by a six-hex ring. Starting at north and
continuing clockwise, the ring is fixed as follows:

| Hex ID            | Position   | Terrain      | Number | Produces   |
| ----------------- | ---------- | ------------ | -----: | ---------- |
| `northForest`     | north      | Pine Forest  |      5 | Timber     |
| `northEastClay`   | north-east | Clay Flats   |      6 | Brick      |
| `southEastFields` | south-east | Grain Fields |      8 | Provisions |
| `southForest`     | south      | Pine Forest  |      9 | Timber     |
| `southWestClay`   | south-west | Clay Flats   |      4 | Brick      |
| `northWestFields` | north-west | Grain Fields |     10 | Provisions |
| `centralBarrens`  | center     | Barrens      |   none | nothing    |

`centralBarrens` shares an edge with every ring hex. Every ring hex shares an
edge with the preceding and following ring hex in the table's clockwise order;
the first and last ring hex are also neighbors. No other pair of hexes shares
an edge.

Shared geometric corners and boundaries are single intersections and edges,
not duplicates owned by each hex. The resulting board has exactly 24 distinct
intersections and 30 distinct edges. Camps occupy intersections. Trails occupy
edges joining two intersections.

### Network legality

- At most one camp may occupy an intersection.
- At most one trail may occupy an edge.
- During normal play, a new camp must touch at least one trail owned by its
  builder.
- A new trail must connect to the builder's existing network at either endpoint
  through the builder's camp or trail.
- An opponent's camp interrupts trail continuity through its intersection. A
  player may connect a trail to that intersection from one side, but may not
  use a trail on the other side of the opponent's camp as a continuation of
  their network.

## Setup

1. Build the fixed map exactly as listed above. There is no terrain or number
   randomization.
2. Put the Bandits on `centralBarrens`.
3. Give each player 4 camps, 10 trails, and an empty private inventory.
4. Use seat order as player 1, player 2, player 3. There is no random
   first-player selection.
5. In seat order, each player places one starting camp-and-trail pair: player
   1, then player 2, then player 3.
6. On each setup placement, the player first places a legal unconnected camp,
   then places one trail on an empty edge touching that new camp. Setup camps
   ignore normal network connectivity.
7. Immediately after placing their starting trail, that player gains one
   supply from every producing hex adjacent to their camp. The
   Barrens grants nothing. A camp touching two Pine Forests, for example, gains
   2 Timber.
8. After all three pairs are placed, player 1 begins the first turn.

## Complete game arc

Every turn begins in `roll` and follows one of two paths.

### Non-seven path

1. The active player rolls both dice with `rollDice`.
2. If the total is not 7, production resolves automatically.
3. The active player enters `main` and may build, use the Supply Depot, offer a
   bilateral trade, or end the turn. They may take any number of legal main
   actions in any order.
4. `endTurn` passes the turn clockwise and puts the next player in `roll`.

### Seven path

1. The active player rolls both dice with `rollDice` and the total is 7.
2. Every player holding more than 7 total supplies enters the discard barrier
   and must submit `discardSupplies`. Required players may respond in any order.
3. The active player is blocked until every required discard commits. A player
   with 7 or fewer supplies does not receive a discard action.
4. After the barrier clears, the active player submits `moveBandits`, choosing
   a different hex and, when required, an eligible adjacent opponent.
5. The Bandits move and one supply is stolen through seeded entropy when the
   chosen hex has an eligible opponent.
6. The active player enters `main` and continues the same turn normally.

There is no production on a 7.

## Production

For a non-seven total, every unblocked producing hex with that number produces
simultaneously. For each camp adjacent to that hex, its owner gains one supply
of the hex's resource type. A player may gain multiple supplies from one roll
when multiple owned camps touch the producing hex.

The hex occupied by the Bandits produces nothing. Rolls of 2, 3, 11, or 12
produce nothing because the fixed map has no corresponding number token.

## Bandits and discard barrier

- A player with more than 7 total supplies discards exactly half their current
  total, rounded down. For example, totals of 8 and 9 both require 4 discards.
- A discard is a private resource-count map whose total must equal the required
  count and which the player can afford.
- Each required discard is committed independently. No player sees another
  player's resource breakdown while the barrier is open.
- `moveBandits` must choose a hex other than the Bandits' current hex. The
  Barrens is a legal destination.
- Eligible victims are opponents with at least one camp adjacent to the chosen
  hex and at least one supply in hand. The active player is never eligible.
- If at least one victim is eligible, `targetPlayerId` is required and must name
  one eligible victim. Multiple adjacent camps do not give a victim extra
  weight.
- If no victim is eligible, the Bandits move without a steal and
  `targetPlayerId` must be omitted.
- When stealing, select uniformly from the victim's individual supply cards by
  trusted seeded entropy, remove that supply from the victim, and give it to
  the active player.

## Costs and main actions

| Action          | Cost                                                   | Target and effect                                                                                                  |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Build Trail     | 1 Timber + 1 Brick                                     | Place one trail on one legal empty edge connected to the player's network.                                         |
| Build Camp      | 1 Timber + 1 Brick + 1 Provisions                      | Place one camp on one legal empty intersection connected to the player's trail network. Check victory immediately. |
| Supply Depot    | 3 supplies of one resource type                        | Return those supplies and gain 1 supply of either other resource type.                                             |
| Bilateral offer | The offered supplies are reserved by rule, not removed | Offer a non-empty resource map to one opponent in exchange for another non-empty resource map.                     |

Supply Depot trades must give exactly 3 of one resource and receive exactly 1
of a different resource. A player may perform multiple depot trades in a turn
if each is independently affordable.

## Bilateral trade semantics

- `offerTrade` targets exactly one opponent. Multi-target offers are not legal.
- `give` and `want` are non-empty maps of positive integer quantities. A
  resource type cannot appear in both maps.
- The offeror must own the entire `give` map when making the offer.
- Once offered, the game enters `pendingTrade`. The target may only accept or
  reject; there are no counteroffers.
- While the offer is pending, the active offeror is `blockedBy` the target. The
  third player has no gameplay action.
- `rejectTrade` cancels the offer and returns the same active player to `main`.
- `acceptTrade` is available only when the target currently owns the entire
  `want` map. Acceptance revalidates both players' full inventories and then
  transfers both maps atomically. A stale or invalid acceptance is rejected
  without a transfer or state change.
- Accepting or rejecting never ends the active player's turn.
- Only one trade may be pending at a time.

## Canonical interactions

These IDs are the public gameplay vocabulary exposed by action discovery,
inspection, tests, and UI bindings.

| Phase            | Interaction ID         | Actor                 | Inputs                                                                       | Availability and result                                                                                                                   |
| ---------------- | ---------------------- | --------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `setupCamp`      | `placeStartingCamp`    | Current setup player  | `intersectionId`                                                             | Available for every empty intersection. Place the camp and advance to `setupTrail` for the same player.                                   |
| `setupTrail`     | `placeStartingTrail`   | Current setup player  | `edgeId`                                                                     | Available for every empty edge touching the camp just placed. Place the trail, grant starting supplies, then advance setup in seat order. |
| `roll`           | `rollDice`             | Active player         | none                                                                         | The only player action before the roll. Consume seeded 2d6 entropy, then resolve production or enter the seven path.                      |
| `discardBarrier` | `discardSupplies`      | Every required player | `resources`                                                                  | Available concurrently only to players above 7 supplies. Commit exactly the required private discard.                                     |
| `moveBandits`    | `moveBandits`          | Active player         | `hexId`; `targetPlayerId` exactly when the target hex has an eligible victim | Move to a different hex and atomically perform any seeded-random steal, then enter `main`.                                                |
| `main`           | `buildTrail`           | Active player         | `edgeId`                                                                     | Available for affordable, legal edges while a trail piece remains. Pay and place atomically.                                              |
| `main`           | `buildCamp`            | Active player         | `intersectionId`                                                             | Available for affordable, legal intersections while a camp piece remains. Pay, place, and immediately check victory.                      |
| `main`           | `tradeWithSupplyDepot` | Active player         | `giveResource`, `receiveResource`                                            | Available for a 3:1 trade the player can afford, with two different resource types. Transfer atomically.                                  |
| `main`           | `offerTrade`           | Active player         | `targetPlayerId`, `give`, `want`                                             | Available for one legal, affordable offer to one opponent. Enter `pendingTrade`.                                                          |
| `pendingTrade`   | `acceptTrade`          | Target player         | none                                                                         | Available only when the target can pay `want`. Revalidate and exchange atomically, then return the offeror to `main`.                     |
| `pendingTrade`   | `rejectTrade`          | Target player         | none                                                                         | Always available to the target. Cancel and return the offeror to `main`.                                                                  |
| `main`           | `endTurn`              | Active player         | none                                                                         | End the turn and pass clockwise to the next player's `roll` phase.                                                                        |

## Automatic procedures and terminal ordering

The runtime, without a system player:

- resolves all non-seven production;
- computes the required discard actors and opens or skips the barrier;
- advances from the cleared barrier to the Bandits move;
- selects the stolen supply using seeded entropy after the player chooses a
  legal victim;
- resumes `main` after a trade response;
- rotates turns player 1 to player 2 to player 3 to player 1; and
- publishes the terminal outcome immediately after a fourth camp is placed.

On `buildCamp`, the system validates the target and cost, pays the cost, places
the camp, and then checks the camp count. If it is the builder's fourth camp,
the game ends before any further action, trade, or `endTurn`. No other procedure
can create a winner, and there is no end-of-round victory delay.

## Outcome

The first player to place their fourth camp wins immediately with rank 1. Both
other players lose and share rank 2. The game has no score, secondary points,
tiebreaker, round limit, or draw result.

## Deliberate exclusions

Stormtrail intentionally has no:

- fourth player or two-player variant;
- randomized terrain, number layout, ports, or asymmetric starting powers;
- a settlement distance rule between neighboring camps;
- towns, camp upgrades, production multipliers, or cities;
- charter or development cards;
- longest-network, largest-army, landmark, or hidden-point awards;
- player elimination, resource supply exhaustion, or hand-size maximum;
- maritime ratios other than the fixed 3:1 Supply Depot;
- open-ended negotiation, counteroffers, multi-target offers, or simultaneous
  competing acceptances; or
- victory threshold other than four camps.

These omissions are part of the approved design. They must not be restored to
make the game resemble an earlier implementation or a commercial ruleset.

## Acceptance obligations

The executable proof suite must include, at minimum:

1. A complete seeded game from normal fixed-map setup through repeated turns to
   a fourth-camp winner, without a checked-in mid-game base state.
2. Exact map identity, 24-intersection and 30-edge topology, one setup pair per
   player in seat order, occupied-intersection rejection, starting-trail
   adjacency, and starting supplies.
3. Production for each terrain type, multiple adjacent camps, non-producing
   totals, and suppression by the Bandits.
4. A 7 with no required discards and a 7 with multiple required players,
   including private discard choices, `blockedBy` state, exact half-rounded-down
   counts, and barrier completion in different response orders.
5. Legal and illegal Bandits destinations, no-victim movement, one and multiple
   eligible victims, target discovery without inventory leakage, and a
   reproducible seeded-random steal.
6. Trail connectivity, interruption by an opponent camp, camp connectivity,
   occupied targets, piece exhaustion, insufficient costs, and atomic payment.
7. Valid and invalid 3:1 Supply Depot trades, including repeated trades in one
   turn.
8. Bilateral rejection, acceptance, unaffordable and stale-acceptance
   rejection, active-player blocking, third-player ineligibility, and return to
   the same active player's `main` phase.
9. Immediate victory on the fourth camp, correct final ranks, and proof that no
   post-victory action or end-turn transition occurs.
10. Player projections proving private inventory composition, private discard
    types, participant-only stolen type, public hand counts, and public offer
    terms.
11. Action discovery showing only legal actors, targets, and dependent inputs
    in setup, roll, discard, Bandits, main, pending-trade, and terminal states.
