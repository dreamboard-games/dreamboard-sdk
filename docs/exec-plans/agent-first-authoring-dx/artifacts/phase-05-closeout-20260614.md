# Phase 5 Closeout Receipt

Date: 2026-06-14

Scope:

- SDK branch: `codex/browser-demo-compiled-replay-sdk` at `7e4b704`
- Public CLI branch: `release-2` at `ad2350d4`
- Private integration branch: `next-phase` at `8cd15d199`

## Result

Phase 5 is closed against the local-registry candidate. The SDK root
`./reducer` surface is reduced, advanced-only reducer names move to
`./reducer/advanced`, generated workspaces import the advanced subpath only from
generated files, and private examples typecheck against the repinned local SDK
and CLI snapshots.

Local snapshots:

| Package | Version | Receipt |
| --- | --- | --- |
| `@dreamboard-games/sdk` | `0.3.0-alpha.1-local.20260614T052728Z.73ed32fcc467` | `/Users/mac/code/dreamboard-sdk/.dreamboard-dev/local-registry/sdk-package-set.json` |
| `@dreamboard-games/cli` | `0.1.29-local.20260614T052848Z.84f218303539` | `/Users/mac/code/dreamboard-cli/.dreamboard-dev/local-registry/cli-package-set.json` |

The CLI snapshot was required because the installed CLI bundles SDK codegen at
build time; private regeneration must consume the CLI build that includes the
new generated `@dreamboard-games/sdk/reducer/advanced` imports.

## Verification

SDK source gates:

| Command | Result |
| --- | --- |
| `pnpm --filter @dreamboard-games/sdk build` | pass |
| `pnpm --filter @dreamboard-games/sdk exec bun test` | pass |
| `pnpm --filter @dreamboard-games/sdk typecheck` | pass |
| `pnpm --filter @dreamboard-games/workspace-codegen test` | pass |
| `git diff --check` | pass |

Private integration gates:

| Command | Result | Receipt |
| --- | --- | --- |
| `mise exec node@24 -- pnpm regen:examples` | pass | all examples regenerated; 7 files written per workspace |
| `mise exec node@24 -- pnpm public-sdk-hard-cut:check` | pass | `771 references, 0 strict violation(s)` |
| `mise exec node@24 -- pnpm examples:published:typecheck` | pass | five published examples typechecked |
| `mise exec node@24 -- pnpm verify:dev` | pass | `/Users/mac/code/dreamboard/build/verification/2026-06-14T05-30-26-287Z-34ecb914/authoring/receipt.json`, `/Users/mac/code/dreamboard/build/verification/2026-06-14T05-30-26-287Z-34ecb914/embedded/receipt.json` |
| `DREAMBOARD_PUBLIC_REPO=/Users/mac/code/dreamboard-cli DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 mise exec node@24 -- pnpm verify:package` | pass | `/Users/mac/code/dreamboard/build/verification/2026-06-14T05-38-42-223Z-5f0feb71/package/receipt.json` |
| `git diff --check` in SDK, public CLI, and private monorepo | pass | final hygiene check |

Import checks:

- Authored example code has no `@dreamboard-games/sdk/reducer/advanced` imports.
- Generated manifest/runtime/type files import
  `@dreamboard-games/sdk/reducer/advanced`.
- Examples no longer import removed Dreamboard leaf packages.

## Notes

- A public-npm package lane forced to `@dreamboard-games/sdk@0.3.0-alpha.1`
  fails the generated workspace typecheck because that npm version does not
  contain the Phase 5 exports. The local-registry package lane above is the
  correct pre-publication proof for this hard cut.
- `verify:package` needed the live `DREAMBOARD_LOCAL_REGISTRY_URL` override so
  the packed CLI install and generated workspace install resolve the local SDK
  snapshot from Verdaccio.
- The only authored example diff from regeneration is a Prettier wrap in
  `examples/published/frontier-trails/app/phases/check-game-end.ts`; behavior is
  unchanged.
