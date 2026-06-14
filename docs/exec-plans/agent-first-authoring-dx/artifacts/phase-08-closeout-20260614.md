# Phase 8 Closeout Receipt

Date: 2026-06-14

Scope:

- SDK repo: `/Users/mac/code/dreamboard-sdk`
- Public CLI/skills repo: `/Users/mac/code/dreamboard-cli`

## Result

Phase 8 is source-closed across the SDK docs gate and public skill-doc sample
harness.

SDK:

- Added `scripts/generate-agent-reference.mjs`.
- Added `pnpm docs:generate` and `pnpm docs:check`.
- Wired `pnpm docs:check` into root `pnpm check` after build and before tests.
- Generated and committed:
  - `packages/sdk/REFERENCE.md`
  - `docs/reference/agent-api.md`
  - `docs/reference/llms.txt`
- Added `REFERENCE.md` to the published SDK package files.
- Extended the tarball self-contained check to assert `REFERENCE.md` is packed.
- Kept the compact `llms.txt` below the 32 KiB budget by indexing the
  agent-authoring/runtime facades and pointing heavy surfaces at the full
  in-tarball reference.
- Updated the stale authoring-warning test to assert the Phase 6 diagnostics
  sink path instead of the removed `__DREAMBOARD_AUTHORING_WARNINGS__` global.

Public CLI/skills:

- Added `pnpm skills:typecheck-samples`.
- Wired the sample harness into root `pnpm typecheck`.
- Added `scripts/typecheck-skill-samples.ts`.
- The harness extracts `ts`/`tsx` fences from `skills/dreamboard/**/*.md`,
  skips fences marked `fragment`, and compiles non-fragment snippets in a temp
  scaffold against the pinned SDK.
- Added skill/docs pointers to
  `node_modules/@dreamboard-games/sdk/REFERENCE.md`.
- Fixed the `Buliding Your First Game` and `Offical Documentation` typos.
- Updated obvious stale package imports to the consolidated
  `@dreamboard-games/sdk/*` surface.

## Verification

SDK gates:

| Command                                                                                                                   | Result                                    |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk build`                                                          | pass                                      |
| `mise exec node@24 -- pnpm docs:generate`                                                                                 | pass, 1604 exports, 30956 byte `llms.txt` |
| `mise exec node@24 -- pnpm docs:check`                                                                                    | pass                                      |
| `mise exec node@24 -- pnpm pack:dry-run`                                                                                  | pass, `REFERENCE.md` listed in tarball    |
| `mise exec node@24 -- pnpm --filter @dreamboard-games/sdk exec bun test src/reducer/interaction-input-projection.test.ts` | pass, 12 tests                            |
| `mise exec node@24 -- pnpm check`                                                                                         | pass                                      |
| `git diff --check`                                                                                                        | pass                                      |

Public CLI/skills gates:

| Command                             | Result          |
| ----------------------------------- | --------------- |
| `pnpm run skills:typecheck-samples` | pass, 6 samples |
| `pnpm typecheck`                    | pass            |
| `git diff --check`                  | pass            |

## Notes

- `llms.txt` is intentionally curated rather than exhaustive. The exhaustive
  reference is `REFERENCE.md`; the compact index stays within the Phase 8
  context-budget gate.
- Older long-form tutorial/reference snippets that remain partial are marked
  with the `fragment` fence suffix so the harness has an explicit, reviewable
  escape hatch instead of silently skipping code.
