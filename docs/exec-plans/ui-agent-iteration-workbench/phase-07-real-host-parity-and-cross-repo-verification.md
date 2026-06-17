# Phase 07: Real-Host Parity And Cross-Repo Verification

Status: Completed on 2026-06-17. The SDK-owned observation/comparison contract,
packed-candidate wrapper, and internal cross-repo `verify:ui-parity` lane are
implemented. The internal lane now replays the packed SDK fixture through a
real dev-host `PluginIframe` + `PluginSessionGateway` surface and records
`realHostExecutor: true` for `hearts.pass-three.mobile`. Amended on 2026-06-17
by the
[Plugin Runtime Contract Hard Cut](./plugin-runtime-contract-hard-cut.md).

## Objective

Replay selected UI fixtures through the internal production-like host and prove
that the Workbench predicts the same observable UI and interaction behavior.

This is a focused parity lane, not a replacement for the existing
`pnpm verify:browser` full-stack proof or browser-demo performance lane.

## 07A. Define a parity observation contract

Both the Workbench and internal host write the same normalized observation:

```ts
export interface UIParityObservationV1 {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly fixtureDigest: string;
  readonly sdkCandidateDigest: string;
  readonly pluginRuntimeProtocol: 3;
  readonly browserInteractionProtocol: string;
  readonly environment: {
    readonly project: string;
    readonly viewport: { readonly width: number; readonly height: number };
  };
  readonly checkpoints: readonly {
    readonly stepId: string;
    readonly interactionKey?: string;
    readonly interactionId?: string;
    readonly actuatorId?: string;
    readonly descriptorDigest?: string;
    readonly draftDigest?: string;
    readonly gameVersion: number;
    readonly actionSetVersion: string;
    readonly perspectivePlayerId: string | null;
    readonly projectionDigest: string;
    readonly semanticDigest: string;
    readonly submissionDigest?: string;
    readonly screenshot?: string;
  }[];
  readonly diagnostics: readonly {
    readonly code: string;
    readonly message: string;
  }[];
}
```

The parity comparator checks:

- fixture and SDK candidate identity;
- plugin runtime and browser-interaction protocol versions;
- exact gameplay frame revision and perspective;
- exact replay-step identity;
- preparation chain;
- projection digest at every checkpoint;
- normalized semantic snapshot digest;
- draft and submitted payload digests;
- diagnostics;
- final screenshot after documented host chrome masking.

Do not compare internal network timing or host-only controls in this lane.

Both paths must materialize `PluginGameplayFrame` through
`@dreamboard-games/plugin-runtime-contract`. Parity code must not reconstruct a
legacy `PluginStateSnapshot`.

## 07B. Reuse the internal semantic replay executor

The internal repository already owns:

- `@dreamboard/browser-demo-scenario-contract`;
- compiled semantic effect replay;
- exact interaction key, ID, descriptor, and projection checks;
- preparation returned by the canonical SDK resolver;
- guards against label, text, role, DOM-order, and `dispatchEvent` fallbacks.

Refactor it to consume the portable replay-step contract from Phase 02. Keep
browser-demo performance and release-specific fields in the internal package.

The UI parity runner must use the same executor. Do not create a third browser
driver.

When Phase 05 promotes browser-interaction to `3.0.0`, update the internal
hard-cut guard that currently requires protocol `2.0.0`. The internal browser
demo spec's own schema version `3.0.0` is unrelated and should change only if
its schema changes.

## 07C. Materialize the exact SDK candidate and reference bundle

The internal parity lane receives:

- packed SDK tarball;
- SDK tarball SHA-256;
- reference bundle URL and SHA-256;
- fixture bundle index;
- selected scenario IDs;
- expected browser project.

Example input:

```json
{
  "schemaVersion": 1,
  "sdk": {
    "tarball": "artifacts/dreamboard-games-sdk-0.4.0-alpha.0.tgz",
    "sha256": "sha256:..."
  },
  "referenceBundle": {
    "url": "artifact://dreamboard-sdk/reference-games/f2e8c12.tgz",
    "sha256": "sha256:..."
  },
  "scenarios": [
    "hearts.pass-three.mobile",
    "hex-network-trading.place-network"
  ],
  "project": "chromium-touch-phone"
}
```

The internal materializer must:

1. verify both digests;
2. install the packed SDK into an isolated reference game build;
3. reject workspace or checkout SDK links;
4. compile or load the reference game package;
5. create a real host session from the fixture's source scenario;
6. bind the portable seat reference to the actual player ID;
7. open the normal player plugin surface;
8. run the shared semantic replay recipe.

No operator token, direct submit API, snapshot URL, or host-only mutation may
perform the user interaction.

## 07D. Add a focused internal command

Add to the internal repository:

```jsonc
{
  "scripts": {
    "verify:ui-parity": "bun tools/product-harness/src/cli.ts ui-parity",
  },
}
```

Example:

```bash
pnpm verify:ui-parity \
  --input .artifacts/ui-parity/input.json \
  --out .artifacts/ui-parity/run
```

The SDK repository may expose an orchestration wrapper:

```bash
DREAMBOARD_INTERNAL_REPO=../internal \
  pnpm ui:test:parity --scenario hearts.pass-three.mobile
```

The wrapper packages inputs and calls the internal command. The actual host
setup and mutation remain internal-owned.

Do not make the internal checkout a dependency of normal `pnpm ui:test`.

## 07E. Start with a small golden parity set

Required golden scenarios:

| Scenario                                        | Why it is golden                                      |
| ----------------------------------------------- | ----------------------------------------------------- |
| `hearts.pass-three.mobile`                      | Mobile hand, multi-select, commit, simultaneous state |
| `deck-building-market.buy-card`                 | Market selection, cost state, repeated turn           |
| `hex-network-trading.place-network`             | Board geometry and pointer target                     |
| `worker-placement-tableau.place-worker`         | Target selection, form/dialog, resource validation    |
| `simultaneous-card-drafting.choose-card.mobile` | Private simultaneous choice, lock, reveal/pass        |

For each scenario, run:

- Workbench source candidate;
- Workbench packed candidate;
- internal real host with the same packed candidate.

Source and packed Workbench observations must match before real-host comparison.

## 07F. Normalize visual parity

Use the same viewport, font files, locale, timezone, reduced-motion setting, and
device scale factor.

The comparator may mask:

- internal navigation chrome;
- host-owned diagnostics controls;
- outer iframe border;
- user avatar images not owned by the SDK.

It must not mask:

- game viewport;
- hand tray;
- board;
- action panel;
- dialogs;
- focus rings;
- validation state;
- drag source or target;
- safe-area or overlay geometry.

Record masks in a versioned per-host manifest. Unregistered masks fail.

## 07G. Classify parity failures

Failure classes:

```ts
type UIParityFailureCode =
  | "candidate-mismatch"
  | "fixture-source-mismatch"
  | "protocol-mismatch"
  | "interaction-resolution-mismatch"
  | "preparation-mismatch"
  | "draft-mismatch"
  | "submission-mismatch"
  | "projection-mismatch"
  | "semantic-snapshot-mismatch"
  | "visual-mismatch"
  | "host-setup-failure";
```

Write the first divergent checkpoint plus both observations. A screenshot diff
without the semantic and transcript difference is not sufficient triage.

## 07H. Define trigger policy

Run focused parity on SDK pull requests when changes touch:

- runtime provider composition;
- generated workspace contract;
- browser-interaction protocol or resolver;
- hand, board, form, dialog, or overlay adapters;
- fixture schema/runtime;
- a component used by a golden scenario.

Run all golden parity scenarios:

- on the SDK main branch;
- before alpha publication;
- after internal host runtime changes;
- after reference fixture regeneration.

The broader internal `pnpm verify:browser` remains a separate release proof.

## Expected files

SDK repository:

```text
packages/sdk/src/testing/ui-fixture/parity.ts
scripts/ui/run-ui-parity.mjs
scripts/ui/compare-ui-parity.mjs
docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-07-parity-receipt.md
```

Internal repository:

```text
tools/product-harness/src/ui-parity/**
packages/browser-demo-scenario-contract/src/**
scripts/check-browser-demo-compiled-replay-hard-cut.mjs
package.json
```

## Verification

SDK:

```bash
pnpm ui:test --scenario hearts.pass-three.mobile
pnpm ui:test:packed --scenario hearts.pass-three.mobile
pnpm ui:test:parity --scenario hearts.pass-three.mobile
```

Internal:

```bash
pnpm verify:ui-parity --input <input.json> --out <artifact-dir>
pnpm check:browser-demo-compiled-replay-hard-cut
pnpm verify:browser
```

`pnpm verify:browser` may require the full local environment. If it fails for an
unrelated environment dependency, retain the focused parity receipt and the
classified full-stack failure separately.

## Acceptance criteria

- Workbench and internal host use one portable semantic replay contract.
- Golden scenarios install and run the exact packed SDK candidate.
- Every checkpoint matches projection, semantic, draft, and submission
  digests.
- Visual comparison masks only registered host-owned chrome.
- Failures identify the first divergent checkpoint and typed class.
- Focused parity does not become a dependency of the normal local Workbench
  loop.
- All golden scenarios pass before deprecated authoring APIs are deleted.

## Risks and controls

| Risk                                                 | Control                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Parity lane duplicates the browser demo executor     | Refactor the existing executor to consume the portable replay core     |
| Internal session state differs from compiled fixture | Seed from the source scenario and compare every projected checkpoint   |
| Host chrome produces noisy screenshots               | Versioned, narrow mask manifest                                        |
| Cross-repo setup makes every PR slow                 | Trigger only impacted golden scenarios; full set on main/release       |
| Full-stack environment failure obscures SDK result   | Separate focused parity receipt from broader `verify:browser` evidence |
