# App organization

This directory owns the reducer: game state schemas, phases, interactions,
derived values, player views, and reducer helpers.

Sketchbook keeps the phase assembly separate from the five card effects and
shared draw helpers:

```txt
app/
  game-contract.ts
  game.ts
  model.ts
  derived.ts
  reducer-support.ts
  cards/
    brainstorm.ts
    studio.ts
    gallery.ts
    eraser.ts
    studio-visit.ts
  effects/
    deck.ts
  phases/
    setup.ts
    check-game-end.ts
    game-over.ts
    player-turn/
      index.ts
      state.ts
      interactions/
        turn-actions.ts
        buy.ts
        cleanup.ts
```

`player-turn/index.ts` is only the ordered action/resolve/buy assembly point.
Technique files own their exact effects and follow-up inputs. Cleanup owns the
discard-only reshuffle boundary; `check-game-end.ts` is the sole supply ending
and ranking authority.

Do not turn `reducer-support.ts` into a catch-all rule module. Keep it small
for shared reducer plumbing; put real game rules under `app/rules/*` once
there is more than one domain.

UI follows the same scaffold-grown shape:

```txt
ui/
  App.tsx
  interaction-routes.tsx
  types.ts
  surfaces.ts
  components/
    cards.tsx
    game-ui.tsx
```

Keep `ui/App.tsx` focused on providers, `Game.Root`, `Phase.Switch`, and
surface hook construction. Keep `ui/interaction-routes.tsx` exhaustive:
its route map should satisfy the generated `InteractionRoutes` type so adding a
reducer interaction fails typecheck until the UI route is authored. Keep
card faces in `ui/components/cards.tsx` and the responsive layout in
`ui/components/game-ui.tsx`.
