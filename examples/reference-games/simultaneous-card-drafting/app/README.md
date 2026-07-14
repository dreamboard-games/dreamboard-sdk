# Lantern Market reducer

The reducer follows the game arc directly:

```text
setup -> drafting barrier x6 -> scoreRound -> drafting barrier x6 -> scoreRound -> gameOver
```

- `game.ts` owns initial state, the ordinary `standard` setup, and phase
  registration.
- `phases/drafting.ts` declares the sole player interaction,
  `drafting.submit`, and resolves every completed barrier atomically.
- `phases/scoreRound.ts` records public history, clears stalls, deals round two
  from the already shuffled deck, and produces the terminal outcome.
- `rules/deal.ts` and `rules/scoring.ts` contain the small reusable rule
  algorithms.
- `player-view.ts` exposes only the viewer's private hand while keeping stalls,
  card counts, scores, and history public to players.

Do not add authored decision, obligation, or blocker fields. The SDK derives
active actors, pending actors, continuation waiters, and causal blockers from
the simultaneous phase collector.
