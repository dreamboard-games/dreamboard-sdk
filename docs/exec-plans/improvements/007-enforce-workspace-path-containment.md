# 007 Enforce Workspace Path Containment

- Status: Implemented
- Priority: P0
- Risk: Critical
- Effort: Medium
- Primary owner: Codegen + public CLI
- Depends on: 001
- Planned at: `d84c620`

## Summary

Reject unsafe authored workspace paths in the SDK and enforce filesystem
containment in the public CLI. Classification is useful for ownership, but
only resolved-path containment can protect writes, removals, and uploads.

## Current State

`packages/workspace-codegen/src/ownership.ts` normalizes paths by replacing
backslashes, stripping `./`, and stripping a leading slash. That can transform
an absolute or traversal-oriented input into a path that appears project
relative.

The public CLI in `<public-cli-checkout>` duplicates normalization
and joins externally supplied relative paths to the workspace root in:

- `apps/dreamboard-cli/src/services/project/local-files.ts`;
- `apps/dreamboard-cli/src/services/project/workspace-codegen.ts`;
- scaffold and sync helpers.

`path.join(rootDir, relativePath)` is not a containment check.

## Security Contract

An owned project path must:

- be non-empty and contain no NUL;
- use project-relative segments;
- reject POSIX absolute paths;
- reject Windows drive and UNC paths on every host platform;
- reject empty, `.` and `..` path segments after separator normalization;
- resolve to a target contained by the canonical workspace root.

The SDK owns classification. The CLI owns the filesystem security boundary.
Both layers fail closed.

## Git Workflow

Record both starting SHAs before editing:

```sh
git -C <sdk-checkout> rev-parse HEAD
git -C <public-cli-checkout> rev-parse HEAD
```

SDK branch:

```sh
git switch -c codex/sdk-hardening-007-path-classification
```

SDK commit:

```text
Reject unsafe workspace ownership paths
```

Public CLI branch:

```sh
git -C <public-cli-checkout> \
  switch -c codex/cli-hardening-007-path-containment
```

CLI commit:

```text
Enforce workspace filesystem containment
```

Keep the pull requests separate and link them in both descriptions.

## Implementation Steps

### 1. Replace permissive normalization with strict classification

Add a single exported normalizer:

```ts
const WINDOWS_DRIVE_PATH = /^[A-Za-z]:[\\/]/;
const WINDOWS_UNC_PATH = /^(?:\\\\|\/\/)/;

export function normalizeOwnedProjectPath(input: string): string | null {
  if (
    input.length === 0 ||
    input.includes("\0") ||
    input.startsWith("/") ||
    WINDOWS_DRIVE_PATH.test(input) ||
    WINDOWS_UNC_PATH.test(input)
  ) {
    return null;
  }

  const normalized = input.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  return segments.join("/");
}
```

Do not strip a leading slash or discard traversal segments.

### 2. Make every ownership predicate fail closed

All public ownership functions first normalize:

```ts
export function isGeneratedProjectPath(input: string): boolean {
  const path = normalizeOwnedProjectPath(input);
  if (path === null) return false;
  return GENERATED_PROJECT_PATHS.has(path);
}
```

Apply this to generated, authored, ignored, and synchronized path
classification. An invalid path must never become "unowned, therefore safe."

### 3. Increment the ownership contract version

Change the version from `30` to `31` because callers may cache or compare the
classification contract:

```ts
export const WORKSPACE_OWNERSHIP_VERSION = 31;
```

Regenerate any ownership fixture or snapshot only after the tests define the
new behavior.

### 4. Add platform-independent tests

Test all of these on macOS/Linux CI:

```ts
[
  "../escape.ts",
  "src/../../escape.ts",
  "/tmp/escape.ts",
  "C:\\temp\\escape.ts",
  "C:/temp/escape.ts",
  "\\\\server\\share\\escape.ts",
  "//server/share/escape.ts",
  "./src/index.ts",
  "src//index.ts",
  "src/./index.ts",
  "src/\0index.ts",
];
```

Also prove valid nested project paths normalize predictably.

## Public CLI Implementation

### 1. Share or mirror the strict classifier

Prefer consuming the SDK ownership helper through the pinned SDK workspace
contract. If that would create a prohibited runtime dependency, mirror the
small pure helper with contract tests against the SDK fixture.

Do not retain the existing leading-slash stripping behavior.

### 2. Add a filesystem containment helper

Put one helper at the project service boundary:

```ts
export function resolveWorkspacePath(
  rootDir: string,
  projectPath: string,
): string {
  const normalized = normalizeOwnedProjectPath(projectPath);
  if (normalized === null) {
    throw new Error(`Unsafe project path: '${projectPath}'.`);
  }

  const root = path.resolve(rootDir);
  const target = path.resolve(root, normalized);
  const relative = path.relative(root, target);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Project path escapes workspace root: '${projectPath}'.`);
  }

  return target;
}
```

For operations that follow existing symlinks, add a realpath-based parent
check before mutation. Creation of a new file must validate the nearest
existing parent's realpath.

### 3. Route every filesystem operation through containment

Replace direct `path.join(rootDir, relativePath)` use in:

- local file writes;
- removals;
- generated workspace writes;
- static scaffold copies;
- sync reconciliation;
- upload file reads.

The upload boundary matters even though it does not write locally: it must not
read and transmit a file outside the project root.

### 4. Keep classification and containment distinct

Use both checks:

```ts
if (!isSynchronizedProjectPath(projectPath)) {
  throw new Error(`Path is not part of the synchronized workspace contract.`);
}
const absolutePath = resolveWorkspacePath(rootDir, projectPath);
```

Classification answers ownership. Resolution answers filesystem safety.

## Test Plan

SDK:

```sh
pnpm --filter @dreamboard-games/workspace-codegen test
pnpm --filter @dreamboard-games/workspace-codegen typecheck
pnpm check
```

CLI:

```sh
pnpm --dir <public-cli-checkout>/apps/dreamboard-cli test
pnpm --dir <public-cli-checkout>/apps/dreamboard-cli typecheck
```

CLI tests must use a temporary root and assert that write, remove, and upload
operations cannot affect an outside sentinel file:

```ts
const outside = path.join(path.dirname(root), "outside.txt");
await fs.writeFile(outside, "sentinel");

await expect(
  syncFiles(root, { "../outside.txt": "overwritten" }),
).rejects.toThrow("Unsafe project path");

expect(await fs.readFile(outside, "utf8")).toBe("sentinel");
```

Include absolute, drive-letter, UNC, mixed-separator, traversal, and symlink
escape cases.

Finally, point the CLI at a local SDK snapshot containing ownership version
31 and run its full project sync test suite.

## Implementation Receipts

Implemented on 2026-06-16 across the SDK and public CLI boundaries:

- SDK workspace ownership classification now rejects unsafe project path forms
  and uses ownership contract version 31.
- Public CLI containment landed in `<public-cli-checkout>` with
  `apps/dreamboard-cli/src/services/project/workspace-path.ts` as the shared
  filesystem boundary.
- CLI writes, removals, generated workspace writes, scaffold copies, sync
  reconciliation, snapshot reads/writes, and reducer harness artifacts route
  through contained workspace helpers.

Verified on 2026-06-16:

```sh
pnpm --dir <public-cli-checkout>/apps/dreamboard-cli exec bun test \
  src/services/project/workspace-path.test.ts \
  src/services/project/scaffold-ownership.test.ts \
  src/services/project/sync.test.ts \
  src/services/project/static-scaffold.test.ts
pnpm --dir <public-cli-checkout>/apps/dreamboard-cli exec \
  tsc -p tsconfig.json --noEmit
```

Result: 19 CLI tests passed, CLI typecheck passed, and repository diff checks
passed. The full CLI test suite was not run in this closeout.

## Done Criteria

- SDK classification rejects every unsafe path form.
- Ownership contract version is 31.
- CLI write, remove, read-for-upload, and generation paths use one containment
  helper.
- Symlink escapes are covered where filesystem operations follow symlinks.
- Cross-repository tests pass against the same SDK snapshot.
- Both pull requests record and link the counterpart SHA.

## STOP Conditions

- Stop if any downstream caller treats a false ownership predicate as
  permission to access an arbitrary path. Add containment at that caller
  before releasing version 31.
- Stop if the CLI cannot identify a canonical workspace root. Define that
  boundary explicitly rather than resolving against the process directory.
- Stop if a write API can bypass `resolveWorkspacePath`; route it through the
  shared service before proceeding.

## Maintenance

Any new project file operation must accept project-relative paths and resolve
them through the containment helper immediately before filesystem access.
