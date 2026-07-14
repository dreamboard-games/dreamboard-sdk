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

`pnpm check` is the authoritative browser-free local and CI gate. It is
expected to be read-only from a clean checkout. Package, browser, and release
proofs are explicit so the daily gate never launches Playwright or rebuilds a
publication candidate:

```sh
pnpm verify:package
pnpm verify:ui
pnpm verify:release
```

`@dreamboard-games/sdk` owns the supported authoring, generated runtime,
testing, reducer-contract, browser-interaction, and UI subpaths.

## Reference Games

The nine isolated workspaces under
[`examples/reference-games/`](examples/reference-games/README.md) are complete
multi-turn teaching games and packed public-package consumers. Start with the
[canonical example map](docs/reference/canonical-examples.md), then read the
selected game-local `rule.md` and typed scenario source. Generated workspace
contracts and Workbench fixtures are local outputs; the nine per-game lockfiles
are intentionally checked in as exact public-package provenance.

## Alpha Publishing

Manual alpha dry-run (this creates one release candidate and reuses it across
package and UI proof):

```sh
pnpm publish:alpha:dry-run
```

Manual alpha publish:

```sh
pnpm publish:alpha
```

This publishes only `@dreamboard-games/sdk` with the `alpha` npm dist-tag. See
[`docs/alpha-publish.md`](docs/alpha-publish.md) for the full checklist.
The current public changes are summarized in
[`docs/release-notes-0.4.0-alpha.10.md`](docs/release-notes-0.4.0-alpha.10.md).

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
