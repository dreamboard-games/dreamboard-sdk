# Alpha Publish Checklist

Use this checklist for the first manual alpha publish of
`@dreamboard-games/sdk`.

## Package

- Package: `@dreamboard-games/sdk`
- Current version:
  `SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"`
- Dist-tag: `alpha`
- Source directory: `packages/sdk`

Publishing with `--tag alpha` keeps the package off the default `latest`
channel. If a version is later promoted, use `npm dist-tag add` rather than
republishing or deleting packages.

## Preflight

```sh
pnpm install --frozen-lockfile
pnpm check
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
case "$SDK_VERSION" in
  *-alpha.*) ;;
  *) echo "Version is not an alpha prerelease: $SDK_VERSION" >&2; exit 1 ;;
esac
```

This runs:

- formatting, linting, typechecking, and reducer-contract drift checks;
- publication boundary, fixed-version, and peer-hygiene guards;
- build, docs, tests, exact export parity, packed-consumer smoke, and pack
  dry-run.

For a local npm dry-run:

```sh
pnpm publish:alpha:dry-run
```

## Workflow Publish

The preferred alpha path is the `release-alpha` GitHub Actions workflow. It
uses npm Trusted Publishing, verifies with `pnpm check`, uploads the exact SDK
tarball that passed verification, then publishes that artifact with provenance
and the `alpha` dist-tag.

Before dispatching the workflow:

```sh
git status --short
git rev-parse HEAD
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
test "$(git tag --points-at HEAD | grep -c \"^sdk-v$SDK_VERSION$\")" != "0"
npm view "@dreamboard-games/sdk@$SDK_VERSION" version --registry=https://registry.npmjs.org/ || true
```

Dispatch only from the intended clean SHA/tag pair.

## Manual Fallback

Manual publishing is a fallback if the workflow is unavailable. Confirm the npm
account and registry:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm config get registry
```

Publish the alpha package:

```sh
pnpm publish:alpha
```

If npm asks for 2FA, complete the prompt. Do not add npm tokens to this
repository for the manual publish path.

## Post-Publish Verification

```sh
npm view @dreamboard-games/sdk@alpha version dist-tags license repository.url --registry=https://registry.npmjs.org/
SDK_VERSION="$(node -p "require('./packages/sdk/package.json').version")"
npm view "@dreamboard-games/sdk@$SDK_VERSION" version dist.tarball dist.integrity --registry=https://registry.npmjs.org/
npm view "@dreamboard-games/sdk" dist-tags --json --registry=https://registry.npmjs.org/
```

Then prove a disposable install:

```sh
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install @dreamboard-games/sdk@alpha --registry=https://registry.npmjs.org/
node -e 'Promise.all([import("@dreamboard-games/sdk"), import("@dreamboard-games/sdk/types"), import("@dreamboard-games/sdk/reducer"), import("@dreamboard-games/sdk/reducer-contract"), import("@dreamboard-games/sdk/testing"), import("@dreamboard-games/sdk/runtime"), import("@dreamboard-games/sdk/ui")]).then(() => console.log("sdk alpha imports ok"))'
```

If rollback is needed, move the `alpha` dist-tag to the prior known-good
version. Do not delete published package versions.

## Trusted Publishing Follow-Up

After the package exists on npm, configure Trusted Publishing for the GitHub
Actions workflow:

```sh
npm trust github @dreamboard-games/sdk \
  --repo dreamboard-games/dreamboard-sdk \
  --file release-alpha.yml \
  --environment npm-alpha \
  --allow-publish
```

The publish job requests GitHub OIDC with `id-token: write` and uses Node 24.
The verification job has no OIDC permission. Keep npm tokens out of repository
secrets.
