# Phase 08: Docs, Release, And Merge Closeout

Status: proposed.

Depends on Phases 00-07.

Primary repositories: `dreamboard-sdk`, public `dreamboard-games/dreamboard`,
and the private internal monorepo.

## Objective

Close the hard cut with one accurate agent workflow, exact public package
evidence, clean source-size guards, and mergeable repositories. This phase may
repair documentation and release integration drift; it must not reopen the nine
approved rules or introduce another authoring abstraction.

## Documentation Authority

Update documentation in the same change as the command and generated-output
hard cuts.

### SDK documentation

Update:

- this plan README and phase status table;
- `docs/reference/canonical-examples.md`;
- generated reference-game and UI-agent guides;
- each of the nine game READMEs;
- workspace-codegen ownership/generation documentation;
- scenario authoring, exploration, inspection, and JSON-output documentation;
- Workbench commands and generated-output policy; and
- publication and packed-consumer guidance.

The docs must say plainly:

- `rule.md` is gameplay authority;
- technical IDs/slugs remain stable while public names/themes may differ;
- agents author one typed scenario source and use JSON exploration/inspection;
- generated contracts, projections, catalogs, fixtures, and checkpoints are
  local outputs and are not committed;
- all nine reference games are complete multi-turn games;
- landing selection is product-owned; and
- all nine isolated `pnpm-lock.yaml` files remain intentionally checked in.

Remove stale directions to edit generated files, check in base states, run a
private scenario-author workflow, or use old display names and actions.

### Public CLI/dev documentation and help

Update public Dreamboard docs, bundled skill source, and `--help` output for the
single agent path. Help and examples must use the actual stable command names
and machine-readable output; do not document a second human-only format.

Prove that a new agent can:

1. select a canonical example;
2. distinguish visible interactions from currently executable actions;
3. inspect actor views, blockers, and action inputs as JSON;
4. author or extend a typed scenario;
5. run it through test and Workbench; and
6. launch the same source with `dreamboard dev`.

### Internal documentation

Update current internal references for:

- demo-release admission and retained lock provenance;
- source generation after admission;
- websocket replay authoring from compiled SDK scenarios;
- landing thumbnail consumption through the API;
- staging `preview-all` versus the product-selected landing subset; and
- retirement of the private scenario-author command.

Historical plans and retained receipts may keep old names as evidence. Mark
them historical rather than rewriting old results to look current.

## Generated Documentation Policy

Generated documentation remains checked in only where the repository's normal
publication contract requires it. It must be generated from current source and
must not import deleted Workbench fixtures or test bases.

Run generation once, review its diff, and then run the check mode. A clean
generation check means the generated docs match source; it does not permit
generated reference-game workspaces back into Git.

```bash
mise exec node@24 -- pnpm docs:generate
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm generate:check
```

## Verify The Phase 06 SDK Release And Lock Repin

Do not publish or choose a new SDK version in closeout. Verify the immutable
public SDK release created in Phase 06 and record:

- semantic version;
- Phase 06 public-package source commit and Phase 07 final reference-source
  commit;
- tarball SHA-256;
- npm SHA-512 integrity;
- package export proof; and
- packed-consumer receipt.

Re-run publishability and freshness checks without rewriting the nine locks:

```bash
mise exec node@24 -- pnpm reference-games:verify-publishable
git diff --exit-code -- examples/reference-games/*/package.json examples/reference-games/*/pnpm-lock.yaml
```

All nine must already resolve the same exact public version and integrity. If a
repin would change them, return to the Phase 06 release checkpoint; do not
silently publish/repin during closeout. Never hand-edit lockfiles, consolidate
them, or pin them to a local candidate tarball in the merge commit.

After verification, rerun packed proof from a clean package-manager store or disposable
consumer so an existing workspace install cannot mask missing public files.

## Public Authoring Release Proof

Pin the public CLI and dev-host to the exact SDK artifact, stage and pack them,
and retain one compatibility receipt covering the exact trio.

```bash
cd ../dreamboard
pnpm typecheck
pnpm test
pnpm skills:sync-docs
pnpm docs:validate
pnpm docs:broken-links
pnpm cli:stage:publish
pnpm cli:pack:publish
pnpm dev-host:stage:publish
pnpm dev-host:pack:publish
```

The compatibility proof must run the packed artifacts rather than resolving
the sibling SDK checkout.

## SDK Final Gates

Run from a clean checkout after deleting ignored materialized output:

```bash
mise exec node@24 -- pnpm format:check
mise exec node@24 -- pnpm lint
mise exec node@24 -- pnpm typecheck
mise exec node@24 -- pnpm generate:check
mise exec node@24 -- pnpm docs:check
mise exec node@24 -- pnpm reference-games:source-size:check
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm reference-games:verify-publishable
mise exec node@24 -- pnpm reference-games:test:packed --required
mise exec node@24 -- pnpm ui:workbench:build
mise exec node@24 -- pnpm ui:test --required
mise exec node@24 -- pnpm ui:test:packed
mise exec node@24 -- pnpm pack:consumer-check
mise exec node@24 -- pnpm pack:dry-run
mise exec node@24 -- pnpm check
git diff --check
```

`pnpm check` is the broad SDK gate. The focused commands stay in the receipt so
failures identify the actual boundary rather than only the aggregate result.

## Cross-Repository Final Gates

After adopting the same exact public artifacts:

```bash
# public Dreamboard
cd ../dreamboard
pnpm typecheck
pnpm test
pnpm docs:validate
pnpm docs:broken-links

# private internal monorepo
cd ../internal
./gradlew :packages:demo-release-core:test :apps:backend:test
pnpm demo-release pack
pnpm --dir tools/perf test
pnpm --dir tools/perf typecheck
pnpm --dir tools/perf lint
pnpm --dir apps/web build
pnpm --dir apps/web lint
pnpm verify:dev
pnpm verify:browser
pnpm demo-release publish
pnpm demo-release verify-browser --all-active
pnpm verify:package
pnpm fin
```

Re-run required local `pnpm demo-release publish`, thumbnail API, landing, and
retained multi-turn browser proof from the Phase 07 local stack receipt. If the
local stack cannot run, closeout is blocked. Do not claim staging completion
from these commands. `pnpm staging demo-release --yes` requires explicit
authorization and a separate live receipt.

## CI Contract

Required SDK CI must reject:

- tracked workspace-codegen generated paths beneath reference games;
- tracked `test/generated/**` or `test/bases/**`;
- checked Workbench fixtures/catalog output;
- obsolete reference-game screenshots;
- anything other than nine isolated per-game lockfiles;
- source-size or lock-line budget regressions;
- stale generated docs;
- reference metadata that disagrees with manifest player bounds or display
  identity;
- any stale SDK-owned `demoRelease.screenshot` block;
- a full-game scenario missing from any of the nine games;
- a packed consumer that resolves workspace-only imports; and
- a dirty generation run after clean-checkout verification.

Internal CI must reject:

- a demo-release candidate whose package/lock SDK identity does not equal the
  admitted public artifact;
- a landing allowlist slug absent/unavailable in the active catalog, lacking a
  complete-game browser receipt, or lacking a packaged thumbnail;
- a landing image component without its accessible null/error fallback;
- a hard-coded `/demos/<slug>` image path; and
- an all-nine local browser receipt that lacks a developed, reconnect, terminal,
  or media result for any active demo.

## Final Source-Size Budget

Record and enforce these closeout ceilings:

| Budget                                      |   Required closeout value |
| ------------------------------------------- | ------------------------: |
| Tracked reference-game text                 | no more than 75,000 lines |
| Tracked canonical workspace-codegen outputs |                   0 paths |
| Tracked `test/generated/**`                 |                   0 paths |
| Tracked `test/bases/**`                     |                   0 paths |
| Tracked Workbench fixture/catalog output    |         0 generated paths |
| Retained per-game lockfiles                 |                 exactly 9 |
| Combined retained lock lines                |       no more than 15,000 |
| Obsolete worker-placement screenshots       |         0 files / 0 bytes |

The baseline was 249,319 tracked game lines, including 196,818 generated
workspace/test lines. Closing below 75,000 lines demonstrates that the hard cut
removed derived state rather than merely relocating it while leaving room for
the currently thin games to become complete.

Curated product thumbnails are counted separately from obsolete test
screenshots and must be listed by slug and digest in the release receipt.

## Deletion And Terminology Scan

The final scan must cover active source, tests, scripts, docs, metadata, and
help output for:

- old generated-path imports;
- `test/bases` and checked checkpoint terminology;
- private scenario-author commands;
- broken `/demos/<slug>/desktop.png` and `/demos/<slug>/thumb.png` paths;
- legacy Stormtrail actions and resources;
- old public display names where the approved theme changed; and
- prose that treats current implementations or historical tests as gameplay
  authority.

Historical receipts may match. Active command/help/documentation matches must
be removed or explicitly justified.

## Merge Readiness

Before requesting review:

1. Rebase or merge the current target branch without rewriting unrelated user
   work.
2. Verify `git status --short` is empty in every repository used for a retained
   receipt.
3. Verify ignored generated output is not staged.
4. Review `git diff --stat` and the deletion ledger against the Phase 06
   baseline.
5. Confirm no lockfile changed except through the exact-version repin.
6. Confirm all generated docs are intentional and checks are clean.
7. Push the exact commits named by the receipts.
8. Open or update PRs with dependency order, local proof, cross-repository proof,
   and any explicitly unrun live gate separated.
9. Confirm required CI is green and each PR reports mergeable with no unresolved
   review or conflict.

Do not combine unrelated dirty-worktree changes merely to obtain a clean status.

## Closeout Receipt

Write `artifacts/phase-08-docs-release-and-merge-closeout-receipt.md` containing:

- the three repository commits and PR links;
- final game names mapped to stable IDs/slugs;
- final source-size inventory and deleted-path counts;
- nine-lock version/integrity proof;
- SDK tarball and packed-consumer digests;
- public CLI/dev-host compatibility receipt reference;
- nine-game full-play and packed proof;
- local internal pack, perf, browser, and landing evidence;
- curated product thumbnails and digests;
- every verification command with pass/fail status;
- CI and mergeability status; and
- an explicit `not run` section for staging or production proof not authorized.

Keep private logs and credentials in the owning private repository. The SDK
receipt carries only sanitized cross-repository status and public artifact
identity.

## STOP Conditions

Do not mark this plan complete if:

- any approved game rule remains unimplemented or lacks a full normal-setup
  playthrough;
- generated reference-game or Workbench output is still tracked;
- there are not exactly nine verified per-game lockfiles;
- packed proof uses workspace or sibling-checkout resolution;
- public docs/help still teach a private or duplicate authoring path;
- internal demo admission, Stormtrail perf, ordered landing allowlist,
  API-backed thumbnails/fallback, or ignored screenshot metadata are not cut
  over;
- source-size budgets fail;
- a required local gate fails or is omitted without a blocker disposition;
- a dirty worktree or unrelated change is included in a release commit;
- required CI is red or a PR is not mergeable; or
- local proof is described as staging or production closure.

The plan is complete only when all required work is merged or merge-ready, the
closeout receipt is accurate, and no obsolete authority or generated source
surface remains.
