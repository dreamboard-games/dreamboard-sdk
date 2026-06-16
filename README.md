# Dreamboard SDK

Public SDK package-set repository for Dreamboard game authoring.

## Packages

This repository publishes one public author SDK package:

- `@dreamboard-games/sdk`

The leaf implementation packages in `packages/` are private implementation
inputs. They are not published.

The fixed-version guard runs in CI:

```sh
pnpm version:check
```

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` is the authoritative local and CI gate. It is expected to be
read-only from a clean checkout.

`@dreamboard-games/sdk` owns the supported authoring, generated runtime,
testing, reducer-contract, browser-interaction, and UI subpaths.

## Local Registry

Local SDK snapshots can be published to a local Verdaccio registry:

```sh
pnpm local-registry:publish
```

By default the command publishes to Verdaccio at `http://127.0.0.1:4873` and
writes `.dreamboard-dev/local-registry/sdk-package-set.json`.

## Alpha Publishing

Manual alpha dry-run:

```sh
pnpm check
pnpm publish:alpha:dry-run
```

Manual alpha publish:

```sh
pnpm publish:alpha
```

This publishes only `@dreamboard-games/sdk` with the `alpha` npm dist-tag. See
[`docs/alpha-publish.md`](docs/alpha-publish.md) for the full checklist.

The `release-alpha` GitHub Actions workflow publishes the SDK package with
provenance and the `alpha` npm dist-tag after npm Trusted Publishing is
configured. The workflow verifies the repository, packs one SDK tarball, and
publishes that exact verified artifact.

Before using it, configure npm Trusted Publishing for the SDK package:

- owner: `dreamboard-games`
- repository: `dreamboard-sdk`
- package: `@dreamboard-games/sdk`
- workflow: `release-alpha.yml`
- environment: `npm-alpha`

The workflow uses GitHub OIDC. Do not add npm tokens to this repo for Trusted
Publishing.

## License

This SDK is source-available under the PolyForm Shield License 1.0.0. It is
intended for authoring Dreamboard games and for internal/noncompeting use. It is
not licensed for building or operating a competing game authoring, publishing,
hosting, play, or platform service.
