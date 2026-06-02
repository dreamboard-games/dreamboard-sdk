# Dreamboard SDK

Public SDK package-set repository for Dreamboard game authoring.

## Packages

All packages in this repo are released with one fixed version:

- `@dreamboard-games/api-client`
- `@dreamboard-games/sdk-types`
- `@dreamboard-games/reducer-contract`
- `@dreamboard-games/app-sdk`
- `@dreamboard-games/ui-sdk`
- `@dreamboard-games/ui-runtime`
- `@dreamboard-games/testing`
- `@dreamboard-games/workspace-codegen`
- `@dreamboard-games/sdk`

The fixed-version guard runs in CI:

```sh
pnpm version:check
```

## Development

```sh
pnpm install
pnpm build
pnpm test
pnpm pack:dry-run
```

`@dreamboard-games/sdk` is the facade/package-set package. It depends on the
same exact release train as every other package in this repo.

## Local Registry

Local SDK snapshots can be published to a local Verdaccio registry:

```sh
pnpm local-registry:publish
```

By default the command publishes to Verdaccio at `http://127.0.0.1:4873` and
writes `.dreamboard-dev/local-registry/sdk-package-set.json`.

## Alpha Publishing

The `release-alpha` GitHub Actions workflow publishes all SDK packages with
provenance and the `alpha` npm dist-tag.

Before using it, configure npm Trusted Publishing for every package:

- owner: `dreamboard-games`
- repository: `dreamboard-sdk`
- workflow: `release-alpha.yml`
- environment: `npm-alpha`

The workflow uses GitHub OIDC. Do not add npm tokens to this repo for Trusted
Publishing.

## License

This SDK is source-available under the PolyForm Shield License 1.0.0. It is
intended for authoring Dreamboard games and for internal/noncompeting use. It is
not licensed for building or operating a competing game authoring, publishing,
hosting, play, or platform service.
