# Phase 05 Release Receipt

Status: closed on 2026-06-19. SDK reference-suite preparation, required
Workbench and parity proof, SDK release proof, public SDK package availability,
public Dreamboard docs/skill source proof, CLI/dev-host publication, public
authoring compatibility proof, private product repin, package proof, and full
product harness proof are complete. Focused terminal callback/message,
host ended-event, reconnect event-batch, and history-restore regressions passed.
Broader packed reconnect/event-history E2E remains a non-blocking follow-up.

This receipt intentionally records public package identifiers, public artifact
digests, sanitized receipt IDs, and high-level private proof status only. Raw
private product logs, local checkout paths, and private source paths are retained
outside the public SDK repository.

## SDK Source

- SDK source commit: pending final PR commit
- Public SDK version: `0.4.0-alpha.5`
- Public npm tarball:
  `https://registry.npmjs.org/@dreamboard-games/sdk/-/sdk-0.4.0-alpha.5.tgz`
- Public npm integrity:
  `sha512-PJpKs7cZpPKFiOQKfsh9RcnwpJ+GlfpIOZl6qCmETTxADVTbksI6lkWQhn3m6bo7eveQvUjRQMNfDVFLecbKgg==`
- Local release-candidate tarball digest:
  `sha256:f42e3d0e5a8f17839cf10b519e13fc29a9b898410ee5a3ba72993c19ed3b96b8`

## SDK Verification

- `mise exec node@24 -- pnpm format:check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm docs:check`: passed on 2026-06-19
- `mise exec node@24 -- node scripts/capability/check-competition-game-briefs.mjs`:
  passed on 2026-06-19; receipt
  `artifacts/capability/competition-game-authoring/brief-check-receipt.json`
- `mise exec node@24 -- pnpm check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm ui:test --required`: passed on 2026-06-19;
  latest required receipt `artifacts/ui/2026-06-18T15-23-03-249Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --capability reduced-motion`: passed on
  2026-06-19; receipt `artifacts/ui/2026-06-18T15-01-47-138Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --capability accessibility-scan`: passed
  on 2026-06-19; receipt `artifacts/ui/2026-06-18T15-02-25-701Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --scenario hearts.pass-three.mobile`:
  passed on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T15-21-25-010Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test:parity`: passed source-side parity
  preflight on 2026-06-19; receipt
  `artifacts/ui-parity/2026-06-18T15-25-28-502Z/receipt.json`
- Required private real-host parity: passed on 2026-06-19; sanitized public
  receipt reference `artifacts/ui-parity/2026-06-18T15-54-10-552Z/receipt.json`
- `mise exec node@24 -- pnpm ui:release-proof`: passed on 2026-06-19; receipt
  `artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test`: passed on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T21-43-46-503Z/receipt.json`
- `mise exec node@24 -- pnpm reference-games:check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm reference-games:test:packed --required`: passed on
  2026-06-19
- Packed consumer receipt: `build/reference-games/packed-consumer-receipt.json`

## Required Scenarios

Release-required Workbench scenarios are sourced from
`scripts/ui/required-ui-scenarios.mjs`.

- `automa-river-rival.claim-cargo.mobile`
- `automa-river-rival.claim-cargo.duplicate.mobile`
- `automa-river-rival.claim-cargo.initial.mobile`
- `automa-river-rival.claim-cargo.live-update.mobile`
- `automa-river-rival.claim-cargo.reconnect.mobile`
- `automa-river-rival.claim-cargo.terminal.mobile`
- `deck-building-market.buy-card.desktop`
- `hearts.pass-three.mobile`
- `hex-network-trading.place-route.desktop`
- `multiplayer-ranking-and-ties.draft-stall.desktop`
- `multiplayer-ranking-and-ties.draft-stall.reconnect.desktop`
- `multiplayer-ranking-and-ties.draft-stall.tie-break.desktop`
- `multiplayer-ranking-and-ties.draft-stall.true-tie.desktop`
- `multiplayer-ranking-and-ties.draft-stall.unique-winner.desktop`
- `roll-and-write-scorecard.mark-cell.drafted.mobile`
- `roll-and-write-scorecard.mark-cell.initial.mobile`
- `roll-and-write-scorecard.mark-cell.invalid.mobile`
- `roll-and-write-scorecard.mark-cell.mobile`
- `roll-and-write-scorecard.mark-cell.rolled.mobile`
- `roll-and-write-scorecard.mark-cell.submitted.mobile`
- `roll-and-write-scorecard.mark-cell.terminal.mobile`
- `simultaneous-card-drafting.lock-choice.mobile`
- `solo-countdown-puzzle.repair-beacon.initial.mobile`
- `solo-countdown-puzzle.repair-beacon.live-update.mobile`
- `solo-countdown-puzzle.repair-beacon.mobile`
- `solo-countdown-puzzle.repair-beacon.reconnect.mobile`
- `solo-countdown-puzzle.repair-beacon.terminal.mobile`
- `worker-placement-tableau.place-worker.desktop`

## Public Package And Authoring Proof

- Public SDK package:
  `@dreamboard-games/sdk@0.4.0-alpha.5`
- Public CLI/dev-host packages:
  `@dreamboard-games/dev-host@0.1.30-alpha.18` and
  `@dreamboard-games/cli@0.1.30-alpha.18`, published to npm with the `alpha`
  dist-tag on 2026-06-19
- Public authoring compatibility proof: passed on 2026-06-19; receipt ID
  `2026-06-18T21-46-39-559Z`
- Public authoring release-set digest:
  `sha256:ef52cd34cbdc789fc58354981361c0ef516e4be7fef48c45a1e7534fd0b32c2e`

## Private Product Proof

Private product evidence was executed from the private product repository and is
not committed to this public SDK repo.

- Exact public SDK repin: passed on 2026-06-19
- Authoring release-set check: passed on 2026-06-19 with the public release-set
  digest listed above
- Package proof: passed on 2026-06-19; receipt ID
  `2026-06-18T21-51-40-201Z-e9a7a81f`
- Full product harness proof: passed on 2026-06-19; receipt ID
  `2026-06-18T21-53-02-611Z-3786532a`
- Focused terminal callback/message, reconnect event-batch, host ended-event,
  and history-restore regressions: passed on 2026-06-19
- Broader packed reconnect/event-history product-flow proof remains a
  non-blocking follow-up beyond the passing stack, browser smoke, Hearts parity,
  focused regression, package, and full product harness proof.

## Public Documentation Evidence

- Public Dreamboard docs and bundled skill source were updated for
  roll-and-write scorecards and `Board.SquareGrid`, canonical `GameOutcome`,
  reducer-owned setup/phase/action guidance and disabled reasons, deterministic
  solo and automa procedures, the canonical example catalog, and coding-agent
  concept selection.
- `mise exec node@24 -- pnpm skills:sync-docs`: passed on 2026-06-19
- `mise exec node@24 -- pnpm docs:validate`: passed on 2026-06-19
- `mise exec node@24 -- pnpm docs:broken-links`: passed on 2026-06-19
- `mise exec node@24 -- pnpm typecheck`: passed on 2026-06-19
- `mise exec node@24 -- pnpm stage:publish`: passed on 2026-06-19
- `mise exec node@24 -- pnpm pack:publish`: passed on 2026-06-19
- `mise exec node@24 -- pnpm --dir packages/dev-host run pack:publish`: passed
  on 2026-06-19

## Deletion Audit

- SDK obsolete API audit: passed for active SDK/reference-game source covered by
  this phase. `packages/sdk` and reducer-contract source contain no blocking old
  terminal type, existing demo-workspace projections and tests no longer assert
  scalar `winnerPlayerId`, and generated demo baselines were regenerated through
  the local reducer-native CLI path.
- Private product obsolete API audit: source cutover and focused proof passed.
  Remaining old terminal field names are limited to retained compatibility
  mapping/storage and negative guards that reject legacy executor payloads.

## Retained Limitations

- No blocking retained limitations remain for this capability hard cut.
- Broader packed reconnect and event-history E2E remains a non-blocking
  follow-up beyond the passing stack, browser smoke, Hearts parity, package/full,
  and focused local evidence.

## Rollback And Recovery

- Final release artifact and private repin details are recorded in the private
  product repository and are intentionally not duplicated in public SDK artifacts.
