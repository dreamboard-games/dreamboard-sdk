# Phase 7: Contract Fingerprint And Stale-Artifact Recovery

## Objective

Agents iterate on state schemas constantly; today the cost of forgetting
`dreamboard test generate` after a schema change is an opaque decode failure
or a scenario that fails for the wrong reason. This phase introduces a stable
**contract fingerprint** computed from the manifest + state/phase schemas,
stamps it into every derived artifact (base states, encoded session state),
and converts every staleness failure into a typed, actionable error that
names the command that fixes it.

Additive phase: artifacts without fingerprints keep decoding exactly as
today.

## Background

- `test/generated/.generation-meta.json` exists per workspace but does not
  bind generated base states to the contract that produced them; base-state
  projections (`test/generated/bases/**/*.projection.json`) silently go stale
  when `app/game-contract.ts` changes.
- `decode-session-state.ts` zod-parses persisted sessions; a schema change
  mid-iteration produces a zod issue list pointing at state internals — true
  but useless. The actionable fact ("your contract changed after this state
  was created") is not surfaced.
- The platform's direction is event-sourced sessions; for a _prototyping_
  product the correct dev-loop policy is "detect mismatch, tell the author to
  regenerate/reset", not schema migration.

## Proposed Fix

### 7A. `contractFingerprint(contract)`

New module `packages/sdk/src/reducer/contract-fingerprint.ts`, exported from
`/reducer`:

```ts
import { z } from "zod";

export type ContractFingerprint = {
  /** "cfp1:" + first 16 hex chars of sha256 over the canonical payload. */
  value: string;
  /** Inputs that fed the hash — for diff-style error messages. */
  parts: {
    manifest: string; // hash of canonical manifest literals + topology ids
    publicState: string;
    privateState: string;
    hiddenState: string;
    phases: Record<string, string>;
    errors: string; // phase-2 error map, "" when absent
  };
};

export function contractFingerprint(
  contract: AnyReducerGameContract,
): ContractFingerprint;
```

Hashing rules:

- Schemas serialize via zod 4's `z.toJSONSchema(schema, { unrepresentable: "any" })`
  → canonical JSON (sorted keys, no whitespace) → sha256. `unrepresentable: "any"`
  keeps custom/refined schemas hashable: a refinement change is _not_
  fingerprint-relevant (it cannot change the decoded shape), which is exactly
  the right sensitivity — the fingerprint tracks **shape**, not semantics.
- The manifest part hashes `manifest.literals` (id tuples) — topology and
  component identity — not field metadata, so cosmetic manifest edits (labels)
  do not invalidate states whose shape is unaffected. Decision to confirm
  with the team: if label edits _should_ invalidate (safer, noisier), hash
  the full manifest snapshot instead; default to literals-only.
- The 16-hex truncation keeps artifacts readable; collision risk is
  irrelevant at this trust level (staleness detection, not security).
- Version-prefix `cfp1:` so the algorithm can evolve without ambiguity.

Determinism test: fingerprint of the fixture contract is snapshot-pinned and
re-derived across bun/node runs; key-order-shuffled but otherwise identical
schemas hash equal.

### 7B. Stamp Derived Artifacts

1. **Base states** — the testing codegen (`workspace-codegen` testing
   templates + the CLI's `test generate` path) writes the fingerprint into
   both:

   ```jsonc
   // test/generated/.generation-meta.json
   { "generatedAt": "...", "contractFingerprint": "cfp1:9f2ab348c1d07e55" }
   ```

   ```ts
   // test/generated/base-states.generated.ts
   export const BASE_STATES_CONTRACT_FINGERPRINT = "cfp1:9f2ab348c1d07e55";
   ```

2. **Encoded session state** — `encode-session-state.ts` adds an optional
   envelope field (wire-additive; `reducer-contract` schema bump):

   ```jsonc
   {
     "meta": { "contractFingerprint": "cfp1:9f2ab348c1d07e55" },
     "domain": {
       /* ... */
     },
   }
   ```

   The Kotlin backend treats `meta` as opaque (tolerant reader; no change).

### 7C. Preflight Checks With Actionable Errors

New error type, exported from `/reducer` and `/testing`:

```ts
export class StaleContractArtifactError extends Error {
  readonly code = "STALE_CONTRACT_ARTIFACT";
  readonly artifact: "base-states" | "session-state";
  readonly expected: string; // fingerprint of the live contract
  readonly found: string; // fingerprint stamped in the artifact
  readonly remedy: string; // exact command, see below
}
```

Check sites:

1. **`createTestRuntime`** compares the live bundle's fingerprint against
   `BASE_STATES_CONTRACT_FINGERPRINT` before materializing a base state:

   ```text
   StaleContractArtifactError: base states were generated for contract
   cfp1:9f2ab348… but the current contract is cfp1:31bc09aa….
   Your state or phase schemas changed since `dreamboard test generate` last ran.
   Remedy: run `dreamboard test generate`, then re-run the tests.
   ```

   The error fires before any zod decode, so the author never sees issue-list
   noise for a staleness problem.

2. **`decode-session-state`**: when the envelope carries a fingerprint and it
   mismatches, throw `StaleContractArtifactError` (artifact:
   `"session-state"`) instead of attempting the parse. When the envelope has
   no fingerprint (old artifacts), decode exactly as today.

3. **CLI preflights** (cross-repo, public CLI):
   - `dreamboard test run` surfaces the error verbatim (it already runs the
     test runtime; no extra logic) and exits with a distinct code so agent
     harnesses can branch on it.
   - `dreamboard dev` catches `STALE_CONTRACT_ARTIFACT` on session restore,
     resets the dev session automatically, and prints one notice line —
     matching the prototyping-product policy: dev sessions are disposable,
     surprise decode stack traces are not acceptable, silent resets are not
     either.

### 7D. Workspace Codegen Plumbing

The generated `test/testing-types.ts` (testing-contract template) passes the
fingerprint through so workspaces get the check with zero authored code:

```ts
// generated testing-types.ts addition
import { contractFingerprint } from "@dreamboard-games/sdk/reducer";
import { gameContract } from "../app/game-contract";
import { BASE_STATES_CONTRACT_FINGERPRINT } from "./generated/base-states.generated";

const runtime = createDreamboardTestRuntime({
  // ...existing options...
  contractFingerprint: contractFingerprint(gameContract).value,
  expectedBaseStateFingerprint: BASE_STATES_CONTRACT_FINGERPRINT,
});
```

## Files Touched

- `packages/sdk/src/reducer/contract-fingerprint.ts` (new) + facade export
- `packages/sdk/src/reducer/ingress/encode-session-state.ts`,
  `decode-session-state.ts`, `session-codec.ts`
- `packages/sdk/src/testing/create-test-runtime.ts` (options + preflight)
- `packages/reducer-contract/schema/*.json` + `generated/` (optional `meta`)
- `packages/workspace-codegen` testing templates + `.generation-meta.json`
  writer
- Cross-repo: CLI `test generate` / `test run` / `dev` handling; skill
  testing reference documents the new failure mode and remedy

## Verification

- Determinism + sensitivity unit tests: adding a field to a phase schema
  changes the fingerprint; reordering object keys does not; a `refine`
  change does not.
- Round-trip: encode with fingerprint → decode against same contract (ok) →
  decode against mutated contract (`StaleContractArtifactError` with both
  fingerprints populated) → decode legacy envelope without `meta` (ok).
- `harness:contract` for the wire-additive `meta` field.
- End-to-end (private monorepo): mutate frontier-trails'
  `playerTurnPhaseStateSchema`, run `dreamboard test run` _without_
  regenerating — assert the exact remedy message; regenerate; assert green.

## Acceptance Criteria

- A schema change followed by a test run without regeneration produces one
  sentence naming `dreamboard test generate` — never a zod issue list.
- Legacy artifacts (no fingerprint) behave byte-identically to today.
- `dreamboard dev` recovers from a contract change with an auto-reset plus a
  single visible notice.

## Risks

- **`z.toJSONSchema` coverage**: exotic schemas (lazy/recursive, custom
  codecs) may serialize lossily. `unrepresentable: "any"` makes them hash as
  `any` — meaning some shape changes inside such schemas would _not_ change
  the fingerprint (false-negative staleness). Acceptable for v1; document it
  on `contractFingerprint`, and emit an `authoringWarning` (phase 6 sink)
  when a schema serializes with `any` placeholders so authors know the
  detection is partial there.
- **Fingerprint over-sensitivity** (false positives invalidating states on
  irrelevant edits) annoys more than it helps — that is why the manifest part
  hashes literals only. Revisit with real usage data.
- The CLI auto-reset on `dreamboard dev` deletes in-progress dev sessions by
  design; confirm with the team that no dev-host flow treats those sessions
  as durable before enabling it by default (flag-gate the auto-reset if in
  doubt: `--no-auto-reset`).
