# Phase 0: Packaging And Dependency Hygiene

Status: closed on 2026-06-12. Closeout receipt is recorded inline below.

## Objective

Remove the packaging defects that can produce duplicate-React/zod copies in
plugin iframes and misrepresent the SDK's runtime dependency set. Pure
bugfix phase: no API change, no codegen change, ships on the next 0.3.x alpha.

## Background

`packages/sdk/package.json` currently declares:

```jsonc
"dependencies": {
  // ...
  "framer-motion": "^11.15.0",   // ALSO in peerDependencies
  "react": "^19.2.0",            // ALSO in peerDependencies
  "react-dom": "^19.2.0",        // peer is implied via react
  "tailwindcss": "^4.1.5",       // build tool, not a runtime dep
  "zod": "4.4.3"                 // ALSO in peerDependencies (exact pin)
},
"peerDependencies": {
  "framer-motion": "^11.0.0 || ^12.0.0",
  "react": "^19.0.0",
  "zod": "4.4.3"
}
```

Listing a package in both `dependencies` and `peerDependencies` means a
version mismatch silently installs a second copy under the SDK. For React this
manifests as invalid-hook-call errors inside the plugin iframe — a
nondeterministic failure that is brutal for an agent to attribute. For zod it
risks two zod instances and `instanceof`-style schema identity bugs.

`tailwindcss` is a build-time tool: the shipped runtime artifact is
`dist/ui/plugin-styles.css`, which is produced at SDK build time. Workspaces
must not transitively install tailwind.

## Proposed Fix

### 0A. Normalize The Dependency Sets

In `packages/sdk/package.json`:

```jsonc
"dependencies": {
  "@radix-ui/react-accordion": "^1.2.12",
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-label": "^2.1.6",
  "@radix-ui/react-select": "^2.2.5",
  "@radix-ui/react-slot": "^1.1.2",
  "@radix-ui/react-tooltip": "^1.2.8",
  "@use-gesture/react": "^10.3.1",
  "clsx": "^2.1.1",
  "lucide-react": "^0.562.0",
  "vaul": "^1.1.2",
  "zustand": "^5.0.4"
},
"peerDependencies": {
  "framer-motion": "^11.0.0 || ^12.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "zod": "^4.4.3"
},
"devDependencies": {
  // add (build/test-time copies of the peers):
  "framer-motion": "^11.15.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "zod": "4.4.3",
  "tailwindcss": "^4.1.5"
  // ... existing devDependencies unchanged
}
```

Decisions encoded above — confirm with the team before landing:

1. `react-dom` is added to `peerDependencies` explicitly (it is currently a
   direct dep only; Radix and the runtime primitives require it).
2. The zod peer range relaxes from the exact `4.4.3` pin to `^4.4.3`. The
   wire format must not depend on a zod patch version; if any wire behavior
   does, that is a bug to fix in `reducer-contract` (the JSON schema is
   authoritative), not a reason to pin consumers. If the team rejects the
   range relaxation, keep the exact pin but document why in the README and
   revisit in phase 7 (fingerprinting makes schema drift detectable).
3. Radix/vaul/zustand/use-gesture/clsx/lucide stay as real dependencies: they
   are implementation details of `sdk/ui` and must version-lock to the SDK.

### 0B. Verify Single-React In The Installed Tree

Add a check to `scripts/pack-dry-run.mjs` (or a sibling
`scripts/assert-peer-hygiene.mjs` wired into `pnpm check`):

```js
// assert-peer-hygiene.mjs (sketch)
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("packages/sdk/package.json", "utf8"));
const both = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => (pkg.peerDependencies ?? {})[name] !== undefined,
);
if (both.length > 0) {
  console.error(
    `packages/sdk: listed in both dependencies and peerDependencies: ${both.join(", ")}`,
  );
  process.exit(1);
}
const forbiddenRuntimeDeps = ["tailwindcss", "typescript", "tsup"];
const offending = forbiddenRuntimeDeps.filter(
  (name) => (pkg.dependencies ?? {})[name] !== undefined,
);
if (offending.length > 0) {
  console.error(
    `packages/sdk: build-time tools in dependencies: ${offending.join(", ")}`,
  );
  process.exit(1);
}
console.log("peer hygiene ok");
```

Wire into the root `check` script:

```jsonc
"check": "pnpm publication:check && pnpm version:check && node scripts/assert-peer-hygiene.mjs && pnpm build && pnpm test && pnpm pack:dry-run"
```

### 0C. Prove It Against A Real Workspace Install

In the private monorepo after repinning the snapshot:

```bash
# in dreamboard-sdk
SDK_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 pnpm local-registry:publish
# in the dreamboard checkout
pnpm sdk:repin --receipt
cd examples/published/frontier-trails && pnpm install
# exactly one react/zod in the example's resolved tree:
pnpm why react | grep -c "react@" # expect a single version
pnpm why zod   | grep -c "zod@"
```

Then run the browser lane (`pnpm verify:browser`) — it exercises the plugin
iframe with the installed SDK and would catch a duplicate-React regression.

## Files Touched

- `packages/sdk/package.json`
- `scripts/assert-peer-hygiene.mjs` (new)
- `package.json` (root `check` script)
- `docs/release-notes-*.md` for the next alpha (note the peer changes — they
  are install-affecting even though no API changed)

## Verification

- `pnpm check` (includes the new hygiene gate and `pack:dry-run`)
- Tarball inspection: `npm pack --dry-run` output contains no tailwind
  references outside `dist/ui/plugin-styles.css`
- Private-monorepo `pnpm verify:browser` against the repinned snapshot

### Closeout Receipt: 2026-06-12

SDK repo:

- `pnpm check` passed.
- `pnpm --filter @dreamboard-games/reducer-contract generate:check` passed.
- `pnpm local-registry:publish` published
  `@dreamboard-games/sdk@0.3.0-alpha.1-local.20260612T105332Z.58ce10356009`
  to the local Verdaccio registry.

Private monorepo proof used an isolated worktree so the active private
checkout could keep concurrent work untouched:

- Worktree: isolated private proof checkout
- Branch: `codex/sdk-phase0-private-proof`
- Repin target:
  `@dreamboard-games/sdk@0.3.0-alpha.1-local.20260612T105332Z.58ce10356009`

Cross-repo proof:

- `pnpm sdk:repin --receipt` passed after refreshing a stale local CLI pin with
  `@dreamboard-games/cli@0.1.29-local.20260612T105446Z.6c29d1f54739`.
- `pnpm install --ignore-workspace --no-frozen-lockfile` passed in
  `examples/published/frontier-trails`.
- `pnpm list --depth 0 --ignore-workspace` in Frontier Trails resolved one
  top-level copy each of `react@19.2.6`, `react-dom@19.2.6`, `zod@4.4.3`, and
  the local SDK snapshot.
- `pnpm why react --ignore-workspace`, `pnpm why react-dom --ignore-workspace`,
  `pnpm why zod --ignore-workspace`, and
  `pnpm why framer-motion --ignore-workspace` passed. The installed SDK
  manifest has no runtime dependency entry for `react`, `react-dom`, `zod`, or
  `framer-motion`; each is provided by the consumer peer tree.
- `pnpm verify:browser` passed with receipt
  `2026-06-12T11-00-52-158Z-f8becc75/browser/receipt.json`.

Clean-worktree verifier note: the first private `verify:browser` attempt
timed out waiting for the compiler worker because the clean worktree had not
built `@dreamboard/private-contracts-work-api` and `@dreamboard/work-runtime`
yet. Building those workspace dependencies once made the unchanged browser
lane pass.

## Acceptance Criteria

- No package appears in both `dependencies` and `peerDependencies`.
- `tailwindcss` absent from the published dependency set; `plugin-styles.css`
  still ships and renders (HandView/Drawer visual smoke in `verify:browser`).
- Fresh workspace install resolves exactly one copy each of `react`,
  `react-dom`, `zod`, `framer-motion`.

## Risks

- Moving `react` out of `dependencies` requires every consumer to provide it.
  All known consumers (scaffolded workspaces, examples, web host) already
  declare React 19 directly — confirmed in frontier-trails `package.json`.
  The scaffold templates in the public CLI repo must be audited for the same
  (cross-repo touchpoint; they already pin react/zod explicitly).
- Relaxing the zod peer pin: if a workspace resolves zod 4.5+ with behavior
  drift in `toJSONSchema`/parsing, contract validation could change. Mitigate
  by adding one conformance test in `reducer-contract` that round-trips the
  wire fixtures through the _workspace-resolved_ zod in the codegen temp
  projects.
