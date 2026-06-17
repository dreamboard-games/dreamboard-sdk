# Phase 01 Migration

Date: 2026-06-16.

Scope:
`docs/exec-plans/ui-agent-iteration-workbench/phase-01-reference-game-ownership-and-consumer-boundary.md`

Commit measured: `993abdd9ddab`.

## Source Ownership

- Added SDK-owned reference games under `examples/reference-games/`.
- Kept `examples/reference-games/*` outside `pnpm-workspace.yaml`; the root
  workspace remains `packages/*`.
- Added mechanic-based IDs:
  - `hearts`
  - `hex-network-trading`
  - `deck-building-market`
  - `worker-placement-tableau`
  - `simultaneous-card-drafting`
- Replaced the previous internal simultaneous drafting pressure pattern with
  original public-safe `simultaneous-card-drafting` source.
- Committed each game with its own `package.json`, `pnpm-lock.yaml`,
  `reference-game.json`, `assets/LICENSES.json`, `src/`, and `scenarios/`.
- Committed SDK dependencies use exact `@dreamboard-games/sdk@0.2.0`, the
  current published npm version reported by
  `npm view @dreamboard-games/sdk version --json`.

## Boundary Enforcement

Added root scripts:

```json
{
  "reference-games:check": "node scripts/ui/check-reference-games.mjs",
  "reference-games:test:packed": "node scripts/ui/verify-reference-consumers.mjs",
  "reference-games:bundle": "node scripts/ui/build-reference-bundle.mjs"
}
```

`reference-games:check` validates:

- expected and unique reference IDs;
- exact SDK dependency policy;
- no `workspace:`, `link:`, `file:`, parent-directory, or internal
  `@dreamboard-games/*` dependencies besides the public SDK package;
- approved rights manifests, empty `thirdPartyMarks`, and
  `publishToDemoGallery: false`;
- recognized mechanic and UI-pattern tags;
- source denylist for configured commercial marks;
- no `examples/reference-games/<id>` path registration outside the
  reference/docs scope.

`reference-games:test:packed` validates:

- SDK build and candidate `npm pack`;
- temporary external consumer copy for every reference game;
- SDK dependency rewrite to the candidate tarball only inside the temporary
  consumer;
- `pnpm install --ignore-workspace --config.shared-workspace-lockfile=false`;
- per-game `pnpm build` and `pnpm test`;
- installed SDK realpath resolves inside the temporary `.pnpm` store, not this
  workspace.

## Internal Export

- Added SDK bundle builder:
  `scripts/ui/build-reference-bundle.mjs`.
- The builder produces ignored artifacts under `build/reference-games/`:
  - `reference-games-bundle.tgz`
  - `reference-bundle.lock.json`
  - per-reference-game packed packages
  - packed SDK tarball
- Added internal repository lock:
  `/Users/kevintang/code/internal/examples/reference-bundle.lock.json`.
- Added internal repository materializer:
  `/Users/kevintang/code/internal/scripts/reference-games/materialize-reference-bundle.mjs`.
- The materializer verifies the bundle digest and extracts only to
  `/Users/kevintang/code/internal/build/reference-games/sdk-reference-games`.
  It does not create an editable committed source mirror.

Final generated SDK bundle lock:

```json
{
  "sdkCommit": "993abdd9ddab",
  "sdkTarballSha256": "sha256:dd32d1aa0da325b171a05e210558690c5f8f191acf60268da89945d782f9616d",
  "referenceBundleSha256": "sha256:d49cf151227eaed87e80333967d4359e28680417c8461341e38ac9e1b51232ba"
}
```

## Digests

`pnpm reference-games:check` final post-format source digests:

| Reference game               | Source digest                                                      | Scenario digest                                                    |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `hearts`                     | `0cc5a19e8356d1b406737117bb93bbfef26f87141bc7a5aa346c7002be52be98` | `2c36cec3651d94751388cbadf1a89d06da9da6b9df36139ce581867c5ac07d6e` |
| `hex-network-trading`        | `963f6283b01158173f6bbbc1d8283f0a9980af5c9cc641c1de94d6cfe836cef7` | `909a588354b24a0fc3c55bfc7a665310bdba1707a6fec3afdd314ae51e53fd8b` |
| `deck-building-market`       | `688cb9b375e0de7b4e296ac8eab3c04ec172963d05e5618e79a78a9b577fb112` | `6026cffdc7f4937c1a30c32dff07466062738f7991ac4af454d4fe372029add6` |
| `worker-placement-tableau`   | `5a385535b419779b43bb4effd30e514a64359ecf81b581b6ad30cdb61c3ce15c` | `c7ac47032b51aff2148ecd3b7ea1164a605bf1e720ebccee8b83891f958b8b53` |
| `simultaneous-card-drafting` | `531813afa421607451b5c3bf4e2114cfcefec0e41d08d8ca5f9b9cdea4e9421d` | `09aad9ce6941653c18f3787f2fd8ed996a1d08f9583b59d9d23aad98e213a5ce` |

All five reference games share the committed lockfile digest
`4f23561baaed540e7ee37fa6570807cccd8fe7f62a9ef8588a050bfd19dd2bdc`
because they intentionally share the same single exact SDK dependency.

## Verification

Commands run with `mise exec node@24 -- ...` unless noted:

```bash
npm view @dreamboard-games/sdk version --json
pnpm reference-games:check
pnpm reference-games:test:packed
pnpm reference-games:bundle
pnpm reference-games:bundle
pnpm pack:dry-run
pnpm format:check
node scripts/reference-games/materialize-reference-bundle.mjs --bundle /Users/kevintang/code/dreamboard-sdk/build/reference-games/reference-games-bundle.tgz
```

Results:

- `npm view @dreamboard-games/sdk version --json`: returned `0.2.0`.
- `pnpm reference-games:check`: passed; all manifests validated, all
  `publishToDemoGallery` values are `false`, all rights reviews are approved,
  no configured denied commercial marks were found, and no reference path is
  registered outside reference/docs scope.
- `pnpm reference-games:test:packed`: passed; all five temporary consumers
  installed `@dreamboard-games/sdk@0.4.0-alpha.0` from the packed tarball,
  built, tested, and resolved SDK from the temporary `.pnpm` store rather than
  the workspace.
- `pnpm reference-games:bundle`: passed twice; both runs produced reference
  bundle digest
  `sha256:d49cf151227eaed87e80333967d4359e28680417c8461341e38ac9e1b51232ba`.
- `pnpm pack:dry-run`: passed; `@dreamboard-games/sdk@0.4.0-alpha.0` dry-run
  pack completed and `assert-sdk-tarball-self-contained` scanned 63 package
  files successfully.
- `pnpm format:check`: passed; all matched files use Prettier code style.
- Internal materializer command: passed; verified bundle digest
  `sha256:d49cf151227eaed87e80333967d4359e28680417c8461341e38ac9e1b51232ba`
  and wrote a materialization receipt under the ignored internal build
  directory.

Current warnings:

- SDK builds still print existing Rollup circular re-export warnings involving
  `src/reducer/model/spec/runtime-args.ts` and `src/reducer/model/spec.ts`.
  The build exits successfully.
