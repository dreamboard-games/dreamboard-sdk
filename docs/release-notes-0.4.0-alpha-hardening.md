# 0.4.0 Alpha Hardening Notes

This alpha train closes the SDK correctness, security, package-contract, and
release gaps tracked in `docs/exec-plans/improvements`.

## Contract Corrections

- Board materialization is board-local: runtime boards no longer inherit spaces
  or containers from other authored boards.
- Every accepted card home materializes an explicit component location.
  Omitted card homes start detached, even when a zone lists a compatible card
  set.
- Prototype-sensitive manifest IDs and record keys are rejected before
  generation or materialization.
- Card collection membership and `componentLocations` are maintained as one
  invariant. Failed moves and deals leave state unchanged.
- `GameInput.params` is required and runtime ingress follows the generated
  reducer contract.
- Resource amounts and deal counts use non-negative safe-integer semantics.
- Workspace ownership contract version `31` rejects unsafe project paths before
  ownership classification.
- Plugin runtime traffic uses protocol version `2` with per-iframe channel
  binding. Wrong-source, wrong-origin, wrong-channel, and pre-handshake messages
  are rejected.
- Runtime JSON payloads are structurally bounded before recursive parsing,
  canonicalization, or state mutation.
- Public TypeScript declaration value exports are checked against runtime
  JavaScript exports, and the packed SDK tarball is smoke-tested in a disposable
  consumer.

## Release Hardening

- CI calls the authoritative read-only `pnpm check` gate.
- Alpha publishing verifies first, uploads the exact SDK tarball artifact, and
  publishes that artifact with provenance from a separate OIDC-enabled job.
- Third-party GitHub Actions are pinned to immutable commit SHAs.
- Dependabot tracks GitHub Actions updates.

## Integration Receipts

Record the exact SDK, public CLI, host, preview-worker, and packed-consumer SHAs
in the implementation pull request that publishes this train.
