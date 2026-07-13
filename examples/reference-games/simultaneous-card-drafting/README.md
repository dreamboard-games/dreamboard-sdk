# Lantern Market

Lantern Market is the canonical reference for private simultaneous choices,
barrier resolution, reveal timing, hand passing, and compact set scoring.

## Rules Authority

[`rule.md`](rule.md) is the approved gameplay and theme contract. Reducers,
tests, fixtures, and screenshots are evidence only and cannot override it.

## What To Learn Here

- Deal and project a private hand for each player.
- Keep locked choices sealed until every required player submits.
- Reveal accepted choices together and pass the remaining hands.
- Run a complete two-round game without a second simultaneous-action model.

## Files To Read First

- `rule.md`
- `manifest.ts`
- `app/phases/drafting.ts`
- `app/phases/scoreRound.ts`
- `app/rules/scoring.ts`
- `ui/interaction-routes.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios/barrier-actionability.scenario.ts`
- `test/scenarios.test.ts`

## Agent Authoring Workflow

Read `rule.md` and `test/scenarios/complete-game.scenario.ts`. Use
`dreamboard test inspect` from each relevant player perspective to distinguish
private hands, locked choices, and the pending barrier. Use
`dreamboard test explore` to obtain concrete replay-accepted drafts as JSON,
then add them to the typed scenario. All Workbench checkpoints remain prefixes
of that complete two-round replay; no generated hand state is authored.

## Verification

```sh
pnpm verify
```
