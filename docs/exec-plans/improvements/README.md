# SDK Correctness, Security, and Release Hardening

> Placement note: the requested handoff uses the repository's phased
> `docs/exec-plans` conventions, but the active `improve` workflow permits
> advisory artifacts only under `plans/`. This family is implementation-ready
> and can be executed directly from this index.

## Status

- Status: Implemented
- Planned at: `d84c620` (`Release SDK 0.4.0 alpha`)
- Planned on: 2026-06-16
- Target train: next `0.4.0-alpha.*`

## Objective

Close the correctness, security, package-contract, and release gaps found in
the 0.4.0 SDK audit without reopening the source-closed package architecture.

This plan deliberately retains:

- one published package, `@dreamboard-games/sdk`;
- the current public subpath ownership and publication boundary;
- generated workspace contracts as the authoring/runtime bridge;
- the current reducer transaction model;
- automatic internal resolution rather than new manual author workflows.

## Phase Index

| Phase | Plan                                                                                       | Primary owner              | Priority | Depends on |
| ----- | ------------------------------------------------------------------------------------------ | -------------------------- | -------- | ---------- |
| 001   | [Establish authoritative verification](001-establish-authoritative-verification.md)        | SDK platform               | P0       | -          |
| 002   | [Isolate board-local topology](002-isolate-board-local-topology.md)                        | Codegen                    | P0       | 001        |
| 003   | [Make card-home materialization total](003-make-card-home-materialization-total.md)        | Codegen                    | P0       | 002        |
| 004   | [Reject unsafe manifest record keys](004-reject-unsafe-manifest-record-keys.md)            | Codegen                    | P0       | 003        |
| 005   | [Preserve card-location invariants](005-preserve-card-location-invariants.md)              | Reducer                    | P0       | 001        |
| 006   | [Align ingress and numeric mutation contracts](006-align-ingress-and-numeric-contracts.md) | Reducer ABI                | P0       | 001        |
| 007   | [Enforce workspace path containment](007-enforce-workspace-path-containment.md)            | Codegen + public CLI       | P0       | 001        |
| 008   | [Authenticate the plugin message channel](008-authenticate-plugin-message-channel.md)      | SDK runtime + private host | P0       | 001        |
| 009   | [Validate and bound recursive payloads](009-validate-and-bound-recursive-payloads.md)      | SDK runtime + reducer ABI  | P1       | 008        |
| 010   | [Enforce declaration/runtime export parity](010-enforce-package-export-parity.md)          | SDK packaging              | P1       | 001        |
| 011   | [Converge interaction-handle behavior](011-converge-interaction-handle-behavior.md)        | SDK runtime                | P1       | 001        |
| 012   | [Make plugin-state selectors selective](012-make-plugin-state-selectors-selective.md)      | SDK runtime                | P2       | 011        |
| 013   | [Harden release automation and refresh docs](013-harden-release-and-refresh-docs.md)       | Release engineering        | P1       | 002-012    |

## Recommended Execution Lanes

Phase 001 lands first. After that, use these lanes to reduce file conflicts:

1. Codegen lane: 002 -> 003 -> 004.
2. Reducer lane: 005 and 006 can proceed in parallel, then reconcile shared
   reducer tests before merge.
3. Security lane: 007 can run independently; 008 -> 009 is sequential.
4. Packaging lane: 010.
5. Runtime hook lane: 011 -> 012.
6. Release lane: 013 after all earlier phases are integrated.

The critical chain is:

```text
001
 |-- 002 -> 003 -> 004 --\
 |-- 005 -----------------|
 |-- 006 -----------------|
 |-- 007 -----------------|--> 013
 |-- 008 -> 009 ----------|
 |-- 010 -----------------|
 `-- 011 -> 012 ----------/
```

## Cross-Repository Boundaries

Two phases require coordinated pull requests:

- Phase 007:
  - this repository owns path classification and ownership versioning;
  - `<public-cli-checkout>` owns filesystem containment in the
    public CLI.
- Phase 008:
  - this repository owns the plugin-side protocol implementation;
  - `<product-checkout>` owns `ui-host-runtime` and preview-worker
    host implementations.

Do not flatten either phase into a single pseudo-codebase. Each repository must
have its own branch, tests, and recorded commit SHA. The coordinated phase is
complete only when both sides pass against the same local SDK snapshot.

## Release Decisions

- The protocol change in phase 008 is a coordinated hard cut. Do not retain an
  unauthenticated wildcard fallback.
- Omitted card homes become explicitly detached in phase 003. Compatibility
  constraints such as `allowedCardSetIds` do not imply initial placement.
- `GameInput.params` remains required, matching the reducer-contract schema.
- Resource amounts and deal counts use non-negative safe-integer semantics.
- Ownership contract version increments when phase 007 changes path behavior.

## Deferred Directions

These are valid follow-ups but are intentionally outside this hardening train:

- reduce the UI dependency set only after measuring installed and bundled cost;
- introduce a normalized codegen intermediate representation only when the
  next feature would otherwise duplicate analysis logic;
- precompute interaction indexes only after profiling demonstrates repeated
  scans are materially hot.

## Program-Level Done Criteria

- Every phase-specific test plan passes.
- `pnpm check` is read-only and passes from a clean checkout.
- A freshly packed SDK tarball installs into a disposable project and every
  public JavaScript subpath imports successfully.
- SDK declaration value exports exactly match runtime value exports.
- The public CLI cannot write, remove, or upload a path outside the workspace
  root.
- The plugin and host reject wrong-source, wrong-origin, wrong-channel, and
  pre-handshake messages.
- Release jobs use immutable action pins and grant OIDC only to the publish job.
- Alpha docs and release notes describe the actual 0.4.0 contract.

## Plan Maintenance

Before starting any phase:

1. Record `git rev-parse HEAD` in the implementation PR.
2. Re-open every file listed in that phase.
3. If the source contract has materially changed, update the phase plan before
   editing code.
4. Keep the phase branch scoped to its listed files unless a test proves an
   additional dependency.
