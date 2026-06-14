# Phase 7 Contract Fingerprint Closeout Receipt

Date: 2026-06-14

Scope: `docs/exec-plans/agent-first-authoring-dx/phase-07-contract-fingerprint-and-stale-artifact-recovery.md`

## Result

Phase 7 is source-closed across the SDK and public CLI source:

- `contractFingerprint(source)` is exported from `@dreamboard-games/sdk/reducer`
  and accepts either a game contract or full game definition. Definition inputs
  hash runtime phase-state schemas so `app/phases/*` schema edits are detected.
- Fingerprints use `cfp1:` plus 16 hex chars from canonical SHA-256 over
  manifest literals, public/private/hidden state schemas, phase schemas, and
  the optional Phase 2 error map.
- `StaleContractArtifactError` is exported from `/reducer` and `/testing` with
  `code: "STALE_CONTRACT_ARTIFACT"`, `artifact`, `expected`, `found`, and
  `remedy`.
- Session encode adds optional `meta.contractFingerprint`; session decode
  checks stamped sessions before zod-parsing authored state and leaves legacy
  unstamped sessions on the old parse path.
- `createTestRuntime` checks live vs generated base-state fingerprints before
  materializing a base state.
- Reducer-contract schema accepts optional session `meta` and rejects malformed
  fingerprint strings. Generated wire/zod/builders/version outputs were
  refreshed, with private reducer-contract version `0.2.1`.
- Public CLI `test generate` writes `BASE_STATES_CONTRACT_FINGERPRINT`,
  backfills old generated stubs, stamps `.generation-meta.json`, and stores the
  contract fingerprint in per-base fingerprints.
- Public CLI `test run` classifies stale-contract failures with exit code `42`.
- Public CLI `dev` resets stale disposable dev session pointers and prints a
  single visible notice before retrying with the invocation session.

## Verification

SDK gates:

| Command | Result |
| --- | --- |
| `bun test packages/sdk/src/reducer/contract-fingerprint.test.ts packages/sdk/src/reducer/ingress/runtime-codec.test.ts packages/sdk/src/testing/create-test-runtime.test.ts packages/sdk/src/export-surface.test.ts` | pass, 23 tests |
| `bun test packages/reducer-contract/src/conformance.test.ts` | pass, 81 tests |
| `pnpm --filter=@dreamboard-games/sdk typecheck` | pass |
| `pnpm --filter=@dreamboard-games/reducer-contract generate:check` | pass |
| `NPM_CONFIG_USERCONFIG=/Users/mac/code/dreamboard/.dreamboard-dev/local-aws-publish.npmrc SDK_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 pnpm local-registry:publish` | pass; published `@dreamboard-games/sdk@0.3.0-alpha.1-local.20260614T104617Z.7984c37368ec` |

Public CLI gates:

| Command | Result |
| --- | --- |
| `pnpm --dir /Users/mac/code/dreamboard-cli --filter dreamboard-cli add @dreamboard-games/sdk@0.3.0-alpha.1-local.20260614T104617Z.7984c37368ec` | pass |
| `pnpm --dir /Users/mac/code/dreamboard-cli/apps/dreamboard-cli run typecheck` | pass against installed published SDK snapshot |
| `bun test /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/commands/test.test.ts` | pass, 5 tests |
| `bun test /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/services/testing/reducer-native-test-harness.test.ts` | pass, 6 tests |
| `bun test /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/dev-host/dev-log-relay-plugin.test.ts` | pass, 7 tests |

Private monorepo repin gates:

| Command | Result |
| --- | --- |
| `DREAMBOARD_LOCAL_REGISTRY_URL=http://127.0.0.1:4873 pnpm sdk:repin --receipt` | pass; all SDK consumers pinned to `0.3.0-alpha.1-local.20260614T104617Z.7984c37368ec` |
| `bun /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/index.ts test generate` from `examples/published/frontier-trails` | pass; generated 5 base states for 24 scenarios |
| `pnpm --dir /Users/mac/code/dreamboard/examples/published/frontier-trails typecheck` | pass |
| `bun /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/index.ts test run` from `examples/published/frontier-trails` | pass; 24 scenarios |
| temporary `playerTurnPhaseStateSchema` optional-field mutation followed by `bun /Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/index.ts test run` | expected failure; exit code `42`, `Base states were generated for contract ... Remedy: run \`dreamboard test generate\`, then re-run the tests.` |

## Notes

- The first publish attempt failed with `ENEEDAUTH` because the active
  local-AWS Verdaccio disables user registration and npm still requires a token
  in its userconfig before publish. Re-running with the existing local-AWS
  publish npmrc satisfied the client-side auth check and published
  successfully.
- Private monorepo proof used the public CLI source checkout at
  `/Users/mac/code/dreamboard-cli/apps/dreamboard-cli/src/index.ts` because the
  installed private-monorepo CLI snapshot predates the Phase 7 CLI changes.
- Commands run through pnpm emitted the existing local warning that the shell is
  Node `v20.19.2` while the repo declares Node `>=24`.
