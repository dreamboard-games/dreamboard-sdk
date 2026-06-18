# Phase 3 Closeout Receipt

Date: 2026-06-13

Scope:

- SDK branch: `codex/browser-demo-compiled-replay-sdk` at `e074c98`
- Public CLI branch: `release-2` at `ad2350d4`
- Private integration branch: `next-phase` at `b5dec8897`

## Result

Phase 3 is closed. Generated topology data is emitted as
`shared/manifest-static.json`, generated `manifest-runtime.ts` imports that JSON
artifact, regenerated workspaces compile, and package/browser integration gates
accept the JSON module path.

## Verification

Already green before this closeout receipt:

- `pnpm --filter @dreamboard-games/workspace-codegen test`
- `pnpm --filter @dreamboard-games/workspace-codegen typecheck`
- `pnpm --filter @dreamboard-games/sdk typecheck`
- Private monorepo `pnpm generate:check`
- Private monorepo `pnpm verify:dev`
- Private monorepo `pnpm infra:validate`
- Private monorepo `pnpm fin`

Final Phase 3 acceptance gates:

| Command                                                                                                                                                                                                                  | Result | Receipt                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------ |
| `DREAMBOARD_PUBLIC_REPO=<public-cli-checkout> NPM_CONFIG_USERCONFIG=<product-checkout>/.dreamboard-dev/local-aws-publish.npmrc pnpm verify:package`                                                     | pass   | `<product-checkout>/build/verification/2026-06-13T09-05-09-076Z-babfe481/package/receipt.json` |
| `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 DREAMBOARD_PUBLIC_REPO=<public-cli-checkout> NPM_CONFIG_USERCONFIG=<product-checkout>/.dreamboard-dev/local-aws-publish.npmrc pnpm verify:browser` | pass   | `<product-checkout>/build/verification/2026-06-13T09-10-56-670Z-207dd482/browser/receipt.json` |

Browser verification used the supported `DREAMBOARD_LOCAL_REGISTRY_URL`
override so the lane consumed the live maintainer registry containing the final
local SDK snapshot, instead of copying stale private Verdaccio file storage.

## Frontier Trails Size Receipt

Measured in `<product-checkout>` after regeneration:

```text
    4044 examples/published/frontier-trails/shared/manifest-runtime.ts
   10521 examples/published/frontier-trails/shared/manifest-static.json
      43 examples/published/frontier-trails/shared/manifest-contract.ts
     542 examples/published/frontier-trails/shared/manifest-literals.ts
     747 examples/published/frontier-trails/shared/manifest-types.ts
   15897 total
```

Generated TypeScript for the shared manifest surface is 5,376 lines
(`manifest-contract.ts`, `manifest-literals.ts`, `manifest-runtime.ts`, and
`manifest-types.ts`), which satisfies the Phase 3 generated-TS target. The
runtime file is 4,044 lines, effectively at the ~4k budget while replacing the
previous 10k+ static board literal with JSON data.

## Notes

- `verify:package` proves the installed public CLI/package path accepts the
  JSON module.
- `verify:browser` proves the runtime/play path accepts the JSON module.
- The earlier failed browser attempts were dependency-resolution setup failures
  before workspace creation; they did not reach the generated JSON runtime path.
