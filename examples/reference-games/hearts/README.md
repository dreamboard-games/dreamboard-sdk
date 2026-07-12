# Hearts

Hearts is the canonical trick-taking reference game for private hands, sealed
simultaneous passing, follow-suit legality, and shared trick resolution.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The reducer,
tests, generated fixtures, and screenshots must conform to it; they do not amend
it. During the rule-first rewrite, existing implementation behavior may still
reflect the superseded multi-hand game.

## What To Learn Here

- Project a private hand without exposing it to other seats.
- Collect one sealed three-card selection from every player.
- Derive playable cards from opening-lead, follow-suit, and penalty rules.
- Resolve a complete trick and the final one-hand outcome in the reducer.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/passing.ts`
- `app/phases/playing.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/smoke-initial-hand.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/hearts verify
```
