# Stormtrail executable rules

Every scenario in `test/scenarios/` starts from ordinary three-player setup
with an authored safe-integer seed and replays accepted seat-based commands.
No scenario patches state, fixes dice, injects resources, or selects a test-only
setup profile.

The nine authoritative scenario sources cover the full game, topology/setup,
production, the discard barrier, Bandits, network/costs, depot trades,
bilateral trade, and projection privacy. `test/scenarios.test.ts` adds exact
checkpoint, probe, explore, scheduler, and privacy assertions.

`test/ui/scenario-source.test.tsx` exercises the actual headless instance over
production-backed scenario sources: board placement, atomic Depot exchange,
committed Bandits choices, restore/cancel and selected-seat privacy.
`test/ui/app.test.tsx` bundles the hosted UI and rejects executable game, reducer,
testing or Node imports.

`test/browser/game.spec.ts` drives the same local UI with desktop keyboard/pointer
and mobile touch. It covers every former Workbench checkpoint, private discards,
trade responses, saved choices, errors, terminal standings and Axe checks. Browser
traces go to `build/browser`; screenshots for review are written beneath `/tmp`.

Run from this game directory:

```sh
pnpm check
pnpm test:browser
```
