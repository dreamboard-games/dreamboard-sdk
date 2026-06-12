# Alpha Publish Checklist

Use this checklist for the first manual alpha publish of
`@dreamboard-games/sdk`.

## Package

- Package: `@dreamboard-games/sdk`
- Current version: `0.3.0-alpha.1`
- Dist-tag: `alpha`
- Source directory: `packages/sdk`

Publishing `0.3.0-alpha.1` with `--tag alpha` keeps it off the default `latest`
channel. If this exact version is later promoted, use `npm dist-tag add` rather
than republishing.

## Preflight

```sh
pnpm publish:alpha:dry-run
```

This runs:

- publication boundary guard;
- fixed-version guard;
- peer-hygiene guard;
- build;
- test;
- pack dry-run;
- SDK tarball self-containment scan;
- npm publish dry-run with `--tag alpha`.

## Manual Publish

Confirm the npm account and registry:

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
npm view @dreamboard-games/sdk@0.3.0-alpha.1 version dist.tarball dist.integrity --registry=https://registry.npmjs.org/
```

Then prove a disposable install:

```sh
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install @dreamboard-games/sdk@alpha --registry=https://registry.npmjs.org/
node -e 'import("@dreamboard-games/sdk/types").then(() => import("@dreamboard-games/sdk/reducer")).then(() => import("@dreamboard-games/sdk/testing")).then(() => console.log("sdk alpha imports ok"))'
```

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

The workflow already requests GitHub OIDC with `id-token: write` and uses Node 24. Keep npm tokens out of repository secrets.
