# Frontier Trails

## Overview

- Players: 3–4
- Objective: be the first player to reach 10 Renown
- Duration: 60–120 minutes

## Components

- 1 shared hex frontier board (19 terrain hexes)
- 5 terrain types: timberGrove, clayPit, grainField, flaxMeadow, ironHills (plus badlands)
- Resource types: timber, clay, grain, cloth, iron
- 25 charter cards: scout (14), shortcut (2), survey grant (2), claim marker (2), landmark (5)
- Per player: 15 trails, 5 camps, 4 towns
- 2 six-sided dice
- 1 storm piece (starts on the badlands)

## Setup

1. Assemble the frontier: 19 terrain hexes in the standard Frontier Trails layout.
2. Place number tokens on non-badlands hexes.
3. Place the storm on the badlands hex.
4. Shuffle the charter card deck.
5. Initial placement (snake order): each player places 2 camps and 2 trails.
   - After placing their second camp, each player collects 1 resource for each adjacent terrain hex.
6. Player 1 goes first.

## Gameplay

### Phase: setup

Players take turns in snake order to place starting camps and trails.
Each player places camp then trail twice (1→2→3→4→4→3→2→1).

### Phase: playerTurn

On each turn the active player:

1. **Roll dice** (`rollDice`): roll 2d6.
   - Sum of 7 → storm sequence.
   - Otherwise → produce resources from matching hexes.
2. **Take actions** (any order, optional):
   - `buildTrail`: spend 1 timber + 1 clay.
   - `buildCamp`: spend 1 timber + 1 clay + 1 grain + 1 cloth.
   - `upgradeToTown`: spend 2 grain + 3 iron; replaces a camp.
   - `buyCharterCard`: spend 1 grain + 1 cloth + 1 iron.
   - `playCharterCard`: play one charter card (scout, shortcut, survey grant, claim marker, landmark).
   - `tradeWithBank`: 4:1 exchange (or 3:1 / 2:1 with market posts).
3. **End turn** (`endTurn`).

### Storm sequence (on 7)

1. Players with > 7 cards discard half.
2. Active player moves storm (`moveStorm`).
3. Active player seizes from an adjacent opponent (`seizeSupply`).

## Scoring

| Item                           | Renown |
| ------------------------------ | ------ |
| Camp                           | 1      |
| Town                           | 2      |
| Trade Network (≥ 5 continuous) | 2      |
| Explorer Guild (≥ 3 scouts)    | 2      |
| Landmark charter card          | 1 each |

## Winning conditions

- First player to reach 10 Renown at the end of their turn wins.

## Special rules

- Distance rule: camps must be at least 2 edges apart from any other camp or town.
- Trails may not pass through an opponent's camp or town.
- Trade Network and Explorer Guild can transfer between players.
- Landmark charter cards are revealed only when claiming victory.
