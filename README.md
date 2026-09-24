# Dreamboard SDK

A TypeScript reducer SDK, framework-free gameplay instance, optional React adapter,
and source-copy component registry. The repository includes complete Hearts and
Hex Network Trading examples.

Start with the [documentation](docs/index.md), [package API](packages/sdk/README.md),
or [reference games](examples/reference-games/README.md).

```sh
corepack pnpm install --frozen-lockfile
pnpm check
pnpm ui dev --game hearts
```

Use Node24+ and pnpm10.4.1. `pnpm check` is the browser-free gate;
`pnpm ui test` runs registry installation, Storybook and both real desktop/touch
browser suites. `pnpm reference [game-id]` tests isolated copies against one packed
SDK. `pnpm release:verify` verifies an immutable release candidate.

Only `@dreamboard-games/sdk`, `/react`, `/reducer`, `/testing` and package metadata
are public entrypoints. Hosted UIs import their game definition **as a type**;
executable reducers belong in the server or local testing entry.

The [registry](registry/README.md) installs editable UI source into the application.
It is not a styled SDK package. Registry hostname deployment is tracked separately
from local build and installation proof. See [publishing](docs/alpha-publish.md).
