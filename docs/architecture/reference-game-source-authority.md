# Reference Game Source Authority

Status: accepted

Date: 2026-06-19

## Decision

The root of each SDK reference game is the sole editable teaching workspace.
Game rules, manifests, reducers, projections, UI, behavior scenarios, and UI
scenarios all live under:

```text
examples/reference-games/<game-id>/
```

The game-local `rule.md` is gameplay and theme authority. Stable directory IDs,
manifest IDs, and release slugs remain technical identity even when the public
display name changes. All nine workspaces are complete multi-turn games and
intentionally retain separate `pnpm-lock.yaml` files as exact public-package
provenance. The product repository alone selects which admitted games appear on
its landing page.

Agents author one typed source under `test/scenarios/`. JSON inspection and
exploration discover perspective-visible state, blockers, inputs, and concrete
replay-accepted commands at its checkpoints; reducer tests, Workbench
checkpoints, and product-demo replay derive from that scenario. Base states and
generated projections are not alternate authoring modes.

The public SDK owns `ReferenceGameSourceManifest`. That manifest identifies the
source objects, game entrypoints, teaching metadata, and content digest for the
canonical reference-game source. It does not include release policy, demo
deployment state, agent-runner placement, or environment-specific admission
evidence.

The private release system owns `ReferenceGameSourceAdmission`. Admission binds
one immutable source archive to an exact SDK package artifact and records the
verification that made that source consumable by internal release tooling.

Workspace contracts, projected test state, Workbench fixture modules, catalogs,
and checkpoints are generated local proof artifacts. They may record the SDK
source-manifest digest and forward to the authored UI, but they are not an
editable game implementation and must not define alternate rules, reducers, or
projection models. Reference workspace contracts materialize beneath ignored
game-local paths; Workbench output materializes beneath the ignored
`build/ui-workbench/generated/` root.

Demo release and agent-runner consume the same source admission. Neither layer
may independently clone, identify, or edit SDK reference-game source after the
hard cut.

No compatibility fallback is permitted. Legacy fixture-sidecar source and
private runner-owned examples must not be retained as shadow authorities.

## Consequences

- Content identity is SDK-owned and public.
- Verification identity is internal and release-owned.
- Fixture compilation and packed verification must execute real teaching
  workspaces.
- Generated fixtures remain disposable outputs derived from source, not source.
