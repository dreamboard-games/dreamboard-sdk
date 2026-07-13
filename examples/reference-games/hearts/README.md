# Hearts

Hearts is the canonical trick-taking reference game for private hands, sealed
simultaneous passing, follow-suit legality, and shared trick resolution.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. The reducer,
tests, local generated fixtures, and screenshots are evidence; they do not amend
it. The implementation plays exactly one complete 13-trick hand.

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
- `app/rules.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios/setup-and-pass.scenario.ts`

## Agent Authoring Workflow

Read `rule.md` and `test/scenarios/complete-game.scenario.ts`. Use
`dreamboard test inspect` with the relevant player perspective to see the
sealed pass or playable-card domain, then use `dreamboard test explore` to
obtain concrete replay-accepted commands as JSON. Add a returned command to the
typed scenario; passing and trick checkpoints derive from that same replay, not
from checked-in hands or mid-game state.

## Verification

```sh
pnpm verify
```
