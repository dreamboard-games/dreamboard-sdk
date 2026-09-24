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
- `ui/game.ts` and `ui/components/hand-row.tsx`
- `test/scenarios/complete-game.scenario.ts`
- `test/scenarios/setup-and-pass.scenario.ts`

## Agent Authoring Workflow

Read `rule.md` and `test/scenarios/complete-game.scenario.ts`. Start a seeded game
with `localSource(game, { players: 4, seed: 1 })`, or open a named checkpoint with
`scenarioSource(game, scenario, { at, as })`. Use the source's selected-seat
`inspect()` and bounded `explore({ maxEvaluations: 5000 })` to obtain commands;
`apply(command)` uses the production reducer admission path. Add accepted commands
to the typed scenario. Local UI checkpoint controls restore saved JSON state
without replaying initialization or commands.

## Verification

```sh
pnpm check
pnpm test:browser
```

## Hosted and local UI

`ui/index.tsx` mounts the selected-seat iframe source. Its game import is type-only;
reducer execution and scenario replay belong to `ui/dev.tsx` and its local source.
Registry components are installed as editable code under `ui/components/dreamboard`.

Run `pnpm dev`, then open `/?scenario=complete&at=opening&as=player-1`.
Other complete-game checkpoints include `sealed-pass`, `first-trick`, `mid-hand`,
`developed`, and `game-over`. The local controls switch actual seats and save or
restore a JSON checkpoint; they never replay an old seat's intent. Omit `scenario`
for a new seeded game. Local inspector data contains only the selected-seat view.

The browser suite plays all 56 commands through native keyboard and touch controls,
checks private hands and sealed passes, and verifies final standings and accessibility.
