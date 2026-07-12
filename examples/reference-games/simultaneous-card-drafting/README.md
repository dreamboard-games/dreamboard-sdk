# Lantern Market

Lantern Market is the canonical reference for private simultaneous choices,
barrier resolution, reveal timing, hand passing, and compact set scoring.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Existing
sushi-shaped content, reducers, tests, fixtures, and screenshots are candidates
for replacement and cannot override the brief.

## What To Learn Here

- Deal and project a private hand for each player.
- Keep locked choices sealed until every required player submits.
- Reveal accepted choices together and pass the remaining hands.
- Run a complete two-round game without a second simultaneous-action model.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/drafting.ts`
- `app/rules/scoring.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/draft-one-pick.scenario.ts`

## Verification

```sh
pnpm --dir examples/reference-games/simultaneous-card-drafting verify
```
