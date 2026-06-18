# UI Iteration Loops

Iterating on the SDK and its UI components uses **two surfaces that prove
different things**, joined by one digest contract. Keeping them separate is what
lets you move fast on pixels and motion while never weakening the behavioral
proof that the framework matches a real `dreamboard` host.

## Two surfaces, split by what they prove

| Surface            | Command                          | Proves                                                           | Sees the SDK as               | Speed              |
| ------------------ | -------------------------------- | ---------------------------------------------------------------- | ----------------------------- | ------------------ |
| **Storybook**      | `pnpm ui:storybook`              | _Presentation_ — pixels, layout, focus/hover, motion, a11y       | **source** (`packages/sdk`)   | HMR, instant       |
| **Workbench**      | `pnpm ui:workbench --scenario X` | _Behavior_ — semantics, actuator identity, projection/submission | **build** (`dist`) by default | rebuild, then live |
| **Runtime visual** | `pnpm ui:test:runtime-visual`    | _Stable composed states_ — selected runtime screenshots          | **build** (`dist`)            | explicit snapshots |

- **Build presentation in Storybook.** It reads SDK source, so component edits
  hot-reload with no rebuild. This is where "pretty, accessible, responsive"
  actually gets made. Run a11y here too — Axe and the layout assertions are the
  gate, not eyeballing.
- **Prove behavior in the Workbench.** It runs the **real**
  `createPluginRuntimeClient` and the **real** `@dreamboard-games/sdk/ui`
  components; the only thing swapped for "no backend" is the transport, which
  replays a `PluginProtocolTape` _compiled from the reference game's actual
  reducer_. Use [`fixtures/ui/component-scenario-index.json`](../../fixtures/ui/component-scenario-index.json)
  to map a changed component to its scenarios.
- **Keep runtime visual baselines small.** They cover a few representative
  composed states that semantic digests cannot review visually: selected mobile
  cards, board targeting, route placement, worker placement, and prompt
  validation. Update them only with `pnpm ui:test:runtime-visual:update`.

Mental model: **Storybook proves pixels, the Workbench proves behavior, and the
theme motion-gate (below) is the membrane between them.**

## Inner loop without SDK rebuilds

By default the Workbench consumes the SDK's built `dist` so that what you inspect
is the exact artifact the parity proof and a real host ship. That costs a
`pnpm --filter @dreamboard-games/sdk build` before each inspection.

For a tight presentation/behavior inner loop you can opt into resolving the SDK
from **source** so component edits hot-reload in the Workbench too:

```sh
# Root: source mode + scenario route printing
pnpm ui:workbench:src --scenario hearts.pass-three.mobile

# Or directly in the workbench package
pnpm --filter @dreamboard-games/ui-workbench dev:src
```

Both set `DREAMBOARD_WORKBENCH_SDK=source`, which the Vite config honors **only
for the dev server** (`command === "serve"`). Every `vite build` — the Playwright
proof path and `ui:workbench:build` — stays on `dist` regardless of the
variable. The dev server prints a one-line banner so a session is never confused
about which copy it is looking at.

Use source mode to iterate; use the default (`dist`) path and the test commands
below for any behavior/parity claim, because those always measure the built or
packed artifact.

## Motion belongs to presentation, never to the digest

Motion is deliberately invisible in the behavioral proof. The fixture compiler
forces reduced motion (the reference UI mounts `ThemeProvider reducedMotion="force"`)
and asserts byte-identical output across a double compile, so time/`RAF`-based
animation cannot live in the digest path.

The rule that lets you add as much motion as you want without destabilizing the
proof:

- **Gate every animation behind the theme motion contract** —
  `theme.motion.reducedMotion === "true"` and/or `motionDuration(theme)` (which
  returns `"0ms"` when reduced). See `CardDragSurface` for the pattern.
- **An animation must not change any digest.** If toggling reduced motion
  changes the projection, semantic, or submission digest, the motion has leaked
  into behavior — that is a bug, not a feature.
- **Develop motion in Storybook** with `reducedMotion="auto"` (the default).
- **Regression-proof motion in the visual lane** (`pnpm ui:test:visual`), which
  is separate from the digest lane by design. Snapshot animations at
  deterministic keyframe states (seek to a fixed time, or
  `animation-play-state: paused`) so the visual snapshot is stable while still
  covering the animated look.

## Why the split is safe: the parity contract

The Workbench can stand in for a real host because confidence is earned by a
three-way digest triangle ([`scripts/ui/run-ui-parity.mjs`](../../scripts/ui/run-ui-parity.mjs)),
where three independently materialized observations must agree on projection,
semantic, and submission digests plus actuator identity:

1. **Fixture expectation** — baked at compile time.
2. **Source-Workbench observation** — measured by driving the real Workbench in a
   browser.
3. **Real-host observation** — the private monorepo runs the same fixture against
   the real host executor (`DREAMBOARD_INTERNAL_REPO`).

Two tripwires keep the surfaces honest: the render module's `uiContractFingerprint`
must equal the fixture's or loading throws (catches component-contract drift),
and real-host parity fails closed when the executor is unavailable. Never copy
values from `fixture.expected` to satisfy an observation — each leg measures
independently, which is what makes agreement meaningful. The boundary of this
proof is the **reference games**: parity holds for the patterns they cover, so
their breadth is the real lever on confidence.

## Backend-free command shape

The normal SDK UI loop does not need a backend. Protocol scenarios cover
primitive contracts directly from authored fixture tapes. Reference-game
scenarios replay reducer-produced protocol tapes through the fixture transport.
Use real-host parity only when proving the private product host integration.

## Command quick reference

| Goal                              | Command                                                   |
| --------------------------------- | --------------------------------------------------------- |
| Presentation / motion / a11y loop | `pnpm ui:storybook`                                       |
| Behavior loop (built SDK)         | `pnpm ui:workbench --scenario <id>`                       |
| Behavior loop (source SDK, HMR)   | `pnpm ui:workbench:src --scenario <id>`                   |
| Focused behavior check            | `pnpm ui:test --component <name>` / `--capability <name>` |
| Visual regression (motion)        | `pnpm ui:test:visual`                                     |
| Runtime visual baselines          | `pnpm ui:test:runtime-visual`                             |
| Update runtime visual baselines   | `pnpm ui:test:runtime-visual:update`                      |
| Changed-only gate                 | `pnpm ui:test:changed --base origin/main`                 |
| Real-host parity proof            | `pnpm ui:test:parity --require-internal`                  |

See [`ui-workbench-behavioral-proof.md`](./ui-workbench-behavioral-proof.md) for
how to earn a scenario capability with a replay recipe (and the mobile
single-tap / nested-gesture lesson), and [`../ui-agent-iteration.md`](../ui-agent-iteration.md)
for the generated command tiers and component→scenario map.
