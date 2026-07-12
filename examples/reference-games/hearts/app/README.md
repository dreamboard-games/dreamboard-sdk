# Hearts reducer organization

The authored reducer is intentionally small and rule-shaped:

```text
game-contract.ts   schemas, phase state, errors, and terminal outcome
game.ts            initial state, setup profile, phases, and views
rules.ts           pure card legality, trick comparison, scoring, and ranking
phases/            automatic setup/scoring plus the two canonical interactions
player-view.ts     public table projection and owner-only hand projection
```

Only `passing.submit` and `playing.playCard` are player decisions. Setup, pass
resolution, trick resolution, scoring, and outcome publication remain automatic
procedures owned by their phase files.

Keep contextual card eligibility in `rules.ts` so the target domain shown by
inspect/explore and the validation run at submission use the same rule. Do not
mirror scheduler actors, waits, or `blockedBy` into game-authored state.
