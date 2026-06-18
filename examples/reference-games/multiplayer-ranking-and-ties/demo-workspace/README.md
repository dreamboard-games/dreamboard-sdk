# Harbor Fair Demo Workspace

This is a Phase 02 demo-workspace stub for Harbor Fair. The executable anchor
model lives in the package root `src/` and `scenarios/` directories.

The current slice does not provide a launchable UI workspace or generated
portable fixture. The integration pass that registers this reference game can
wire outcome presentation scenarios after reviewing the source package.

## Current Demo Contract

- Market: four face-up stall cards.
- Interaction: `draft-stall` from the shared market.
- Terminal proof: canonical `GameOutcome` for ranked results, ties,
  tie-break-separated equal scores, and scoreless cancellation.
- Scenario metadata: `uniqueWinner`, `trueTie`, `completeSetTieBreak`,
  `coinTieBreak`, and `scorelessCancellation`.

Run the source proof from the package root:

```sh
pnpm --ignore-workspace exec node scenarios/verify.mjs
```
