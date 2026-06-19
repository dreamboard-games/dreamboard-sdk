# App organization

This directory owns the reducer: game state schemas, phases, interactions,
derived values, player views, and reducer helpers.

Use this layout while the game is small:

```txt
app/
  game-contract.ts
  game.ts
  derived.ts
  reducer-support.ts
  phases/
    setup.ts
```

When a phase grows beyond a single idea, make the phase directory the table of
contents and split the implementation by game concept:

```txt
app/phases/player-turn/
  index.ts          # definePhase assembly only
  state.ts          # phase-local constants and types
  inputs.ts         # shared input and presentation helpers
  build.ts          # build interactions
  trade.ts          # trade interactions
  end-turn.ts       # end-turn interaction
```

Split a phase when it has multiple action families, shared input helpers, card
actions, or is roughly 250-300 lines. Keep `index.ts` as the assembly point
that imports interactions and registers them with `definePhase`.

Do not turn `reducer-support.ts` into a catch-all rule module. Keep it small
for shared reducer plumbing; put real game rules under `app/rules/*` once
there is more than one domain.

UI follows the same scaffold-grown shape:

```txt
ui/
  App.tsx
  interaction-routes.tsx
  styles.ts
  types.ts
  components/
    game-ui.tsx
    surfaces.tsx
```

Keep `ui/App.tsx` focused on providers, `Game.Root`, `Phase.Switch`, and
surface/form hook construction. Keep `ui/interaction-routes.tsx` exhaustive:
its route map should satisfy the generated `InteractionRoutes` type so adding a
reducer interaction fails typecheck until the UI route is authored.
