# Multiplayer Ranking And Ties

Harbor Fair is a compact open-information drafting game that teaches canonical
multiplayer standings. It proves unique winners, true ties, tie-break evidence,
rank gaps, and scoreless cancellation without adding a larger game system.

## What This Teaches

- How to publish a `GameOutcome` with ranked standings for every player.
- How to keep tie-break evidence explicit in each standing row.
- How to model a public market draft in seat order.
- How to end without scores when a cancellation branch fires.

## When To Copy This Pattern

Copy this workspace when a game needs reducer-owned standings rather than UI
winner inference. It is intentionally small: draft one card, refill the market,
advance the active seat, and score only after the sixth round unless the second
storm cancels the fair.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/game.ts`
- `app/game-contract.ts`
- `app/phases/draft-flow.ts`
- `ui/App.tsx`
- `test/scenarios/outcomes.scenario.ts`

## Rules Summary

Harbor Fair supports two to four human players. The deck contains 30 stall
cards and two storm cards. Each stall belongs to food, craft, or music. The
market holds four face-up stall cards. Players draft one stall in seat order,
add it to their public festival row, and refill the market. Storm cards
revealed during refill do not occupy market slots. The second storm immediately
ends the game with reason `FESTIVAL_CANCELLED`.

If the fair is not cancelled, the game scores after six rounds. Each player
scores stall prestige, four points for each complete food/craft/music set, and
one point per coin. Ties break by complete sets, then coins. Players still tied
after both tie-breaks share a rank.

## Authoring Model

The root workspace is the editable source. `manifest.ts` declares the Harbor
Fair deck, market, festival-row, and storm zones. `app/game-contract.ts` owns
the reducer schemas. The pure reducer behavior lives in
`app/phases/draft-flow.ts`, and `app/phases/drafting.ts` adapts it to the SDK
interaction surface.

Legacy `src/` fixtures remain only for the coordinated integration pass. New
behavior authority is under `app/` and `test/`.

## Reducer Flow

The setup phase creates the initial market and transitions to `drafting`. The
drafting phase exposes `draftStall`, validates that the active seat selected a
face-up stall, updates festival rows, refills the market, advances the active
seat, and writes the terminal outcome when scoring or cancellation completes.

## UI Flow

`ui/App.tsx` renders a focused teaching view: market cards, turn state, festival
rows, and an outcome table. `ui/interaction-routes.tsx` keeps the draft action
boundary visible for Workbench and agent readers.

## Scenario Coverage

Behavior scenarios cover:

- draft flow and validation
- unique winner
- true first-place tie
- complete-set tie-break evidence
- coin tie-break evidence
- non-first tied rank gap
- scoreless cancellation

UI scenarios render the root UI and assert that the market, draft action, and
tie-break table remain present.

## Workbench Proof

The V2 manifest names behavior scenarios and UI scenarios separately so the
fixture compiler can derive Workbench proof from the root workspace. Generated
fixture outputs are intentionally not hand-edited here.

## Verification

Run from this directory:

```sh
pnpm typecheck
pnpm test
pnpm test:ui
pnpm verify
```
