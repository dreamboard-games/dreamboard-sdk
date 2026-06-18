# Multiplayer Ranking And Ties

Harbor Fair is the Phase 02 anchor reference game for canonical
`GameOutcome`. It is a compact open-information drafting game that proves
ranked standings, true ties, tie-break evidence, score breakdowns, and a
scoreless cancellation branch.

The package intentionally stops at deterministic source metadata. It does not
add generated UI fixtures, scenario catalogs, or repository registries; those
surfaces are wired by the owning integration pass.

## Rules

Harbor Fair supports two to four human players. The festival deck contains 30
stall cards and two storm cards. Each stall belongs to one guild:

- food
- craft
- music

Each guild has ten stall cards:

| Prestige | Coins | Count |
| -------- | ----- | ----- |
| 1        | 1     | 2     |
| 2        | 0     | 4     |
| 2        | 1     | 2     |
| 3        | 0     | 2     |

The shared market contains four face-up stall cards. Players draft one stall in
session seat order, move it to their public festival row, then refill the
market. Storm cards revealed during refill do not occupy a market slot. The
second revealed storm immediately ends the game with reason
`FESTIVAL_CANCELLED`.

If the fair is not cancelled, the game scores after six rounds.

## Scoring

Each player scores:

- stall prestige: sum printed prestige
- guild sets: 4 points for each complete food, craft, and music set
- coin bonus: 1 point per coin

The reducer assigns standings explicitly. It sorts by total score, then by
complete sets, then by coins. Players with identical score and both tie-breaks
share a rank. The outcome keeps all evidence in the canonical shape:

```js
{
  reason: { code: "SIX_ROUNDS_COMPLETE" },
  standings: [
    {
      playerId: "player-1",
      rank: 1,
      result: "win",
      score: 26,
      scoreBreakdown: [
        { id: "stall-prestige", label: "Stall prestige", value: 15 },
        { id: "guild-sets", label: "Guild sets", value: 8 },
        { id: "coin-bonus", label: "Coins", value: 3 }
      ],
      tieBreaks: [
        { id: "complete-sets", label: "Complete sets", value: 2 },
        { id: "coins", label: "Coins", value: 3 }
      ]
    }
  ]
}
```

## Scenario Coverage

`scenarios/coverage.json` and `src/reference-game.mjs` include executable
metadata for:

- `uniqueWinner`: four-player completion with a unique winner
- `trueTie`: two-player first-place tie after both tie-breaks
- `completeSetTieBreak`: equal scores separated by complete sets
- `coinTieBreak`: equal scores and complete sets separated by coins
- `scorelessCancellation`: second-storm cancellation without numeric scores

`scenarios/verify.mjs` asserts each full canonical `GameOutcome`, including
reason, standings, ranks, results, score components, and tie-break rows. It
also checks that legacy winner and score-map fields are absent.

Run the local source proof from this directory:

```sh
pnpm --ignore-workspace exec node scenarios/verify.mjs
```

Or from the repository root:

```sh
pnpm --dir examples/reference-games/multiplayer-ranking-and-ties --ignore-workspace exec node scenarios/verify.mjs
```

## Implementation Boundary

This package stays inside the public reference-game shape: exact
`@dreamboard-games/sdk` dependency metadata, deterministic source scenarios,
and source-only verification. It intentionally does not introduce a generic
ranking engine, UI-side winner inference, or generated Workbench outputs.
