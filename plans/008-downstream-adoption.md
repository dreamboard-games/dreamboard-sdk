# Public runtime and private product adoption

This document records the accepted downstream scope. Current completion and
verification evidence live in [the delivery receipt](delivery-receipt.md).
Consumers use exact published package versions without local package links or
tarball dependencies.

## Public runtime and offline host

The public repository `dreamboard-games/dreamboard` owns browser-gameplay-runtime
and dev-host.
Do not resurrect the retired CLI release-set workflow. Read its AGENTS first.

Migrate package imports to the SDK's four subpaths and use the canonical SDK
wire schemas, bundle assertion and selected-seat frame materializer. Worker
execution remains inside a terminable worker in an opaque reducer iframe.
Authored UI remains in a separate opaque iframe. Full state and persistence
callbacks never cross the UI bridge. A fresh worker for each operation must
preserve pending steps, RNG and initialized options through serialized state.

The required `packages/browser-gameplay-runtime/src/gameplay-ui.ts` admission
uses session-owned retry identity before basis validation: an exact previously accepted command returns
its stored result and current frame, while reused ID with changed payload is
rejected. Handle both submit and cancel with the same authority. Keep queued
operation ordering and original actor/basis. Do not infer missing ACKs from
frames or silently rewrite stale intent.

`index.ts` owns state commit: project, persist, then replace saved state. Every
accepted intermediate step follows this path before acknowledgement. Restore
loads a checkpoint without initialization/replay, and its UI transport revision
must be fresh. Seat changes replace the UI/source lifetime without replaying
queued commands for another seat. Static manifest projection never supplies a
private seat as a spectator fallback.

Update dev-host initialization options, generated scaffold imports, examples,
package consumer proof and docs. Run public `pnpm check` and `pnpm verify:package`
with installed packages; prove both browser engines supported by that lane,
seat privacy, worker termination, step recovery/cancel and rejected-final-step
retention. Preserve existing operator constraints and sandbox tests.

## Private adoption

Use an isolated checkout from `/Users/mac/code/internal`. Update private OpenAPI
inputs and regenerate Kotlin/TypeScript outputs; never hand-edit generated DTOs.
The main gameplay boundaries are `apps/gameplay/src/session.ts` and
`connection.ts`, `packages/ui-host-runtime`'s gateway/bridge/session model, and
the private manifest/game-messages schemas. Follow current repo instructions
and relevant state-sync/contract skills when editing them.

Retain committed retry lookup before basis rejection and exact revision checks.
Accepted steps persist like other accepted commands; history restore assigns
the current head a fresh version, preserving checkpoint pending selections.
Update options, actor domains, ordinary player records, static boards and the
single seat view across the full boundary. Keep selected-seat materialization
before websocket/iframe delivery. Delete replaced fields and compatibility paths.

The old `PackedSdkCandidateCompatibilityTest.kt` testing-compiler import must
migrate to the new scenario/checkpoint consumer proof. Update exact SDK/runtime/
dev-host pins using the owning repository commands; do not vendor the public
source or public skills into internal.

## Release evidence

### Verified reducer ownership

The current reducer state boundary is TypeScript: gameplay worker admission uses
SDK Zod schemas, and the store persists/restores its JSON state directly. Kotlin's
GameplayAuthorityControlClient consumes separate generated service envelopes.
Preserve those OpenAPI-owned DTOs.

The old engine-core `com.dreamboard.reducer.contract.ReducerContract.kt` has no
production consumers: its top-level symbols have no Kotlin/Gradle references
outside that file and ReducerRuntimeLogEntrySerializationIntegrationTest.kt.
The `gameplayStateJson` codec is used only by that test. Delete these dead artifacts
in the adoption cut and retain meaningful worker malformed-result, PostgreSQL
state/log roundtrip, and session retry/restore/reload proof. Do not introduce a
new Kotlin generator or schema validator for an unused boundary. This deletion
was prepared at `5e9234d38` in
[internal PR #531](https://github.com/dreamboard-games/dreamboard-internal/pull/531),
with focused Kotlin compilation/control-client tests, ktlint and the complete
repository gate passed. Its source base is `bcf3375ed` from origin/main; the
working tree is clean. No hosted checks or review threads were reported at that
exact head on submission.

No current public or internal executable/configuration consumer reads the private
reducer-runtime.schema.json file. Historical plan references are not consumers.

### Package sequence

Delivered npm cohort: SDK `0.5.0-alpha.3`, browser runtime `0.1.0-alpha.2`,
and dev-host `0.2.0-alpha.2`. The dependency order is SDK, runtime, then dev-host,
with dev-host pinning the newly published runtime; internal pins the exact cohort.
Never reuse a published version. Exact source revisions, workflow links and
registry integrities are recorded in [the delivery receipt](delivery-receipt.md).

Use reviewed immutable release candidates and repository publication workflows.
The SDK publish workflow requires default-branch source and protected release
OIDC/provenance; the public workflow supports a candidate-only run. Do not claim
publication or installed proof from a local build or PR check.

Private verification includes `authoring:cohort:check`, `verify:offline`, normal
`pnpm check`, dependency closure and the required integration/browser lanes.
Record receipt paths, exact candidate SHAs, package versions and final PR heads.
No staging/production infrastructure operation is part of this delivery.

### Public event propagation

Adopt required engine-owned `runtime.events` and selected-seat `frame.events`.
The SDK materializer reads the projected latest public batch; public host
`GameplaySnapshot`/`gameplay-ui.ts` and private `apps/gameplay/src/projection.ts`
must propagate it without recreating an event cache from dispatch callbacks.
Existing serialized reducer state persistence/restoration carries the batch.
Update UI-host session/bridge/screenshot models and canonical/private schema
consumers so they do not strip the field. Worker diagnostic logs remain host-only
and must never populate gameplay events. Restores expose checkpoint event data;
reading it must not trigger notification replay. Exact retries return saved
results without dispatching or emitting again.
