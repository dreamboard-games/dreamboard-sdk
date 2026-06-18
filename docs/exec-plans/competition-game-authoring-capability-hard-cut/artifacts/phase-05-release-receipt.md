# Phase 05 Release Receipt

Status: closed on 2026-06-19. SDK reference-suite preparation, required
internal parity, SDK release proof, public SDK package availability, public
Dreamboard docs/skill source proof, CLI/dev-host `0.1.30-alpha.18` npm
publication, public authoring compatibility proof, internal authoring
release-set repin, internal stack/browser release-set proof, package proof, and
full product harness proof are recorded. Focused terminal callback/message,
host ended-event, reconnect event-batch, and history-restore regressions pass;
broader packed reconnect/event-history E2E remains a non-blocking follow-up.

## SDK Source

- SDK source commit: pending final commit
- Public SDK version: `0.4.0-alpha.5`
- Public npm tarball:
  `https://registry.npmjs.org/@dreamboard-games/sdk/-/sdk-0.4.0-alpha.5.tgz`
- Public npm integrity:
  `sha512-PJpKs7cZpPKFiOQKfsh9RcnwpJ+GlfpIOZl6qCmETTxADVTbksI6lkWQhn3m6bo7eveQvUjRQMNfDVFLecbKgg==`
- Local release-candidate tarball digest:
  `sha256:f42e3d0e5a8f17839cf10b519e13fc29a9b898410ee5a3ba72993c19ed3b96b8`

## Generated Checks

- `mise exec node@24 -- pnpm format:check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm docs:check`: passed on 2026-06-19; passed again
  after parity fixture regeneration
- `mise exec node@24 -- node scripts/capability/check-competition-game-briefs.mjs`:
  passed on 2026-06-19; receipt
  `artifacts/capability/competition-game-authoring/brief-check-receipt.json`
- `mise exec node@24 -- pnpm check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm ui:coverage:check`: passed through
  `pnpm check` on 2026-06-19
- `mise exec node@24 -- pnpm ui:catalog:check`: passed through `pnpm check`
  on 2026-06-19; passed again on 2026-06-19 after parity fixture regeneration
- `mise exec node@24 -- pnpm ui:fixtures:check`: passed through `pnpm check`
  on 2026-06-19; passed again on 2026-06-19 after parity fixture regeneration
- `mise exec node@24 -- pnpm ui:runtime:test`: passed through `pnpm check`
  on 2026-06-19
- `mise exec node@24 -- pnpm ui:test --required`: passed on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T14-48-04-934Z/receipt.json`; aggregate receipt from
  `pnpm check` `artifacts/ui/2026-06-18T15-06-27-068Z/receipt.json`; latest
  proof-enforced receipt `artifacts/ui/2026-06-18T15-23-03-249Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --capability reduced-motion`: passed on
  2026-06-19; receipt `artifacts/ui/2026-06-18T15-01-47-138Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --capability accessibility-scan`: passed
  on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T15-02-25-701Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test --scenario hearts.pass-three.mobile`:
  passed on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T15-21-25-010Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test:parity`: passed source-side parity
  preflight on 2026-06-19; receipt
  `artifacts/ui-parity/2026-06-18T15-25-28-502Z/receipt.json`
- `DREAMBOARD_INTERNAL_REPO=/Users/mac/code/internal DREAMBOARD_SDK_REPO=/Users/mac/code/dreamboard-sdk mise exec node@24 -- pnpm ui:test:parity --require-internal`:
  passed on 2026-06-19; receipt
  `artifacts/ui-parity/2026-06-18T15-54-10-552Z/receipt.json`
- `DREAMBOARD_INTERNAL_REPO=/Users/mac/code/internal DREAMBOARD_SDK_REPO=/Users/mac/code/dreamboard-sdk mise exec node@24 -- pnpm ui:release-proof`:
  passed on 2026-06-19; receipt
  `artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test`: passed on 2026-06-19; receipt
  `artifacts/ui/2026-06-18T21-43-46-503Z/receipt.json`
- `mise exec node@24 -- pnpm ui:test:runtime-visual`: passed through
  `pnpm check` on 2026-06-19
- `mise exec node@24 -- pnpm ui:hard-cut:check`: passed through `pnpm check`
  on 2026-06-19
- `mise exec node@24 -- pnpm pack:dry-run`: passed through `pnpm check` on
  2026-06-19
- Demo workspace stale-outcome cleanup and regeneration:
  - `mise exec node@24 -- /Users/mac/code/dreamboard/apps/dreamboard-cli/node_modules/.bin/tsx /Users/mac/code/dreamboard/apps/dreamboard-cli/src/index.ts test generate`:
    passed on 2026-06-19 in
    `examples/reference-games/deck-building-market/demo-workspace`,
    `examples/reference-games/hex-network-trading/demo-workspace`, and
    `examples/reference-games/worker-placement-tableau/demo-workspace`.
  - `mise exec node@24 -- /Users/mac/code/dreamboard/apps/dreamboard-cli/node_modules/.bin/tsx /Users/mac/code/dreamboard/apps/dreamboard-cli/src/index.ts test run`:
    passed on 2026-06-19 in the same three demo workspaces:
    deck-building market `16 passed, 0 failed`; hex-network trading
    `24 passed, 0 failed`; worker-placement tableau `38 passed, 0 failed`.
  - `rg -n "winnerPlayerId|finalScores|TerminalOutcome" examples/reference-games/deck-building-market/demo-workspace examples/reference-games/hex-network-trading/demo-workspace examples/reference-games/worker-placement-tableau/demo-workspace packages/workspace-codegen/src/seeds.ts`:
    no matches on 2026-06-19.

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

## Workbench Evidence

- Required scenario run:
  `artifacts/ui/2026-06-18T15-23-03-249Z/receipt.json`
- Full reduced-motion capability run:
  `artifacts/ui/2026-06-18T15-01-47-138Z/receipt.json`
- Full accessibility-scan capability run:
  `artifacts/ui/2026-06-18T15-02-25-701Z/receipt.json`
- Storybook interaction run:
  `artifacts/ui-stories/2026-06-18T15-05-41-989Z/receipt.json`
- Visual run: `artifacts/ui-visual/2026-06-18T15-05-55-525Z/receipt.json`
- Runtime visual run: passed through `pnpm check` on 2026-06-19
- Full Workbench scenario run:
  `artifacts/ui/2026-06-18T21-43-46-503Z/receipt.json`
- Release proof run:
  `artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`

## Parity Evidence

- Required parity scenarios are sourced from
  `scripts/ui/required-ui-scenarios.mjs`; current list:
  `hearts.pass-three.mobile`
- Source-side parity preflight:
  `artifacts/ui-parity/2026-06-18T15-25-28-502Z/receipt.json`
- Source Workbench comparison: passed
- Internal real-host executor:
  `artifacts/ui-parity/2026-06-18T15-54-10-552Z/receipt.json`
- Internal real-host comparison: passed

## Release-Proof Preconditions

`pnpm ui:release-proof` requires a passing real-host parity receipt for the
current SDK tarball and fixture bundle. This run used `DREAMBOARD_INTERNAL_REPO`
to execute `scripts/ui/run-ui-parity.mjs --skip-build --require-internal` and
then wrote
`artifacts/ui-release-proof/2026-06-18T15-54-23-559Z/receipt.json`.
Acceptable inputs remain:

- `--real-host-parity-receipt <path>`;
- `UI_REAL_HOST_PARITY_RECEIPT=<path>`; or
- `DREAMBOARD_INTERNAL_REPO=<path>` so release proof can run
  `scripts/ui/run-ui-parity.mjs --skip-build --require-internal`.

The parity receipt must be for the current local candidate tarball
`sha256:f42e3d0e5a8f17839cf10b519e13fc29a9b898410ee5a3ba72993c19ed3b96b8`,
must use the current fixture bundle digest, and must include independently
materialized fixture, source Workbench, and packed real-host observations. Older
Phase 07 parity receipts are not acceptable for this Phase 05 release proof
because their SDK digest does not match this candidate.

## Packed Consumer Evidence

- `mise exec node@24 -- pnpm reference-games:check`: passed on 2026-06-19
- `mise exec node@24 -- pnpm reference-games:test:packed --required`: passed on
  2026-06-19
- Packed consumer receipt: `build/reference-games/packed-consumer-receipt.json`

## Internal Evidence

- Exact public SDK repin:
  `mise exec node@24 -- pnpm sdk:repin 0.4.0-alpha.5`; passed on
  2026-06-19, updating nine consumers and the root lockfile back to public
  npm `@dreamboard-games/sdk@0.4.0-alpha.5`.
- Authoring release-set check:
  `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm authoring:release-set:check`;
  passed on 2026-06-19 with public release-set
  `sha256:ef52cd34cbdc789fc58354981361c0ef516e4be7fef48c45a1e7534fd0b32c2e`.
- Public CLI/dev-host publication:
  `@dreamboard-games/dev-host@0.1.30-alpha.18` and
  `@dreamboard-games/cli@0.1.30-alpha.18` were published to npm with the
  `alpha` dist-tag on 2026-06-19. Public and local-registry `npm view` checks
  resolved both versions.
- Public authoring compatibility proof:
  `mise exec node@24 -- pnpm authoring:compat --sdk-tarball /tmp/dreamboard-authoring-compat-uYaQca/dreamboard-games-sdk-0.4.0-alpha.5.tgz --api-client-tarball /tmp/dreamboard-authoring-compat-uYaQca/dreamboard-games-api-client-0.3.0-alpha.4.tgz --dev-host-tarball /tmp/dreamboard-authoring-compat-uYaQca/dreamboard-games-dev-host-0.1.30-alpha.18.tgz --cli-tarball /tmp/dreamboard-authoring-compat-uYaQca/dreamboard-games-cli-0.1.30-alpha.18.tgz`:
  passed on 2026-06-19; receipt
  `/Users/mac/code/dreamboard/build/authoring-compatibility/2026-06-18T21-46-39-559Z/receipt.json`.
- Internal authoring release-set repin:
  `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm repin authoring /Users/mac/code/dreamboard/build/authoring-compatibility/2026-06-18T21-46-39-559Z/receipt.json`:
  passed on 2026-06-19; receipt
  `/Users/mac/code/internal/build/authoring-release-set/latest-repin-receipt.json`.
- Product harness package-tarball fetch fix:
  `/Users/mac/code/internal/tools/product-harness/src/runner.ts` now fetches
  the exact public npm CLI tarball for the installed package version before
  comparing the Phase 3 tarball hash. This keeps the default package proof
  command deterministic and avoids comparing a freshly repacked `node_modules`
  tarball against the public npm tarball hash.
- Product harness fix:
  `tools/product-harness/src/runner.ts` now drives installed release-set CLI
  local lanes without `--env local`, relying on the existing isolated
  `DREAMBOARD_API_BASE_URL`, `DREAMBOARD_WEB_BASE_URL`, and
  `DREAMBOARD_AGENT_TOKEN` environment contract. This preserves
  `verify:package` rejection of source overrides while allowing
  `verify:browser` to prove the installed public CLI package against the owned
  local stack.
- Plugin-runtime-contract mirror sync:
  `packages/plugin-runtime-contract/SOURCE.json` updated to the SDK mirror
  hashes for `contract.test.ts`, `frame.ts`, `projection.ts`, and `schema.ts`;
  `mise exec node@24 -- pnpm --dir packages/plugin-runtime-contract source:check`
  passed on 2026-06-19.
- UI host runtime descriptor normalization:
  `packages/ui-host-runtime/src/session-model.ts` normalizes API-client wire
  interaction descriptors into plugin contract descriptors with required
  labels; `mise exec node@24 -- pnpm --filter @dreamboard-games/ui-host-runtime build`
  passed on 2026-06-19.
- `mise exec node@24 -- pnpm --filter @dreamboard-games/plugin-runtime-contract test`:
  passed on 2026-06-19.
- `mise exec node@24 -- pnpm fin`: passed on 2026-06-19 in 1m 9.2s.
- `mise exec node@24 -- pnpm verify:dev`: passed on 2026-06-19; latest
  receipts
  `build/verification/2026-06-18T17-00-22-190Z-1de694b4/authoring/receipt.json`
  and
  `build/verification/2026-06-18T17-00-22-190Z-1de694b4/embedded/receipt.json`.
- `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm verify:stack`:
  passed on 2026-06-19 with installed-release-set proof mode; receipt
  `build/verification/2026-06-18T17-04-58-994Z-14e4a172/stack/receipt.json`.
  The stack receipt covers isolated database startup and migrations, isolated
  backend startup, authenticated workspace creation, sync, compile, persistent
  lifecycle status, authoritative clone/pull, durable commit equality, and
  executor-loss safe retry.
- `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm verify:browser`:
  passed on 2026-06-19 with installed-release-set proof mode; receipt
  `build/verification/2026-06-18T17-00-40-434Z-a706f43e/browser/receipt.json`.
- `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm verify:package`:
  passed on 2026-06-19; receipt
  `/Users/mac/code/internal/build/verification/2026-06-18T21-51-40-201Z-e9a7a81f/package/receipt.json`.
- `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm verify:full`:
  passed on 2026-06-19; receipts under
  `/Users/mac/code/internal/build/verification/2026-06-18T21-53-02-611Z-3786532a/`
  for `authoring`, `embedded`, `browser`, `package`, and `stack`.
- Internal terminal transport source hard cut:
  - `apps/gameplay-executor` now validates SDK-style `GameOutcome` and rejects
    legacy `winnerPlayerId` / `finalScores` terminal payloads.
  - `apps/gameplay-authority` now preserves canonical terminal outcome from the
    executor envelope, stores it in `gameplay_heads.terminal_json`, hydrates
    outbox claims from that payload, and posts backend callbacks as
    `{ outcome }`.
  - backend callback/persistence code derives the existing internal
    compatibility `GameResult` from canonical standings.
  - `packages/ui-host-runtime/src/session-state-reducer.ts` now exports
    `GAME_ENDED` notifications with canonical `GameOutcome` instead of the
    legacy `winner` / `finalScores` / `reason` shape.
  - `pnpm --dir apps/gameplay-executor build`: passed on 2026-06-19.
  - `pnpm --dir apps/gameplay-authority build`: passed on 2026-06-19.
  - `pnpm --dir apps/gameplay-authority test src/notifier/terminal-notifier.test.ts src/session/session-actor-factory.test.ts src/executor/remote-reducer-executor.test.ts`:
    passed on 2026-06-19 with 25 tests.
  - `pnpm --filter @dreamboard-games/ui-host-runtime build`: passed on
    2026-06-19.
  - `pnpm --dir packages/private-contracts openapi:check-bundle`: passed on
    2026-06-19.
  - `pnpm --dir packages/api-client build`: passed on 2026-06-19.
  - `./gradlew :apps:backend:compileKotlin :apps:backend:compileTestKotlin`:
    passed on 2026-06-19.
- Post-cut focused internal regression:
  - `mise exec node@24 -- pnpm --dir apps/gameplay-authority test src/executor/remote-reducer-executor.test.ts src/notifier/terminal-notifier.test.ts src/session/session-actor.test.ts src/session/owner-tunnel-connector.test.ts`:
    passed on 2026-06-19 with 50 tests.
  - `mise exec node@24 -- pnpm --dir packages/ui-host-runtime test src/gameplay-authority-transport.test.ts src/unified-session-store.test.ts`:
    passed on 2026-06-19 with 35 tests.
  - `mise exec node@24 -- pnpm --dir packages/gameplay-authority-protocol test`:
    passed on 2026-06-19 with 15 tests.
  - `./gradlew :apps:backend:test --tests 'sessions.*' --console=plain --info`:
    passed on 2026-06-19. The narrower
    `--tests '*InMemoryGameSessionRepositoryTest'` filter did not discover the
    Kotlin test class in this Gradle setup, so the broader package filter was
    retained as evidence.
- New focused terminal callback/message regressions:
  - `apps/backend/src/test/kotlin/routes/internal/GameSessionEndedCallbackControllerTest.kt`
    posts canonical `{ outcome }` to
    `/internal/gameplay/sessions/{sessionId}/ended`, verifies `applied: true`,
    confirms persisted `GamePhase.Ended` result and authority terminal metadata,
    checks distinct `session.ended` lobby messages for session actors, and
    proves the public event-batch reconnect path replays the ended event after
    `afterCursor=0`.
  - `./gradlew :apps:backend:test --tests 'routes.internal.GameSessionEndedCallbackControllerTest' --tests 'sessions.*' --console=plain`:
    passed on 2026-06-19.
  - `packages/ui-host-runtime/src/unified-session-store.test.ts` now verifies a
    `session.ended` host event replaces gameplay state with ended session
    context and removes the exposed gameplay payload.
  - `packages/ui-host-runtime/src/unified-session-store.test.ts` also verifies
    `restoreHistory` applies the restored Gameplay Authority update, advances
    the visible gameplay view to the restored version, and refreshes the local
    history context.
  - `mise exec node@24 -- pnpm --dir packages/ui-host-runtime test src/gameplay-authority-transport.test.ts src/unified-session-store.test.ts`:
    passed on 2026-06-19 with 37 tests.
- Broader packed real-host reconnect and event-history product-flow proof
  remains a non-blocking follow-up beyond the passing stack, browser smoke, Hearts parity,
  focused terminal callback, reconnect event-batch, host ended-event, and
  history-restore evidence.

## Public Documentation Evidence

- Public docs commit: pending
- Public checkout: `/Users/mac/code/dreamboard`
- Public docs and skill source updated for:
  - roll-and-write scorecards and `Board.SquareGrid`;
  - canonical `GameOutcome`, ties, breakdowns, and tie-breaks;
  - reducer-owned setup/phase/action guidance and disabled reasons;
  - deterministic solo and automa procedures without fake seats;
  - canonical example catalog; and
  - coding-agent concept selection.
- `mise exec node@24 -- pnpm skills:sync-docs`: passed on 2026-06-19 after
  adding the missing public `apps/dreamboard-cli` `sync:skill-docs` target.
- `mise exec node@24 -- pnpm docs:validate`: passed on 2026-06-19.
- `mise exec node@24 -- pnpm docs:broken-links`: passed on 2026-06-19; Mint
  emitted a non-fatal OpenAPI categorization warning while still reporting no
  broken links.
- `mise exec node@24 -- pnpm typecheck`: passed on 2026-06-19.
- `mise exec node@24 -- pnpm stage:publish`: passed on 2026-06-19.
- `mise exec node@24 -- pnpm pack:publish`: passed on 2026-06-19; dry-run
  tarball `@dreamboard-games/cli@0.1.30-alpha.18` included the bundled
  `skills/dreamboard` tree and generated `canonical-concepts.md` reference.
- `mise exec node@24 -- pnpm --dir packages/dev-host run pack:publish`: passed
  on 2026-06-19; dry-run tarball
  `@dreamboard-games/dev-host@0.1.30-alpha.18` matched the published package
  integrity.
- Agent-skills package: not applicable in the current public checkout. There is
  no `packages/agent-skills`; the Dreamboard skill is bundled into the CLI
  package.

## Deletion Audit

- SDK obsolete API audit: pass for active SDK/reference-game source covered by
  this phase. `packages/sdk` and reducer-contract source contain no blocking old
  terminal type, the existing deck/hex/worker demo workspaces no longer project
  or assert scalar `winnerPlayerId`, and generated demo baselines were
  regenerated through the local reducer-native CLI path.
- Internal obsolete API audit: source cut completed for executor, authority,
  UI host runtime notifications, private contracts, generated API clients, and
  backend callback/persistence plumbing. Remaining `winnerPlayerId` /
  `finalScores` hits are limited to expected backend compatibility `GameResult`
  mapping/storage and negative guards that reject legacy executor payloads.
  Focused build/test evidence and installed-release-set `verify:stack` evidence
  are recorded above, including backend route coverage for canonical terminal
  callback/message persistence, event-batch reconnect replay, UI host ended
  events, and history restore. Package and full product harness proof are
  recorded above. Broader packed reconnect/event-history E2E remains a
  non-blocking follow-up.

## Retained Limitations

- No blocking retained limitations remain for this capability hard cut.
- Public documentation and bundled skill source proof passed, and the CLI/dev-host
  `0.1.30-alpha.18` npm packages were published under the `alpha` dist-tag.
- Internal live terminal transport source has been cut from `TerminalOutcome` /
  `winnerPlayerId` / `finalScores` to canonical `GameOutcome`, and stack,
  package, and full product proof pass after the cut.
- Focused terminal callback/message, reconnect event-batch, host ended-event,
  and history-restore regressions now pass. Broader packed reconnect and
  event-history E2E remains a non-blocking follow-up beyond the passing stack,
  browser smoke, Hearts parity, package/full, and focused local evidence.

## Rollback And Recovery

- Final release artifact and internal repin details are recorded above.
