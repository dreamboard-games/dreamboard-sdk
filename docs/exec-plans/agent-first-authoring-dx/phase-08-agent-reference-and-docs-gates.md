# Phase 8: Generated Agent Reference And Docs Drift Gates

## Objective

For coding agents, the type system and the docs **are** the user interface —
and hand-maintained docs drift. This phase makes the agent-facing API
reference a build artifact generated from the export surface, gates it in CI
the same way `reducer-contract` gates its generated sources, ships it inside
the published tarball so a pinned workspace always carries docs matching its
installed SDK, and adds a typecheck harness for the code samples embedded in
the public skill docs.

Runs after phase 5 so the reference describes the consolidated surface.

## Background

- The actual agent front door is `skills/dreamboard/` in the public
  `dreamboard-games/dreamboard` checkout (SKILL.md + 8 reference pages). It
  is hand-written, version-decoupled from the SDK, and currently contains a
  typo in a top-level heading ("Buliding Your First Game") — harmless in
  itself, but symptomatic: nothing checks these files against reality.
- The SDK already has the enforcement pattern this phase needs:
  `export-surface.test.ts` snapshots, and the `generate:check` drift gate on
  `reducer-contract`. This phase applies the same pattern to documentation.
- Precedent for compiling docs samples exists in-repo: `workspace-codegen`
  integration tests already build temp projects and run `tsc` against
  generated output with the built SDK symlinked.

## Proposed Fix

### 8A. Reference Generator

New script `scripts/generate-agent-reference.mjs` (TypeScript compiler API;
no new runtime dependency — `typescript` is already a dev dependency). Input:
the built `dist/*.d.ts` facades, one section per supported subpath. Output:

```text
packages/sdk/REFERENCE.md      full reference, shipped in the tarball
docs/reference/agent-api.md    same content, repo-browsable copy
docs/reference/llms.txt        condensed index: one line per export
```

Per-export emission format (deterministic, sorted):

```markdown
## @dreamboard-games/sdk/reducer

### createContractAuthoring

```ts
function createContractAuthoring<const Contract extends ContractWithPhases>(
  contract: Contract,
): ContractAuthoring<Contract>
```

Returns contract-bound authoring factories (`game`, `view`, `phase(name)`)
so game code needs no type parameters. <first JSDoc paragraph>
```

Emission rules:

- Signatures are printed from the checker
  (`checker.typeToString(..., TypeFormatFlags.NoTruncation)`), with a
  per-signature length cap (~400 chars) falling back to the declaration text —
  giant conditional-type expansions must never reach the docs.
- Doc text is the **first paragraph** of the JSDoc only; `@internal`-tagged
  exports are excluded (and the generator fails if an `@internal` name is
  reachable from a public facade — a free API-hygiene check).
- `llms.txt` is one line per export:
  `reducer.createContractAuthoring(contract) — contract-bound authoring factories`,
  capped at a budgeted total size (≤ 32 KiB) so the whole index fits in a
  small context slice. The budget is a test assertion, which makes surface
  growth (phase 5's concern) show up as a failing docs build.

### 8B. Drift Gate In `pnpm check`

```jsonc
// root package.json
"docs:generate": "node scripts/generate-agent-reference.mjs",
"docs:check": "node scripts/generate-agent-reference.mjs --check",
"check": "pnpm publication:check && pnpm version:check && node scripts/assert-peer-hygiene.mjs && pnpm build && pnpm docs:check && pnpm test && pnpm pack:dry-run"
```

`--check` regenerates to a temp dir and diffs against the committed files —
the `reducer-contract generate:check` pattern. A PR that changes the export
surface without regenerating docs fails CI with the diff in the log.

### 8C. Ship The Reference In The Tarball

`packages/sdk/package.json`:

```jsonc
"files": ["LICENSE.md", "dist", "README.md", "REFERENCE.md", "!.turbo/**", "!tsconfig.tsbuildinfo"]
```

Why in-tarball matters: workspaces pin exact SDK versions; an agent working
in a workspace can read
`node_modules/@dreamboard-games/sdk/REFERENCE.md` and is guaranteed
version-correct documentation with zero network access, regardless of what
the public docs site currently describes. The skill docs (8D) point agents at
this file as the authoritative per-version reference.

### 8D. Skill Docs Sample Harness (Cross-Repo)

In the public `dreamboard-games/dreamboard` checkout (where skills live):

1. New check `pnpm skills:typecheck-samples`:
   - Extract every ` ```ts ` / ` ```tsx ` fence from
     `skills/dreamboard/**/*.md`.
   - Fences are compiled in a temp workspace scaffolded by the pinned CLI
     codegen (so generated contract imports resolve), against the pinned
     `@dreamboard-games/sdk`.
   - Escape hatch for intentionally partial snippets: a
     ` ```ts (fragment) ` info-string suffix skips compilation; reviewers
     police its use.
2. Wire into the public repo's docs validation flow next to
   `docs:validate` / `docs:broken-links`.
3. Content pass over `skills/dreamboard/references/*` once phases 1–2 land:
   bound-authoring style throughout, `errors` map + `explain` in the testing
   reference, link to the in-tarball `REFERENCE.md`, fix the
   "Buliding Your First Game" typo in SKILL.md.

### 8E. Reference Content Curation

Generation gets the facts right; curation keeps the *shape* agent-efficient.
Two hand-written framing files are embedded at the top of `REFERENCE.md`
(checked, not generated — kept under 100 lines total, content-reviewed
against the budget):

1. **The mental model in one page**: manifest → generated contract → bound
   authoring → reducer (`q`/`tx`/`accept`/`reject`) → views → UI contract.
2. **The decision table**: "I want to … → use …" (≤ 25 rows), e.g.
   "validate an action → rule on the interaction", "store turn-scoped state →
   phase state schema", "know why an interaction is blocked →
   `ctx.explain` / `toBeAvailable()`".

## Files Touched

- `scripts/generate-agent-reference.mjs` (new), root `package.json`
- `packages/sdk/REFERENCE.md`, `docs/reference/agent-api.md`,
  `docs/reference/llms.txt` (generated, committed)
- `packages/sdk/package.json` (`files`)
- Cross-repo (public checkout): `skills/dreamboard/**`, sample harness
  script, docs-validation wiring

## Verification

- `pnpm docs:check` green; deliberately add an export in a scratch branch
  and confirm the gate fails with a readable diff.
- Tarball check in `pack:dry-run`: `REFERENCE.md` present, size within
  budget.
- `llms.txt` size budget test.
- Public repo: `pnpm skills:typecheck-samples` green after the content pass;
  intentionally break one sample to prove the harness catches it.

## Acceptance Criteria

- Changing the public surface without regenerating docs fails `pnpm check`.
- A pinned workspace contains version-correct API docs offline at a stable
  path.
- Every compilable code sample in the skill references actually compiles
  against the pinned SDK.
- No `@internal` export is reachable from a public facade.

## Risks

- **Signature printing quality**: heavily generic signatures can render
  unreadably even with caps. Mitigation: the cap + declaration-text fallback,
  plus JSDoc-first ordering so prose leads. Where a signature is hopeless,
  the fix is a better JSDoc summary — which is the right pressure.
- **Generated docs churn in PR diffs**: regenerated `REFERENCE.md` will
  appear in many PRs. Acceptable (this is how `reducer-contract` generated
  sources already work); keep generation deterministic so diffs are minimal
  and reviewable.
- The sample harness can rot into `(fragment)`-everywhere. Counter-pressure:
  the content pass in 8D establishes the norm that tutorial-critical samples
  compile; reviews enforce it.
