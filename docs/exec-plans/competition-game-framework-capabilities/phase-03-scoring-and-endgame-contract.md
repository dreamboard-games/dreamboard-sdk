# Phase 03: Scoring And Endgame Contract

Status: proposed.

## Goal

Make scoring and endgame outcomes a typed, inspectable framework concept rather
than prose embedded in game-local UI.

Competition games need clear final-score breakdowns, tie-breakers, and scenario
assertions. Agents should be able to implement and test "who won and why"
without inventing per-game score display structures.

## In Scope

- Typed score categories.
- Per-player score breakdowns.
- Optional score preview before final game end.
- End-condition declaration.
- Tie-breaker metadata.
- Final result rendering primitives.
- Scenario/test helpers for asserting final scores and tie-breakers.

## Out Of Scope

- Judge workflow.
- Ranking submissions across different games.
- Tournament management.
- Analytics dashboards.

## Likely Touchpoints

- `packages/sdk-types/src/contracts.ts`
- `packages/sdk/src/reducer/authoring/*`
- `packages/sdk/src/reducer/core/*`
- `packages/sdk/src/runtime/types/plugin-state.ts`
- `packages/sdk/src/runtime/primitives/game.tsx`
- `packages/sdk/src/ui/components/GameEndDisplay.tsx`
- `packages/sdk/src/testing/reducer-scenario/*`

## Public Surface Direction

The exact API should be refined during implementation, but it should support
both authored scoring declarations and runtime result display:

- `scoreCategories`.
- `endCondition`.
- `tieBreakers`.
- `Score.Root`.
- `Score.Row`.
- `Score.Breakdown`.
- `Score.Final`.
- Scenario matcher: final score and winner assertions.

## Acceptance Criteria

- A reference scenario asserts final score breakdown and winner.
- The runtime UI can render a final score without game-local score chrome.
- Tie-breaker metadata is available to both tests and UI.
- Existing `GameEndDisplay` either composes the new model or is clearly
  superseded by it with documented migration guidance.

## Suggested Verification

```bash
pnpm typecheck
pnpm test
pnpm ui:test --capability runtime-submit
pnpm reference-games:test:packed --required
```
