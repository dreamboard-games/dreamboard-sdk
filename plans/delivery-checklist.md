# Complete delivery checklist

This checklist covers the full original headless plan after the accepted
corrections in README. A green intermediate PR does not complete this list.
Root updates it with implementation and verification evidence.

## Foundation and authoring

- [x] Latest main baselines inspected; unrelated work preserved in source checkouts.
- [x] Layer 001: one transaction mutation path, public immutable API removed.
- [x] Layer 001: local and hosted SDK/browser gates passed (PR #26).
- [x] Layer 002a: direct lifecycle/outcomes, effects/continuations/stages removed; PR #27 local/hosted gates passed.
- [x] Layer 002: seeded transaction operations, initial options, setup profiles removed (002b `c4b9f80`).
- [x] Layer 002: actor interactions, one authored seat view, minimal memoize (002c `8679356`; combined `pnpm check` passed).
- [x] Layer 003: serialized private step selections and cancel command; integrated at `1542dd0`.
- [x] Layer 003: ordered valid-prefix revalidation, phase-entry clearing, final rollback; combined repository gate passed.
- [x] Layer 003: pure projection, nullable optional steps, durable intermediate commits; two real Hex browser workflows passed.
- [x] Shared models: ordinary per-player records and all three redundant private type packages removed; combined gates passed.
- [x] Manifest boards: honeycomb geometry, shapes, canonical identities and queries; combined gate and independent review passed.
- [x] Bundle: one execution authority with boundary validation retained; PR #36 local/hosted gates passed.
- [x] Test authoring: legacy unbound helpers and mutation callback aliases removed; integrated full gate passed at `4058e8b`.

## Headless client and React

- [x] Layer 004: stable typed instance, optional features, getters/handlers/props.
- [x] Layer 004: controlled drafts and active interaction, source/request lifecycle.
- [x] Sources: hosted socket, iframe, static, test, local and scenario providers.
- [x] Sources: hidden stale-action basis, deduplication/retry, close/reconnect behavior.
- [x] Inspection/exploration/fuzz: reuse authoritative domains and engine commands.
- [x] Layer 005: thin React selector adapter, provider/hook/Subscribe and type proofs.
- [x] Layer 005: reference games import game types in hosted UI, never reducer code.
- [x] Layer 005: both UIs migrated; old runtime/component API deleted.
- [x] Animation: optional app/registry ownership; no false external-store transition promise or mandatory SDK primitive.

## Registry and developer experience

- [x] Layer 006 foundation: validated shadcn-compatible source registry and tokens; PR #32 local/hosted gates passed.
- [x] Pure items: card, playing-card, pile, grids, players, resources, dice, event-log, standings.
- [x] Bound items: hand, hand-drawer, board-targets, interaction-form, actions, inspector.
- [x] Storybook lives with registry; installation smoke against an authored game.
- [x] Scenario dev UI/checkpoints and DOM-attribute browser helper replace workbench.
- [x] Both games: meaningful desktop/keyboard/touch/accessibility browser proof.
- [x] Remove styled SDK dependencies, theme API, old browser-interaction protocol.

## Packaging, docs and adoption

- [x] Layer 007: four public subpaths: root, react, reducer, testing (package.json metadata exempt).
- [x] Dependency boundary: framework-free root; React optional adapter; no bundled styled kit.
- [x] Retain current useful scripts/gates, remove obsolete codegen/workbench tooling and Turbo.
- [x] Template game typechecks and runs against the new API.
- [x] Guides/API/registry docs and examples describe only the supported headless API.
- [x] One packed SDK artifact proves declarations, exports and complete reference games.
- [x] Public runtime/dev-host adapt worker, UI source and initialization boundaries; public PRs #26–27 and #29 landed with package/browser proof.
- [x] Public exact-version release sequence: SDK `0.5.0-alpha.3` → runtime `0.1.0-alpha.2` → dev-host `0.2.0-alpha.2`; registry hashes match the verified workflow artifacts.
- [x] Internal adoption updates canonical schemas/adapters/scaffolds/pins; PRs #531 and #545 landed at `35476cc9e`.
- [x] Installed cohort, offline/browser, dependency closure and integration gates pass; see [the delivery receipt](delivery-receipt.md).
- [x] All implementation PRs reviewed, required checks complete, exact heads verified; final landing recorded. Internal CI reports no PR checks; its full local gate and integration passed.

Publication must use the reviewed candidate and repository release workflow.
Never replace an unavailable public dependency with local links or tarballs in
private consumers. No staging or production infrastructure changes belong here.
