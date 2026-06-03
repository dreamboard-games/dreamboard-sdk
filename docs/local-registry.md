# Local SDK Registry

The SDK repo owns the local `@dreamboard-games/sdk` package artifact for local development and
integration testing.

Default registry:

```sh
http://127.0.0.1:4873
```

Publish a coordinated local SDK snapshot:

```sh
pnpm local-registry:publish
```

The command publishes `@dreamboard-games/sdk` with one exact version:

```text
0.2.0-local.<timestamp>.<fingerprint>
```

It writes the package-set receipt to:

```text
.dreamboard-dev/local-registry/sdk-package-set.json
```

Generated workspaces or local integration tools should consume the receipt
versions and write:

```ini
@dreamboard-games:registry=http://127.0.0.1:4873
```
