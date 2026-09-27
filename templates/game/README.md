# Headless game starter

A complete small counter shows the four SDK boundaries: reducer authoring in
`app/`, framework-free state and interaction methods, the React adapter in `ui/`,
and local scenario testing. It uses native markup; copy registry components when
your game needs cards, hands, boards, or interaction forms.

Within this repository, run:

```sh
pnpm --dir templates/game check
pnpm --dir templates/game dev
```

The local page starts a new game. Open
`/?scenario=increment&at=incremented` for the named scenario checkpoint.
`ui/dev.tsx` owns executable game and testing imports. `ui/index.tsx` is the hosted
entry: it connects with `iframeSource()` and imports only erased game types through
the binding. The trusted host supplies the reducer bundle from `app/index.ts`.
Never use the local development entry as your hosted UI bundle.

For a standalone project, copy this directory outside the SDK repository, leaving
out `node_modules`, `dist`, and other build outputs. Use Node 24+ and pnpm 10.4.1.
The copied `tsconfig.json` is self-contained, including the `@game` alias.

From the copied directory, replace repository dependency specifiers with these
exact supported versions before installing. The SDK version must be a published
version; this starter currently targets `0.5.0-alpha.3`.

```sh
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const versions = {
  "@dreamboard-games/sdk": "0.5.0-alpha.3",
  zod: "4.4.3",
  react: "19.2.6",
  "react-dom": "19.2.6",
  typescript: "5.9.3",
  vitest: "4.1.10",
  "@types/react": "19.2.15",
  "@types/react-dom": "19.2.3",
  vite: "8.0.16",
  esbuild: "0.28.1",
};
for (const section of ["dependencies", "devDependencies"]) {
  for (const name of Object.keys(pkg[section])) {
    if (versions[name]) pkg[section][name] = versions[name];
  }
}
pkg.packageManager = "pnpm@10.4.1";
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
JS
pnpm install
pnpm check
pnpm build
pnpm dev
```

Keep the resulting `pnpm-lock.yaml` in your project. The React dependencies,
including `@tanstack/react-store`, are already declared in the copied package.
No repository parent configuration or catalog files are needed after copying.

The repository's `pnpm check` gate runs this documented dependency conversion
in a disposable starter, replaces only the SDK version with the packed candidate,
and typechecks, tests, and builds it. It also typechecks and executes the complete
[quick-start example](../../docs/guides/getting-started/quick-start.md) against that
installed SDK. Reference games retain their explicit workspace conversion.

To install source registry items, initialize shadcn for your application and set
`@dreamboard` to `https://registry.dreamboard.games/r/{name}.json` in
`components.json` once that registry is deployed. The bound items import `@game`;
this template maps it to `ui/game.tsx` in TypeScript and Vite. Export your binding's
`useGame` there and enable each installed item's required features. For example,
`board-targets` requires board and pan/zoom features. The [registry guide](../../registry/README.md)
describes local installation proof and the deployment status.
