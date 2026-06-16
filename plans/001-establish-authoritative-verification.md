# 001 Establish Authoritative Verification

- Status: Proposed
- Priority: P0
- Risk: Medium
- Effort: Medium
- Primary owner: SDK platform
- Depends on: none
- Planned at: `d84c620`

## Summary

Make `pnpm check` the single, read-only repository contract used by developers,
CI, and release automation. Close the current lint, TSX, formatting, typecheck,
and code-generation gaps before behavioral changes begin.

## Current State

The root check omits formatting, linting, typechecking, and the reducer-contract
drift check:

```json
"check": "pnpm publication:check && pnpm version:check && pnpm peer-hygiene:check && pnpm build && pnpm docs:check && pnpm test && pnpm pack:dry-run"
```

The SDK lint script excludes all TSX:

```json
"lint": "eslint 'src/**/*.ts'"
```

At `d84c620`:

- `pnpm lint` fails on two unused declarations in
  `packages/sdk-types/src/authoring.ts`;
- a direct TSX lint finds 11 errors and one warning, including missing
  `react-hooks/exhaustive-deps` rule registration;
- `pnpm format:check` reports seven files, including three generated
  reducer-contract files and three historical closeout receipts;
- `generate-check.mjs` snapshots real outputs, regenerates into the worktree,
  and can call `process.exit(1)` before restoration.

## Scope

### In scope

- root scripts and CI command consolidation;
- TS and TSX ESLint coverage, including React hooks;
- current lint and formatting debt required to make the gate green;
- explicit formatting policy for generated files;
- read-only reducer-contract generation checks;
- removal of implicit generation from build/test/typecheck commands.

### Out of scope

- action SHA pinning and OIDC job separation, which belong to phase 013;
- behavioral SDK fixes;
- broad formatting of unrelated source.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-001-verification
```

Use one commit:

```text
Establish authoritative SDK verification
```

## Implementation Steps

### 1. Make the root check complete and ordered

Update `package.json` so the root contract is explicit:

```json
{
  "scripts": {
    "generate:check": "pnpm --filter @dreamboard-games/reducer-contract generate:check",
    "check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm generate:check && pnpm publication:check && pnpm version:check && pnpm peer-hygiene:check && pnpm build && pnpm docs:check && pnpm test && pnpm pack:dry-run"
  }
}
```

Keep fast static failures before build and test. CI and release should call only
`pnpm check`, not duplicate its internal commands.

### 2. Cover TSX and register React hooks rules

Update the SDK script:

```json
"lint": "eslint 'src/**/*.{ts,tsx}'"
```

Add `eslint-plugin-react-hooks` at the root and register it in
`eslint.config.js`:

```js
import reactHooks from "eslint-plugin-react-hooks";

export default [
  // existing ignores and TypeScript configs
  {
    files: ["packages/sdk/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];
```

Resolve the existing unused declarations and stale disable comments. Do not
weaken `no-unused-vars` or React hooks rules to make the gate pass.

### 3. Define generated formatting policy

Add `.prettierignore` entries only for machine-owned reducer-contract outputs:

```text
packages/reducer-contract/generated/**
packages/reducer-contract/src/bundle.ts
```

Format the human-owned files currently failing the gate:

```text
docs/exec-plans/agent-first-authoring-dx/artifacts/phase-05-closeout-20260614.md
docs/exec-plans/agent-first-authoring-dx/artifacts/phase-06-closeout-20260614.md
docs/exec-plans/agent-first-authoring-dx/artifacts/phase-07-closeout-20260614.md
packages/sdk/src/reducer/bundle/trusted/trusted-runtime-result.ts
```

### 4. Make generation checks write only to a temporary output root

Add an output-root argument to
`packages/reducer-contract/scripts/generate-ts.mjs`:

```js
function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const OUTPUT_ROOT = path.resolve(readOption("--output-root") ?? ROOT);
const OUT_DIR = path.join(OUTPUT_ROOT, "generated");
const SRC_DIR = path.join(OUTPUT_ROOT, "src");
```

`generate-check.mjs` should generate into a temp directory and compare temp
outputs with tracked outputs:

```js
const generatedRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "reducer-contract-generate-check-"),
);

run("node", ["scripts/generate-ts.mjs", "--output-root", generatedRoot]);

compareTrees(
  path.join(generatedRoot, "generated"),
  path.join(PKG_ROOT, "generated"),
);
compareFiles(
  path.join(generatedRoot, "src", "bundle.ts"),
  path.join(PKG_ROOT, "src", "bundle.ts"),
);
```

Do not regenerate tracked files, snapshot them, or call `process.exit` from
inside the comparison `try`. Set `process.exitCode` after cleanup instead.

### 5. Remove implicit generation from verification commands

Tracked generated artifacts are inputs to ordinary builds. Change
`packages/reducer-contract/package.json`:

```json
{
  "scripts": {
    "generate": "node scripts/generate-ts.mjs",
    "generate:check": "node scripts/generate-check.mjs",
    "build": "tsc --noEmit && tsup",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  }
}
```

Intentional schema changes still run `pnpm generate`; routine verification
must not write.

### 6. Collapse CI onto the root contract

Replace the duplicated body in `.github/workflows/sdk-ci.yml` with:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm check
```

Do the same command consolidation in `release-alpha.yml`; phase 013 will later
split and pin its jobs.

## Test Plan

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm generate:check
pnpm check
```

Prove generation checking is read-only:

```sh
before="$(git diff --binary)"
pnpm generate:check
after="$(git diff --binary)"
test "$before" = "$after"
```

Introduce a temporary change to one generated file, confirm
`pnpm generate:check` fails with a useful diff, then restore that temporary
change before committing.

## Done Criteria

- `pnpm check` covers every intended repository gate.
- CI and release call `pnpm check`.
- SDK lint includes TSX and React hooks.
- Current lint and formatting failures are fixed without disabled rules.
- `pnpm generate:check` never modifies tracked files.
- A clean checkout remains clean after `pnpm check`.

## STOP Conditions

- Stop if a package build genuinely requires generated files not tracked in
  Git; document that missing artifact rather than restoring implicit writes.
- Stop if React hooks rules reveal behavioral defects. Fix those defects in a
  separately reviewed commit within this phase, not by suppressing rules.
- Stop if formatting generated files is a published contract requirement; in
  that case make the generator emit formatted output instead of ignoring it.

## Maintenance

If a new root gate is added later, add it inside `pnpm check` and keep CI and
release as thin callers.
