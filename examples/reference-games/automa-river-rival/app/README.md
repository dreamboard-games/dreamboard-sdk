# River Guild reducer

The reducer follows the rule procedure directly:

1. `setup` deals four shuffled cargo cards to the public river.
2. `humanTurn` accepts only `claimCargo` from the active human and refills the
   selected position.
3. `resolveRival` reveals one standing order, resolves its deterministic
   left-to-right selection, records progress, and refills the same position.
4. `advanceRiverRound` publishes the round event and either returns to
   `humanTurn` or commits the cooperative outcome after round 6.

`game-contract.ts` owns the serializable reducer state and public procedure
event union. Domain logic belongs under `rules/`: card interpretation and
selection in `cards.ts`, event conversion in `events.ts`, and cooperative
scoring in `outcome.ts`. `reducer-support.ts` remains generated plumbing.

The rival has no `PlayerId`. Its instruction deck, revealed history,
claimed/discarded cargo, progress, and events are normal shared game state.
Transport retry and reconnect handling remain engine-owned and therefore do
not appear in this reducer.
