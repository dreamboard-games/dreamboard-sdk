# UI Agent Iteration Workbench Plan Closeout

Date: 2026-06-17.

Status: source-closed across SDK and internal repositories; publish release
proof remains gated by the Phase 05 real-device canary receipt.

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

| Phase | Result |
| --- | --- |
| 00 baseline | Accepted; baseline docs and inventory retained. |
| 01 migration | Accepted; UI package migration path established. |
| 02 fixture contract | Accepted; fixture contract and replay digest checks in place. |
| 03 runtime | Accepted; runtime APIs and fixture tests pass. |
| 04 Workbench | Accepted; Workbench routes and scenario catalog generated. |
| 05 browser/visual/accessibility | Source accepted; real-device canary remains release-gate evidence. |
| 06 ergonomics | Accepted; generated docs and SDK authoring surfaces simplified. |
| 07 parity | Accepted; SDK source/packed parity and internal real-host parity passed. |
| 08 CI/deletion/release proof | Source accepted; final publish receipt awaits real-device canary. |

## Ergonomics Metrics

Phase 06 measured zero authored reference-game occurrences of the old manual
nesting and wrapper patterns:

| Pattern | Before | After |
| --- | ---: | ---: |
| Manual `UI.Root` + `Game.Root` + `Phase.Switch` reference nests | 0 | 0 |
| Separate `Interaction.Routes` plus panels | 0 | 0 |
| Reference-game `useMobileHandTrayActive` calls | 0 | 0 |
| Reference-game `renderSummary` / `renderActions` calls | 0 | 0 |
| Local reference-game `ActionPanel` / panel components | 0 | 0 |
| Simultaneous drafting custom mobile hand bypass | 1 documented boundary | retained as fixture-source limitation |

Phase 08 removes the remaining SDK-side compatibility surfaces and guards them
from returning.

## CI And Evidence

SDK closeout receipts:

- Storybook interactions:
  `artifacts/ui-stories/2026-06-17T10-12-38-333Z/receipt.json`
- Storybook visuals:
  `artifacts/ui-visual/2026-06-17T10-12-54-551Z/receipt.json`
- Workbench matrix:
  `artifacts/ui/2026-06-17T10-13-10-776Z/receipt.json`
- Packed reference consumers:
  `build/reference-games/packed-consumer-receipt.json`
- SDK parity:
  `artifacts/ui-parity/phase-08-local/receipt.json`

Internal closeout receipts:

- Real-host parity:
  `/Users/mac/code/dreamboard/build/verification/2026-06-17T10-14-23-675Z-1b4f3fd0/ui-parity/receipt.json`

Observed local durations:

- `pnpm ui:check`: passed in one aggregate run; Workbench matrix emitted
  receipt `artifacts/ui/2026-06-17T10-13-10-776Z/receipt.json`.
- Packed reference consumers: passed against SDK tarball
  `sha256:db66abff32b931a43acf044d755fd41b168140b1d1dd5ef8cadf9e61f59a55a4`.
- Internal real-host parity: passed in 4,964 ms.

No retry-only pass was accepted as release evidence.

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
- The real-device mobile canary is not produced by this local source run; it is
  an external release-publish input.

## Follow-Up

- Run the Phase 05 real-device canary on real iOS Safari and Android Chrome,
  then invoke `pnpm ui:release-proof --device-canary-receipt <receipt>`.
- Continue the separate real-designer demo pipeline so product demo pages are
  populated by designer-owned games rather than editable published examples.
