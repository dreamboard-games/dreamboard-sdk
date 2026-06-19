# Reference Game Source Authority

Status: accepted

Date: 2026-06-19

## Decision

The root of each SDK reference game is the sole editable teaching workspace.
After the reference-game teaching-source hard cut, game rules, manifests,
reducers, projections, UI, behavior scenarios, and UI scenarios all live under:

```text
examples/reference-games/<game-id>/
```

The public SDK owns `ReferenceGameSourceManifest`. That manifest identifies the
source objects, game entrypoints, teaching metadata, and content digest for the
canonical reference-game source. It does not include release policy, demo
deployment state, agent-runner placement, or environment-specific admission
evidence.

The private release system owns `ReferenceGameSourceAdmission`. Admission binds
one immutable source archive to an exact SDK package artifact and records the
verification that made that source consumable by internal release tooling.

Workbench fixture modules are generated proof artifacts. They may record the
SDK source-manifest digest and forward to the authored UI, but they are not an
editable game implementation and must not define alternate rules, reducers, or
projection models.

Demo release and agent-runner consume the same source admission. Neither layer
may independently clone, identify, or edit SDK reference-game source after the
hard cut.

No compatibility fallback is permitted after Phase 03 of the hard cut. Legacy
fixture-sidecar source and private runner-owned examples must be deleted rather
than retained as shadow authorities.

## Consequences

- Content identity is SDK-owned and public.
- Verification identity is internal and release-owned.
- Fixture compilation and packed verification must execute real teaching
  workspaces.
- Generated fixtures remain disposable outputs derived from source, not source.
