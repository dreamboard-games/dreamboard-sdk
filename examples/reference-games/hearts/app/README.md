# Hearts reducer organization

The authored reducer is intentionally small and rule-shaped:

```text
game-model.ts      hearts = createGame({ manifest, state, phases, errors }); GameState = typeof hearts.types.State
game.ts            hearts.assemble({ initial, setupProfiles, phases, views })
rules.ts           pure card legality, trick comparison, scoring, and ranking
phases/            one file per phase: const x = hearts.phase("x"); export default x.define(...)
player-view.ts     hearts.view(...)
```

`game-model.ts` binds the model once. Every other module imports the `hearts`
value from it: phase files call `hearts.phase("<name>")`, views call
`hearts.view`, and rules name types through `typeof hearts.types.*`. Nothing
imports `game.ts` except the test harness, so there is no import cycle.

Reducers receive an open transaction `tx`, mutate through it, and finish with a
bare `return` (accept), `tx.transition(...)`, or `tx.endGame(...)`. Card inputs
name their zones and eligibility predicates directly:
`playing.inputs.card({ from: ["hand"], where })`.

Only `passing.submit` and `playing.playCard` are player decisions. Setup, pass
resolution, trick resolution, scoring, and outcome publication remain automatic
procedures owned by their phase files.

Keep contextual card eligibility in `rules.ts` so the target domain shown by
inspect/explore and the validation run at submission use the same rule. Do not
mirror scheduler actors, waits, or `blockedBy` into game-authored state.
