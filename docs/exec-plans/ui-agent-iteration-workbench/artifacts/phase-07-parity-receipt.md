# Phase 07 Parity Receipt

Generated: 2026-06-17

Status: complete for the Hearts foundation.

## Required Scenario

`hearts.pass-three.mobile` is the sole required golden parity scenario. Other
checked-in fixtures remain optional follow-up coverage.

## Evidence Boundary

The parity lane materializes three distinct observations:

1. `fixture-expectation`, compiled from the portable fixture contract;
2. `source-workbench`, measured by the Workbench Playwright driver;
3. `packed-real-host`, measured inside the internal PluginIframe host from the
   exact SDK tarball candidate.

The internal contract lane validates source and expectation provenance but does
not copy either file into its observation directory. The real-host executor
writes its own normalized browser-interaction snapshot and observation.

Release proof rejects:

- missing or unexpected provenance;
- identical observation paths or file digests;
- skipped internal execution;
- mismatched SDK tarball or fixture-bundle digests;
- projection, semantic, draft, submission, or interaction identity mismatch.

## Verification

```bash
DREAMBOARD_INTERNAL_REPO=../internal \
  node scripts/ui/run-ui-parity.mjs \
  --scenario hearts.pass-three.mobile \
  --require-internal \
  --skip-build \
  --out artifacts/ui-parity/audit-independent-real-host-3
```

Result: passed.

- Source Workbench matched the fixture expectation.
- Packed real host matched the fixture expectation.
- Packed real host matched the source Workbench.
- The internal receipt recorded `realHostExecutor: true`.
- Projection, semantic, submission, interaction identity, SDK tarball, and
  fixture digests matched.

Retained receipt:

`artifacts/ui-parity/audit-independent-real-host-3/receipt.json`

The three observation files have distinct SHA-256 digests, proving they were
independently materialized rather than copied from one expectation.
