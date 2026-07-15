# @dreamboard-games/sdk 0.4.0-alpha.13 — portable real-host UI parity

This alpha hard-cuts UI parity onto protocol-v4 gameplay bases and a portable,
digest-bound process contract.

## Highlights

- UI parity observations now use schema version 2 and compare the complete
  `GameplayBasis`, including rewind generation and non-null perspective.
- The public testing facade exports parsers and types for portable parity run
  inputs and passing real-host receipts.
- SDK parity preparation emits a self-contained input directory containing the
  exact SDK tarball, reference source, fixtures, render modules, observations,
  and source screenshots required by a consuming host.
- UI release proof resolves receipt evidence relative to the receipt, rejects
  absolute or escaping paths, and rejects legacy V1 observations and receipts.

The V1 observation names and compatibility aliases have been removed. Consumers
must migrate to `UIParityObservation`, `parseUIParityObservation`, and the V2
portable contracts.
