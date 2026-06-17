# UI Agent Iteration Workbench Plan Closeout

Date: 2026-06-17.

Status: complete for the required Workbench foundation across SDK and internal
repositories.

## Final Architecture And Ownership

- The SDK owns reusable UI primitives, generated authoring metadata, reference
  fixtures, Workbench scenarios, Storybook coverage, packed reference-consumer
  checks, and the release-proof receipt generator.
- The internal Dreamboard repo owns product-host replay, real-host UI parity,
  product harness verification, and designer-demo/product catalog wiring.
- Reference games are digest-pinned SDK artifacts. The internal repo consumes
  `examples/reference-bundle.lock.json` instead of editable published example
  source.
- Browser interaction scenarios use protocol `3.0.0`; portable SDK replay steps
  are the source of interaction semantics, while browser-driver details remain
  a private observation layer.

## Phase Results

| Phase                           | Result                                                                  |
| ------------------------------- | ----------------------------------------------------------------------- |
| 00 baseline                     | Accepted; baseline docs and inventory retained.                         |
| 01 migration                    | Accepted; UI package migration path established.                        |
| 02 fixture contract             | Accepted; fixture contract and replay digest checks in place.           |
| 03 runtime                      | Accepted; runtime APIs and fixture tests pass.                          |
| 04 Workbench                    | Accepted; Workbench routes and scenario catalog generated.              |
| 05 browser/visual/accessibility | Accepted for Hearts mobile, Hex desktop drag, and Worker desktop draft. |
| 06 ergonomics                   | Accepted for the Hearts portable reference boundary.                    |
| 07 parity                       | Accepted with distinct fixture, source, and packed real-host evidence.  |
| 08 CI/deletion/release proof    | Accepted; release workflow executes internal parity directly.           |

## Ergonomics Metrics

Phase 06 measured zero authored reference-game occurrences of the old manual
nesting and wrapper patterns:

| Pattern                                                         |                Before |                                 After |
| --------------------------------------------------------------- | --------------------: | ------------------------------------: |
| Manual `UI.Root` + `Game.Root` + `Phase.Switch` reference nests |                     0 |                                     0 |
| Separate `Interaction.Routes` plus panels                       |                     0 |                                     0 |
| Reference-game `useMobileHandTrayActive` calls                  |                     0 |                                     0 |
| Reference-game `renderSummary` / `renderActions` calls          |                     0 |                                     0 |
| Local reference-game `ActionPanel` / panel components           |                     0 |                                     0 |
| Simultaneous drafting custom mobile hand bypass                 | 1 documented boundary | retained as fixture-source limitation |

Phase 08 removes the remaining SDK-side compatibility surfaces and guards them
from returning.

## CI And Evidence

SDK closeout receipts:

- Storybook interactions:
  `artifacts/ui-stories/2026-06-17T11-51-34-576Z/receipt.json`
- Storybook visuals:
  `artifacts/ui-visual/2026-06-17T11-51-55-838Z/receipt.json`
- Workbench matrix:
  `artifacts/ui/2026-06-17T11-52-18-778Z/receipt.json`
- Packed reference consumers:
  `build/reference-games/packed-consumer-receipt.json`
- SDK parity:
  `artifacts/ui-parity/2026-06-17T11-53-19-987Z/receipt.json`
- Required drag/draft foundation release proof:
  `artifacts/ui-release-proof/drag-draft-foundation/receipt.json`

The final release proof used SDK tarball
`sha256:a381c65755a65f0f9f6e4fbd8c12d42b2d2349137388f185c6c59d832312fd3f`.
Its parity receipt retains the packed real-host observation at
`artifacts/ui-parity/2026-06-17T11-53-19-987Z/internal/observations/hearts.pass-three.mobile.json`.

No retry-only pass was accepted as release evidence.

The final release-proof run passed every required gate. It retained measured
Workbench evidence for Hearts mobile interaction, Hex physical desktop drag,
and Worker runtime draft, plus distinct fixture-expectation, source-Workbench,
and packed-real-host observations for `hearts.pass-three.mobile`.

## Deleted APIs And Paths

SDK deletions:

- public `useMobileHandTrayActive` export;
- generated `renderSummary` and `renderActions` authoring prop path;
- old notebook CSS classes `wobbly-border` and `hard-shadow`;
- stale `scripts/ui/check-reference-ui-ergonomics.mjs`;
- stale `scripts/ui/select-impacted-scenarios.mjs`.

Internal deletions:

- editable published examples for `frontier-trails`, `sketchbook`, `hearts`,
  `artisans-guild`, and `sushi-go`;
- public demo assets for `frontier-trails`, `hearts`, and `sketchbook`;
- old published-example typecheck/manifest/refresh/sync scripts;
- old demo gallery registrations and Optopus demo registrations;
- old protocol `2.0.0` hard-cut expectations.

## Retained Exceptions

- Empty parent directories `examples/published` and `apps/web/public/demos`
  remain as repository anchors.
- Historical phase docs and receipts may still mention deleted names as
  migration history.
- Mobile touch-drag, additional scenario families, and the real-device mobile
  canary remain optional follow-up coverage.

## Follow-Up

- Expand mobile touch-drag and additional scenario families, and optionally
  enable `pnpm ui:release-proof --require-device-canary`.
- Continue the separate real-designer demo pipeline so product demo pages are
  populated by designer-owned games rather than editable published examples.
