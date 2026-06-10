# @dreamboard-games/workspace-codegen

Private build-time codegen engine for Dreamboard game workspaces:

- `manifest-contract.ts` — generates the typed manifest contract sources
  (`shared/manifest-*.ts`) from a `GameTopologyManifest`, including board
  topology resolution (hex/square edges and vertices) and id schemas.
- `seeds.ts` — generates framework-owned files (`ui-contract.ts`, tsconfigs)
  and one-time seed scaffolds for new workspaces.
- `manifest-validation.ts` — authoring-time manifest validation.
- `ownership.ts` — file-ownership rules (which paths the generator owns vs.
  preserves).

This package is **never published**. External consumers (the dreamboard CLI)
reach it through the public SDK's `@dreamboard-games/sdk/codegen` subpath,
which bundles this package at build time. It depends only on
`@dreamboard-games/sdk-types` (type-only) so the dependency graph stays
acyclic: `sdk-types → workspace-codegen → sdk`.

The integration tests run `tsc` against generated output in temp projects and
symlink `packages/sdk` by repo path — they need the SDK's `dist/` built first
(wired via this package's `turbo.json` test dependency).
