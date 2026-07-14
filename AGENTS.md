# Dreamboard SDK Agent Guide

This repository is the source of truth for the public
`@dreamboard-games/sdk` package, reference games, portable UI fixtures, and the
SDK UI Workbench. Keep this file short and operational; durable design detail
belongs in `docs/`.

## Environment And Commands

- Use `pnpm`, not npm or yarn.
- Target Node 24 or newer. The pinned package manager is `pnpm@10.4.1`.
- Install with `pnpm install --frozen-lockfile`.
- `pnpm check` is the authoritative browser-free clean-checkout gate and must
  remain read-only.
- Prefer the narrowest focused check while iterating, then run the relevant
  aggregate gate before handoff.

## Repository Boundaries

- `packages/sdk` owns the only published package. Other workspace packages are
  private implementation inputs.
- Each `examples/reference-games/<game>/` root is one isolated authored game
  workspace. Its `rule.md` is gameplay authority; generated workspace
  contracts beneath that root are ignored local build products.
- UI fixture compiler code lives under `scripts/ui-fixtures/`.
- Workbench runtime and presentation live under `packages/ui-workbench/`.
- UI orchestration, catalog generation, parity, and release-proof scripts live
  under `scripts/ui/`.
- A consuming product may execute real-host parity from immutable SDK outputs,
  but the public SDK must never locate or invoke that consumer checkout.

## Generated UI Workflow

Do not hand-edit generated workspace contracts, Workbench fixtures, fixture
indexes, scenario catalogs, or generated docs. Change the authored source or
owning generator. Materialize before any consumer reads the Workbench catalog;
the canonical commands enforce that order:

```sh
pnpm ui:workbench:materialize
pnpm ui:catalog:generate
pnpm docs:generate
```

Generated surfaces include:

- `examples/reference-games/<game>/shared/generated/` (ignored)
- `build/ui-workbench/generated/` (ignored)
- `fixtures/ui/component-scenario-index.json`
- `docs/ui-agent-iteration.md`
- `docs/reference-games.md`
- `docs/reference/agent-api.md`
- `packages/sdk/REFERENCE.md`

Run `pnpm ui:catalog:check`, `pnpm docs:check`, and `pnpm generate:check` to
detect stale generated output. Never stage ignored materialized output.

## Coding-Agent Scenario Loop

1. Read the game-local `rule.md` and one typed source under
   `test/scenarios/`; do not start from a base state or generated projection.
2. Run `dreamboard test inspect <scenario> --perspective player:<seat> --at
<checkpoint>` to observe one state, its views, blockers, action inputs, and
   sorted checkpoint catalog as JSON.
3. Run `dreamboard test explore <scenario> --perspective player:<seat> --at
<checkpoint>` and
   copy a returned concrete replay-accepted `candidate.command` into the same
   typed scenario source.
4. Run `pnpm verify` in the isolated game workspace. Use its authored UI
   scenario checkpoints in the Workbench; do not check in projected state.
5. Launch the same authored source with `dreamboard dev` when host-level
   iteration is needed.

All nine reference games are complete multi-turn teaching games. Their stable
directory IDs, manifest IDs, and release slugs may differ from public display
names. All nine isolated `pnpm-lock.yaml` files are intentional public-package
provenance; landing-page selection is owned by the product repository.

## Coding-Agent UI Loop

1. Use `fixtures/ui/component-scenario-index.json` to map the changed component
   to representative scenarios.
2. Use `pnpm ui:storybook` for isolated presentation and local component state.
   Use `pnpm ui:workbench --scenario <scenario-id>` for runtime-generated UI.
   The normal loop is backend-free: protocol scenarios exercise primitive
   contracts, and reference-game scenarios replay real reducer output through
   the fixture transport.
3. The root wrapper builds the SDK once and focused Workbench runs materialize
   only the owning game. Source changes rebuild that selected partition and
   retain the last good output after errors. Use `pnpm ui:workbench:src` to
   resolve the SDK from source (dev server only; every
   `vite build` and the proof path still consume `dist`).
4. Run the narrowest focused check, such as
   `pnpm ui:test --component <name>` or
   `pnpm ui:test --scenario <scenario-id>`.
5. Run `pnpm ui:test:changed --base <ref>` and the relevant aggregate gate
   before handoff. Preserve the generated evidence receipt.

See `docs/reference/ui-iteration-loops.md` for the two-loop model (Storybook
proves pixels, Workbench proves behavior) and the motion-gate rule.
See `docs/ui-agent-iteration.md` for generated command selection.
See `docs/reference/ui-workbench-behavioral-proof.md` for Workbench replay
lessons about semantic evidence, mobile card targets, and screenshot limits.
See `docs/reference/ui-sdk-mobile-hand-and-card-interactions.md` for controlled
hand layout, pointer arbitration, drag ownership, and mobile accessibility.

## UI Evidence Invariants

- A scenario capability is earned from an executable replay recipe. Do not add
  catalog capability tags from descriptive metadata alone.
- Fixture expected digests must come from compiling and executing the reference
  runtime path.
- Browser scenario tests must resolve the semantic request, validate actuator
  identity, perform the physical browser action, flush the host, and compare
  measured projection, semantic, and submission digests.
- Never construct a passing evidence receipt by copying values from
  `fixture.expected`.
- Preserve screenshots and measured evidence in the run receipt. A browser test
  that passes without writing measured evidence is a failure.
- The required Workbench scenarios are `hearts.sealed-pass.mobile`,
  `hex-network-trading.growing-network.desktop`, and
  `worker-placement-tableau.first-craft.desktop`. Together they cover mouse
  click, browser touch tap, physical pointer drag, runtime draft mutation,
  Chromium/WebKit phone layout, Axe, submission, semantic snapshots, and digest
  evidence.
- Hearts remains the sole required packed real-host parity scenario. Physical
  mobile touch-drag and real-device canaries remain follow-up coverage.

## Verification

For UI fixture, Workbench, or reference-game changes, run:

```sh
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
pnpm ui:runtime:test
pnpm ui:test
pnpm ui:hard-cut:check
pnpm docs:check
```

Use `pnpm ui:test:changed --base <ref>`, `pnpm ui:test --component <name>`, or
`pnpm ui:test --capability <name>` only for focused iteration. Shared runtime,
fixture schema, browser-interaction, or evidence changes require the full UI
suite.

## Parity And Release Proof

- Fixture expectation, source Workbench, and packed real-host observations must
  be independently materialized, carry explicit provenance, and match. Never
  synthesize a measured observation from fixture metadata.
- Real-host parity is consumer-owned. Supply its receipt explicitly with
  `pnpm verify:release --real-host-parity-receipt <path>` when that proof is
  required; the SDK validates it without invoking the consumer.
- `pnpm verify:release` must pack once and verify the exact tarball intended for
  publication. A physical iOS Safari and Android Chrome canary is optional
  follow-up evidence unless `--require-device-canary` is supplied.

See `docs/ui-agent-iteration.md` for generated command selection and
`docs/architecture/ui-test-surfaces.md` for the durable test-surface
architecture.
