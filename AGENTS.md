# Dreamboard SDK Agent Guide

This repository is the source of truth for the public
`@dreamboard-games/sdk` package, reference games, portable UI fixtures, and the
SDK UI Workbench. Keep this file short and operational; durable design detail
belongs in `docs/`.

## Environment And Commands

- Use `pnpm`, not npm or yarn.
- Target Node 24 or newer. The pinned package manager is `pnpm@10.4.1`.
- Install with `pnpm install --frozen-lockfile`.
- `pnpm check` is the authoritative clean-checkout gate and must remain
  read-only.
- Prefer the narrowest focused check while iterating, then run the relevant
  aggregate gate before handoff.

## Repository Boundaries

- `packages/sdk` owns the only published package. Other workspace packages are
  private implementation inputs.
- Reference-game source lives under
  `examples/reference-games/<game>/src/` and
  `examples/reference-games/shared/`.
- UI fixture compiler code lives under `scripts/ui-fixtures/`.
- Workbench runtime and presentation live under `packages/ui-workbench/`.
- UI orchestration, catalog generation, parity, and release-proof scripts live
  under `scripts/ui/`.
- The private product repository may consume immutable reference outputs and
  execute real-host parity, but it must not own editable copies of SDK reference
  games.

## Generated UI Workflow

Do not hand-edit generated UI fixtures, fixture indexes, scenario catalogs, or
generated UI docs. Change the owning reference source or generator, then run:

```sh
pnpm ui:fixtures:compile
pnpm ui:catalog:generate
pnpm docs:generate
```

Generated surfaces include:

- `fixtures/ui/reference-games/`
- `fixtures/ui/component-scenario-index.json`
- `packages/ui-workbench/src/catalog.ts`
- `docs/ui-agent-iteration.md`
- `docs/reference-games.md`

Run `pnpm ui:fixtures:check`, `pnpm ui:catalog:check`, and `pnpm docs:check` to
detect stale generated output.

## Coding-Agent UI Loop

1. Use `fixtures/ui/component-scenario-index.json` to map the changed component
   to representative scenarios.
2. Use `pnpm ui:storybook` for isolated presentation and local component state.
   Use `pnpm ui:workbench --scenario <scenario-id>` for runtime-generated UI.
3. Rebuild `@dreamboard-games/sdk` before inspecting Workbench changes because
   the Workbench consumes SDK build output. For a no-rebuild dev inner loop, use
   `pnpm ui:workbench:src` to resolve the SDK from source (dev server only; every
   `vite build` and the proof path still consume `dist`).
4. Run the narrowest focused check, such as
   `pnpm ui:test --component <name>` or
   `pnpm ui:test --scenario <scenario-id>`.
5. Run `pnpm ui:test:changed --base <ref>` and the relevant aggregate gate
   before handoff. Preserve the generated evidence receipt.

See `docs/references/ui-iteration-loops.md` for the two-loop model (Storybook
proves pixels, Workbench proves behavior) and the motion-gate rule.
See `docs/ui-agent-iteration.md` for generated command selection and
`docs/exec-plans/ui-agent-iteration-workbench/README.md` for the full workflow.
See `docs/references/ui-workbench-behavioral-proof.md` for Workbench replay
lessons about semantic evidence, mobile card targets, and screenshot limits.

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
- The required Workbench scenarios are `hearts.pass-three.mobile`,
  `hex-network-trading.place-route.desktop`, and
  `worker-placement-tableau.place-worker.desktop`. Together they cover mouse
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
- Real-host parity must fail closed when the internal executor is unavailable.
  Use `pnpm ui:test:parity --require-internal` when real-host proof is required.
- `pnpm ui:release-proof` must verify the exact tarball intended for publication
  and requires passing Hearts real-host parity. A physical iOS Safari and
  Android Chrome canary is optional follow-up evidence unless
  `--require-device-canary` is supplied.

See `docs/ui-agent-iteration.md` for generated command selection and
`docs/exec-plans/ui-agent-iteration-workbench/` for the full architecture and
phase history.
