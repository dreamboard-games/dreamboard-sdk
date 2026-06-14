# Agent-First Authoring DX And Runtime Consolidation

Status: proposed implementation handoff after the SDK architecture review on
2026-06-12.

Related plans and references:

- [0.3.0-alpha.0 hard-cut restructure notes](../../release-notes-0.3.0-alpha.0.md)
- Private monorepo perf evidence plan:
  `docs/exec-plans/performance-evidence-and-load-suite-hard-cut/` (dreamboard
  checkout)
- Agent-facing skill docs: `skills/dreamboard/` in the public
  `dreamboard-games/dreamboard` checkout

## Executive Decision

The SDK architecture (manifest-driven codegen → literal-typed contracts →
contract-bound authoring → trusted reducer behind a wire ABI → sandboxed
plugin UI) is retained as-is. This plan does **not** restructure packages,
subpath ownership, or the publication boundary.

What changes is the **economics of the authored surface**, because the primary
SDK users are coding agents:

1. Game code is authored with **zero type parameters**. The contract already
   carries every fact the curried `define*<Contract, typeof schema>()`
   factories ask authors to repeat; a contract-bound authoring object removes
   the repetition and the wrong-phase-schema failure class.
2. **Error codes become contract-declared literal unions** with a first-class
   "why is this interaction unavailable" diagnostic, replacing prose
   string-matching and the duplicated `errorCode` declarations.
3. **Generated data leaves generated TypeScript.** The 10.6k-line
   `staticBoards` literal becomes a JSON artifact with thin generated types,
   cutting per-workspace generated TS by ~60%.
4. The reducer transaction layer moves from **clone-per-op to
   clone-per-transaction**, and the `Proxy`-based transaction object becomes a
   plain object.
5. The `/reducer` facade shrinks from ~340 exports to a budgeted core; the
   `XOfTable` / `XOfManifest` / `XOfState` / `XOfDefinition` extraction-type
   taxonomy moves to a `./reducer/advanced` subpath consumed by generated
   code, not by authors.
6. Observability becomes a **capability injected into the trusted runtime**
   (diagnostics sink + dispatch-trace exposure), replacing ad-hoc `console.*`
   and the `__DREAMBOARD_AUTHORING_WARNINGS__` host global.
7. Contract **fingerprinting** turns stale base-states / stale-session decode
   failures into actionable, typed errors ("run `dreamboard test generate`").
8. The agent-facing API reference is **generated from the export surface** and
   drift-gated in CI, and shipped inside the published tarball so pinned
   workspaces always carry docs that match their installed SDK.

Phase 0 additionally fixes outright packaging defects (dependencies listed in
both `dependencies` and `peerDependencies`, `tailwindcss` as a runtime
dependency).

## Why Now

Evidence gathered during the review (re-measure before starting; commands in
each phase):

| Measurement                           | Value                                                                                                                       | Source                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/reducer` facade export count        | ~340 names (~200 are `XOf*` type utilities)                                                                                 | `packages/sdk/src/reducer.ts`, export-surface snapshot              |
| Generated TS per workspace            | ~17,200 lines vs ~5,300 authored                                                                                            | frontier-trails `shared/` vs `app/`+`ui/`                           |
| `staticBoards` literal                | 10,645 lines of `manifest-runtime.ts` (14,569 total)                                                                        | frontier-trails                                                     |
| Workspace typecheck (app / ui / test) | 1.97s / 3.55s / 2.75s (`tsc --extendedDiagnostics`, M-series laptop)                                                        | frontier-trails                                                     |
| Table clones per reduce               | 1 per `tx.*` op call (deep clone + query rebuild)                                                                           | `packages/sdk/src/reducer/transaction.ts`, `reducer/table/clone.ts` |
| Availability classification           | string-compares prose `"Not your turn"` and `"INSUFFICIENT_RESOURCES"`                                                      | `packages/sdk/src/reducer/bundle/trusted/interaction-descriptor.ts` |
| Packaging                             | `react`, `react-dom`, `zod`, `framer-motion` in both `dependencies` and `peerDependencies`; `tailwindcss` in `dependencies` | `packages/sdk/package.json`                                         |

Typecheck performance is healthy; the cost being paid is **concept count,
ceremony, and iteration-loop friction**, which directly tax agent context
windows and produce plausible-but-wrong API usage.

## Phases

| Phase | Title                                                                                                            | Breaking?                     | Release train    | Depends on       |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------- | ---------------- |
| 0     | [Packaging and dependency hygiene](phase-00-packaging-and-dependency-hygiene.md)                                 | No (bugfix)                   | next 0.3.x alpha | —                |
| 1     | [Contract-bound authoring factories](phase-01-bound-authoring-factories.md)                                      | No (additive)                 | 0.3.x alpha      | —                |
| 2     | [Typed error codes and interaction diagnostics](phase-02-typed-error-codes-and-interaction-diagnostics.md)       | No (additive + wire-additive) | 0.3.x alpha      | benefits from 1  |
| 3     | [Topology data extraction from generated TS](phase-03-topology-data-extraction.md)                               | Generated-files-only (regen)  | 0.3.x alpha      | —                |
| 4     | [Transaction commit model](phase-04-transaction-commit-model.md)                                                 | Yes (behavioral)              | 0.4.0 alpha      | 4A net first     |
| 5     | [Public surface consolidation](phase-05-public-surface-consolidation.md)                                         | Yes (import paths)            | 0.4.0 alpha      | 1, 3             |
| 6     | [Observability capability](phase-06-observability-capability.md)                                                 | No (host-additive)            | 0.3.x or 0.4.0   | benefits from 4A |
| 7     | [Contract fingerprint and stale-artifact recovery](phase-07-contract-fingerprint-and-stale-artifact-recovery.md) | No (additive)                 | 0.3.x alpha      | —                |
| 8     | [Generated agent reference and docs gates](phase-08-agent-reference-and-docs-gates.md)                           | No                            | after 5 settles  | 5                |

Recommended execution order: **0 → 1 → 2 → 3 → 7 → (4A, 6) → 4B → 5 → 8.**
Phase 4's revised performance evidence was accepted on 2026-06-14; Phase 5 may
proceed from the Phase 4 clone-count tests and benchmark receipt.

Phases 0–3 and 7 are additive and ship on the existing 0.3.x alpha train,
each followed by `pnpm local-registry:publish` + `pnpm sdk:repin --receipt`
in the private monorepo and `pnpm regen:examples`. Phases 4 and 5 are a
coordinated 0.4.0 hard cut with release notes in the established
old→new-table format (see the 0.3.0-alpha.0 notes as the template).

## Hard-Cut Rules For This Plan

1. No compat shims for moved type exports (phase 5) — workspaces regenerate,
   matching the 0.3.0 precedent. Authored-code imports that the examples
   actually use stay public (the keep-list is derived by audit, not by guess).
2. The curried `defineInteraction<C, S>()(...)` factories remain exported and
   working through 0.4.0. They are documented as the low-level form; scaffolds,
   examples, and docs switch to the bound authoring object.
3. Behavioral changes to the transaction layer land only after the
   characterization net (phase 4A) is green on the pre-change implementation.
4. Every phase that touches generated output bumps the workspace-codegen
   ownership/seed version and updates the codegen integration tests that
   compile generated output in temp projects.
5. Wire/ABI changes are additive-only in this plan (`reducer-contract` JSON
   schema gains optional fields; conformance fixtures updated in lockstep).

## Cross-Repo Touchpoints

This repo owns the SDK and codegen. Three external surfaces are affected;
each phase lists its own touchpoints, summarized here:

- **Private monorepo** (`dreamboard` checkout): repin via Verdaccio receipt,
  `pnpm regen:examples`, `pnpm verify:dev` / `verify:browser` /
  `verify:package` lanes; gameplay executor adopts the diagnostics sink
  (phase 6); compiler-service admission must admit workspace JSON imports
  (phase 3).
- **Public CLI repo** (`dreamboard-games/dreamboard` checkout): scaffold
  templates pick up `app/authoring.ts` seeds (phase 1), `dreamboard test`
  preflights fingerprints (phase 7), skill docs reference the generated API
  reference and gain a typecheck harness for embedded code samples (phase 8).
- **Backend (Kotlin)**: tolerant-reader for the additive wire fields
  (phases 2, 7). No required backend changes.

## Out Of Scope (Deliberately)

Recorded so they are not re-litigated mid-implementation:

- **Thin workspaces** (compiler-service-side codegen so workspaces contain
  only authored code). Correct long-term direction; it is a sync/compile
  pipeline re-architecture owned by the private monorepo, not the SDK. Phase 3
  reduces the pain in the meantime.
- **Sandbox perimeter hardening** (isolated-vm / jail as the security
  boundary instead of admission scanning). Owned by the gameplay-executor
  plans in the private monorepo. Phase 6 removes one scanner special-case
  (`__DREAMBOARD_AUTHORING_WARNINGS__`) as a side effect.
- **UI dependency diet** (headless/styled split, framer-motion optionality).
  Worth a separate plan once `ui/` consumers are surveyed; phase 0 only fixes
  the peer/direct double-listing defect.
- Replacing zod, React, or the wire serialization. Not warranted.

## Definition Of Done For The Whole Plan

- A new scaffolded workspace contains **no type parameters and no manual type
  annotations** in `app/` game code.
- `app/` authored code imports at most: the bound authoring object, the
  workspace contract (`ids`, `literals`, types), zod, and SDK value helpers.
  No `XOf*` extraction types appear in scaffolds, examples, or docs.
- Generated TS per workspace ≤ ~6k lines for a frontier-trails-class game.
- A failed/unavailable interaction is explainable in one call from a test or
  the dev host, with rule ids and contract-typed error codes.
- A 5-op reduce performs exactly one table clone, with same-machine benchmark
  evidence recorded for the accepted Phase 4 fixture.
- `pnpm check` fails if the generated agent reference drifts from the export
  surface.
