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
- [ ] Shared models: ordinary per-player records; redundant type packages removed.
- [x] Manifest boards: honeycomb geometry, shapes, canonical identities and queries; combined gate and independent review passed.
- [ ] Bundle: one execution authority with boundary validation retained.
- [ ] Test authoring: remove legacy unbound helpers and legacy runtime argument keys.

## Headless client and React

- [ ] Layer 004: stable typed instance, optional features, getters/handlers/props.
- [ ] Layer 004: controlled drafts and active interaction, source/request lifecycle.
- [ ] Sources: hosted socket, iframe, static, test, local and scenario providers.
- [ ] Sources: hidden stale-action basis, deduplication/retry, close/reconnect behavior.
- [ ] Inspection/exploration/fuzz: reuse authoritative domains and engine commands.
- [ ] Layer 005: thin React selector adapter, provider/hook/Subscribe and type proofs.
- [ ] Layer 005: reference games import game types in hosted UI, never reducer code.
- [ ] Layer 005: both UIs migrated; old runtime/component API deleted.
- [ ] Animation: optional registry-owned implementation with no false external-store promise.

## Registry and developer experience

- [x] Layer 006 foundation: validated shadcn-compatible source registry and tokens; PR #32 local/hosted gates passed.
- [x] Pure items: card, playing-card, pile, grids, players, resources, dice, event-log, standings.
- [ ] Bound items: hand, hand-drawer, board-targets, interaction-form, actions, inspector.
- [ ] Storybook lives with registry; installation smoke against an authored game.
- [ ] Scenario dev UI/checkpoints and DOM-attribute browser helper replace workbench.
- [ ] Both games: meaningful desktop/keyboard/touch/accessibility browser proof.
- [ ] Remove styled SDK dependencies, theme API, old browser-interaction protocol.

## Packaging, docs and adoption

- [ ] Layer 007: four public subpaths: root, react, reducer, testing (package.json metadata exempt).
- [ ] Dependency boundary: framework-free root; React optional adapter; no bundled styled kit.
- [ ] Retain current useful scripts/gates, remove obsolete codegen/workbench tooling and Turbo.
- [ ] Template game typechecks and runs against the new API.
- [ ] Guides/API/registry docs and examples describe only the supported headless API.
- [ ] One packed SDK artifact proves declarations, exports and complete reference games.
- [ ] Public runtime/dev-host adapt worker, UI source and initialization boundaries.
- [ ] Public exact-version release sequence: SDK → runtime → dev-host.
- [ ] Internal adoption updates canonical schemas/adapters/scaffolds/pins.
- [ ] Installed cohort, offline/browser, dependency closure and integration gates pass.
- [ ] All owned PRs reviewed, checks complete, exact heads verified; final landing recorded.

Publication must use the reviewed candidate and repository release workflow.
Never replace an unavailable public dependency with local links or tarballs in
private consumers. No staging or production infrastructure changes belong here.
