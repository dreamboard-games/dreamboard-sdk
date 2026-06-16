# 010 Enforce Declaration/Runtime Export Parity

- Status: Proposed
- Priority: P1
- Risk: High
- Effort: Medium
- Primary owner: SDK packaging
- Depends on: 001
- Planned at: `d84c620`

## Summary

Make public TypeScript value exports exactly match runtime JavaScript exports
and verify the actual packed tarball in a disposable consumer. Prevent type
barrels and declaration bundling from advertising values that do not exist.

## Current State

The UI source barrel uses type-star re-exports from modules that also declare
runtime hooks:

```ts
export type * from "./useHandLayout.js";
export type * from "./usePanZoom.js";
```

The generated `dist/ui.d.ts` advertises `useHandLayout` and `usePanZoom` as
value exports even though the UI runtime entry point does not export them.

`runtime/workspace-contract.ts` also broadly re-exports types from a runtime
barrel, and declaration bundling currently leaks synthetic aliases such as
`D`, `P`, `R`, and `a`.

Existing scripts list declaration names but do not distinguish type-only from
value exports. The subpath smoke test installs a locally published registry
version rather than the freshly packed tarball produced by the current tree.

## Package Contract

- Every declaration value export has a runtime value with the same name.
- Runtime-only values are also treated as drift unless intentionally
  documented.
- Type-only symbols never appear as values in bundled declarations.
- Public names are stable and descriptive; synthetic one-letter aliases are
  rejected.
- The exact tarball under review installs and imports independently.

## Scope

### In scope

- explicit source façade exports;
- declaration/runtime parity automation;
- package export-map enumeration;
- packed-tarball consumer smoke tests;
- CSS subpath existence;
- generated reference refresh after parity is green.

### Out of scope

- changing the one-package publication model;
- removing supported public subpaths;
- measuring bundle size or dependency weight;
- registry publishing.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-010-export-parity
```

Commit:

```text
Enforce SDK declaration runtime parity
```

## Implementation Steps

### 1. Replace broad type-star façade exports

In `packages/sdk/src/ui/index.ts`, export only intended public types:

```ts
export type { HandLayout, HandLayoutOptions } from "./useHandLayout.js";
export type { PanZoomState, PanZoomOptions } from "./usePanZoom.js";
```

Do not export `useHandLayout` or `usePanZoom` as values unless they are
deliberately added to the runtime façade and documented as public APIs.

Apply the same explicit policy to
`packages/sdk/src/runtime/workspace-contract.ts`. Import public types directly
from their leaf modules where necessary:

```ts
export type { PluginRuntime } from "./api/plugin-runtime.js";
```

Avoid a broad barrel that causes the declaration bundler to synthesize
unstable aliases.

### 2. Build a TypeScript-symbol-aware parity script

Add `scripts/assert-sdk-export-parity.mjs` using the TypeScript compiler API:

```js
const program = ts.createProgram([declarationPath], compilerOptions);
const checker = program.getTypeChecker();
const source = program.getSourceFile(declarationPath);
const moduleSymbol = checker.getSymbolAtLocation(source);

const declaredValues = checker
  .getExportsOfModule(moduleSymbol)
  .filter((symbol) => {
    const resolved =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    return Boolean(resolved.flags & ts.SymbolFlags.Value);
  })
  .map((symbol) => symbol.name)
  .sort();
```

For each JavaScript export-map subpath:

1. resolve its declaration file;
2. collect declaration value exports;
3. dynamically import the built JavaScript module;
4. compare with sorted `Object.keys(module)`;
5. report missing and unexpected values by subpath.

Skip CSS and other non-JavaScript conditions explicitly.

### 3. Reject synthetic public aliases

Add a focused check for declaration names that match the current leak pattern:

```js
const suspicious = exportedNames.filter((name) => /^[A-Za-z]$/.test(name));
if (suspicious.length > 0) {
  throw new Error(
    `Synthetic public declaration aliases: ${suspicious.join(", ")}`,
  );
}
```

Keep a narrow allowlist only if a genuine one-letter public API is intentional
and documented. Do not allowlist bundler artifacts.

### 4. Enumerate subpaths from `package.json`

The checker must use the package export map as its source of truth:

```js
for (const [subpath, target] of Object.entries(pkg.exports)) {
  const importTarget =
    typeof target === "string" ? target : (target.import ?? target.default);
  if (!importTarget?.endsWith(".js")) continue;
  // Locate corresponding declaration target and compare.
}
```

Fail if a JavaScript export has no declaration target or built file.

### 5. Smoke-test the exact packed tarball

Add or adapt a script that accepts a tarball path:

```sh
node scripts/smoke-packed-sdk.mjs \
  packages/sdk/dreamboard-games-sdk-0.4.0-alpha.0.tgz
```

The script creates a temporary consumer, installs the tarball, and imports
every JavaScript subpath:

```js
await execa(
  "npm",
  ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath],
  { cwd: consumerDir },
);

for (const specifier of publicJavaScriptSpecifiers) {
  await importFromConsumer(consumerDir, specifier);
}
```

Also resolve and `stat` exported CSS files. Remove the temporary project in a
`finally` block.

### 6. Wire checks into package verification

After build and pack:

```json
{
  "scripts": {
    "exports:check": "node scripts/assert-sdk-export-parity.mjs",
    "pack:consumer-check": "node scripts/pack-and-smoke-sdk.mjs"
  }
}
```

Include both in the authoritative root `pnpm check` established by phase 001.
Keep the local Verdaccio smoke test as an integration test, not the only
package-content proof.

### 7. Refresh generated API references last

Only after source façades and parity checks pass:

- regenerate declaration outputs;
- regenerate `REFERENCE.md` or API reference artifacts;
- review the public name diff manually;
- confirm no one-letter aliases or phantom hooks remain.

Do not edit generated declarations directly.

## Test Plan

Add script fixtures covering:

- declared value missing at runtime;
- runtime value missing in declarations;
- type-only export correctly ignored;
- re-export alias resolved to the underlying value;
- synthetic one-letter alias rejected;
- CSS export checked as a file, not imported as JavaScript;
- conditional export object;
- missing declaration target.

Run:

```sh
pnpm --filter @dreamboard-games/sdk build
pnpm exports:check
pnpm pack:dry-run
pnpm pack:consumer-check
pnpm docs:check
pnpm check
```

Inspect the tarball too:

```sh
npm pack --workspace packages/sdk --dry-run
```

The consumer smoke must run with no workspace symlinks and no local registry
fallback.

## Done Criteria

- UI declarations no longer advertise absent hook values.
- Workspace-contract declarations contain no synthetic aliases.
- Every JavaScript subpath has exact declaration/runtime value parity.
- Every public subpath is tested from the freshly packed tarball.
- CSS exports exist in the tarball.
- Parity and packed-consumer checks run in `pnpm check`.

## STOP Conditions

- Stop if a phantom value is already used by a supported consumer. Decide
  explicitly whether to publish the runtime value or issue a breaking
  correction; do not preserve accidental declaration behavior silently.
- Stop if the parity script needs to parse declaration text with regular
  expressions. Use the TypeScript compiler API.
- Stop if the tarball smoke resolves workspace files outside `node_modules`.
  Correct the consumer harness before trusting the result.

## Maintenance

All new package export-map entries automatically participate in parity and
packed-consumer checks. Source façades use explicit value and type exports.
