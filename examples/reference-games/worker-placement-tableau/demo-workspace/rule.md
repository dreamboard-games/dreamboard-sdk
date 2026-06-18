# Artisans' Guild

## Overview

- Players: 2
- Objective: earn the most renown (VP) over 6 seasons
- Duration: 30–45 minutes

A worker-placement game where two master crafters compete to build the most renowned workshop. Workers occupy action spaces (blocking opponents), gather materials, craft items onto a personal workshop mat, and fulfill orders for the guild.

## Components

- 1 shared **action board** with 9 spaces (6 fixed + 3 chosen at setup from a pool of 6)
- 1 **wake-up track** with 4 slots, each granting a different start-of-season bonus
- 2 personal **workshop mats**, each a 4×3 grid of cells
- **Workers**: each player starts with 2 apprentices + 1 master; can grow to 4 apprentices total
- **Resources**: wood, stone, coin
- **Cards**: 10 Order cards (contracts) + 10 Apprentice cards (one-shot or persistent effects)
- **Item tiles**: crafted items placed onto the workshop mat
- **Season marker**: tracks the current round (1–6)

## Setup

1. Place the action board between players. Reveal 3 random **Variable Spaces** from the pool of 6; combine with the 6 fixed spaces to form this game's 9-space layout. (The variable spaces stay fixed for the entire game — only chosen at setup.)
2. Each player takes a workshop mat (empty 4×3 grid), 2 apprentices, 1 master, and a starting hand of 2 coin + 1 wood.
3. Shuffle the Order and Apprentice decks separately. Deal 1 Order card and 1 Apprentice card to each player.
4. Randomly determine who places first on the wake-up track for season 1.
5. Set the season marker to 1.

## Gameplay

Each of the 6 seasons proceeds through three phases:

### Phase: wake-up

Players take turns (last season's turn order, reversed) selecting a slot on the wake-up track. Each slot grants its bonus immediately:

| Slot | Turn order | Bonus |
| ---- | ---------- | ----- |
| 1    | First      | none |
| 2    | First      | +1 coin |
| 3    | Second     | draw 1 Apprentice card |
| 4    | Second     | +1 wood, +1 stone |

Only one player per slot. The lower-numbered slot acts first this season.

### Phase: placement

Players alternate placing one worker at a time onto an action space. Each space holds **one worker only**. A **master** worker may place onto an already-occupied space, ignoring blocking (once placed, the master is committed like any other worker). Each space resolves its effect immediately when a worker is placed.

Placement continues until both players have placed all their workers, or pass. Passed workers return for next season.

### Phase: cleanup

All workers return to their players. Advance the season marker. After season 6, proceed to scoring.

## Action spaces

### Fixed (always in play)

1. **Lumberyard** — gain 2 wood.
2. **Quarry** — gain 1 stone.
3. **Market** — gain 3 coin, or sell 1 stone for 2 coin.
4. **Guild Hall** — draw 1 Order card and 1 Apprentice card; keep both.
5. **Training Hall** — pay 3 coin to add 1 new apprentice to your roster (max 4 apprentices). The new worker is available next season.
6. **Workshop** — craft 1 item onto an empty cell of your mat. Pay the item's resource cost. Items grant VP at game end and may have placement adjacency requirements (e.g. *Workbench must touch another item*).

### Variable pool (3 drawn at setup)

- **Mason's Lodge** — gain 1 wood + 1 stone.
- **Trade Post** — exchange any 2 resources for any 2 resources (no like-for-like).
- **Patron's Estate** — gain 2 coin and draw 1 Order card.
- **Forge** — craft an item at -1 stone cost (minimum 0).
- **Library** — draw 2 Apprentice cards, discard 1.
- **Apothecary** — return one of your already-placed workers from any space; that space is now empty.

## Cards

### Order cards (10 total)

Each order card lists requirements your workshop mat must satisfy. Once met, you may fulfill the order at any point on your turn (no worker required): discard the card and immediately gain its reward.

| # | Name | Requirement | Reward |
| - | ---- | ----------- | ------ |
| 1 | Furniture Commission | 2 wood items on mat | 3 VP |
| 2 | Stone Sculpture | 2 stone items on mat | 3 VP |
| 3 | Master's Display | 1 Showroom on mat | 4 VP + 2 coin |
| 4 | Forge Order | 1 Anvil + 1 Kiln on mat | 5 VP |
| 5 | Weaver's Request | 2 Looms on mat | 4 VP |
| 6 | Apprentice Trial | 3 items of any kind on mat | 2 VP + 2 coin |
| 7 | Mixed Set | 1 wood item + 1 stone item on mat | 3 VP + 1 coin |
| 8 | Architect's Plan | 4 items in a 2×2 square | 6 VP |
| 9 | Row of Pride | 3 items in a single row | 5 VP |
| 10 | Grand Atelier | 6 or more cells filled on mat | 7 VP |

Item type (wood/stone) is determined by the item's primary resource cost. Items requiring both (e.g. Kiln) count as both types for orders.

### Apprentice cards (10 total)

**One-shot** (6 cards) — play on your turn for an immediate effect, then discard:

| # | Name | Effect |
| - | ---- | ------ |
| 1 | Quick Delivery | Gain 3 coin. |
| 2 | Lumber Stash | Gain 3 wood. |
| 3 | Stone Cache | Gain 2 stone. |
| 4 | Spare Hands | Place 1 extra apprentice this season; it returns at season end. |
| 5 | Inspiration | Craft 1 item this turn at -1 wood cost (minimum 0). Does not require a Workshop worker. |
| 6 | Reassign | Recall one of your placed workers; you may immediately re-place it on a different empty space. |

**Persistent** (4 cards) — play face-up in front of you for the rest of the game:

| # | Name | Effect |
| - | ---- | ------ |
| 7 | Foreman | Lumberyard gives you +1 wood whenever you place a worker there. |
| 8 | Tireless Master | Your master may be placed twice per season: once normally, then recalled and re-placed when your next turn begins. |
| 9 | Guild Scholar | When you place on the Guild Hall, draw 1 extra Apprentice card. |
| 10 | Patron's Favor | Gain 1 coin at the end of each season. |

## Player mat: items

Items occupy single cells on the 4×3 workshop mat. Common items (illustrative):

| Item       | Cost            | VP  | Placement rule              |
| ---------- | --------------- | --- | --------------------------- |
| Workbench  | 1 wood          | 1   | must touch another item     |
| Anvil      | 1 stone         | 2   | none                        |
| Loom       | 2 wood          | 2   | none                        |
| Kiln       | 1 wood + 1 stone | 3   | corner cells only          |
| Showroom   | 2 stone + 2 coin | 4   | must touch ≥ 2 other items |

(Exact item set finalized during implementation.)

## End-game scoring

After season 6:

- **Items**: sum the VP printed on each item on your mat.
- **Fulfilled orders**: VP already collected during play.
- **Adjacency bonus**: +1 VP for each pair of orthogonally adjacent items sharing a "type" (e.g. two wood items).
- **Coin**: +1 VP per 5 coin remaining.
- **Unused resources**: 0 VP (wood/stone do not score).

Highest VP wins. Tiebreaker: most items on mat, then most coin.

## SDK features showcased

This example is designed as a canonical reference for:

- **Action-space blocking** (one worker per space)
- **Worker types** with conditional blocking rules (master overrides)
- **Dynamic turn order** via player choice (wake-up track)
- **Two card types** with distinct lifecycles (one-shot vs persistent)
- **Buying new workers** mid-game (roster as mutable state)
- **Per-player spatial mats** with placement adjacency rules
- **Setup-time board variability** (variable spaces fixed at setup)
- **Multi-source end-game scoring**
