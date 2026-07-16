# Publishing checklist

The `Release` GitHub Actions workflow is the supported publisher for
`@dreamboard-games/sdk`. It uses npm Trusted Publishing and publishes the exact
tarball produced by release verification.

## Prepare the version

Use a package version whose suffix selects the intended npm tag:

| Version         | npm tag  |
| --------------- | -------- |
| `x.y.z-alpha.n` | `alpha`  |
| `x.y.z-beta.n`  | `beta`   |
| `x.y.z`         | `latest` |

Run the local gates from a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm release:verify
pnpm ui test --all
git status --short
```

`pnpm release:verify` runs the browser-free core checks, packs the SDK once,
validates and smoke-installs that exact tarball, then verifies all nine
reference games against it. UI browser proof is intentionally separate.

The release candidate directory contains exactly one tarball and
`build/release/candidate/candidate.json`:

```json
{
  "schemaVersion": 1,
  "release": { "gitTag": "v0.4.0-alpha.13", "npmTag": "alpha" },
  "package": {
    "name": "@dreamboard-games/sdk",
    "version": "0.4.0-alpha.13",
    "file": "dreamboard-games-sdk-0.4.0-alpha.13.tgz",
    "integrity": "sha512-..."
  }
}
```

Do not repack after verification.

## Publish

Before dispatching the workflow, confirm the intended commit, version, and npm
state:

```sh
git rev-parse HEAD
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
npm view "@dreamboard-games/sdk@$SDK_VERSION" version --registry=https://registry.npmjs.org/ || true
```

Dispatch the workflow from the default branch at the intended commit and
version. It verifies the checkout, uploads the candidate, and publishes the
verified tarball with provenance.

If publishing fails, use GitHub's **Re-run failed jobs** action. The resumed
job reuses the uploaded candidate and classifies the registry state:

- an unpublished version is published;
- a version with matching integrity is already complete;
- a version with different integrity fails without changing npm.

A fresh workflow run creates a fresh candidate and is not the recovery path.

## Verify and repin

After publication:

```sh
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
npm view "@dreamboard-games/sdk@$SDK_VERSION" version dist.tarball dist.integrity --registry=https://registry.npmjs.org/
npm view @dreamboard-games/sdk dist-tags --json --registry=https://registry.npmjs.org/
pnpm reference pin "$SDK_VERSION"
pnpm reference
```

Commit the nine updated game manifests and lockfiles. If rollback is necessary,
move the npm tag to a known-good published version; do not delete a published
version.

## Trusted Publishing setup

Configure the package for the repository's `release.yml` workflow and
`release` environment:

```sh
npm trust github @dreamboard-games/sdk \
  --repo dreamboard-games/dreamboard-sdk \
  --file release.yml \
  --environment release \
  --allow-publish
```

The publish job requests GitHub OIDC with `id-token: write` and uses Node 24.
Keep npm publish tokens out of repository secrets.
