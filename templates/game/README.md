# Local game starter

Create a Dreamboard game on your own machine with [Giget](https://github.com/unjs/giget).
Use Node 24+ and pnpm 10.4.1. No Dreamboard account or backend is required.

```sh
npx giget@3.3.1 gh:dreamboard-games/dreamboard-sdk/templates/game#main my-game
cd my-game
pnpm install
pnpm check
pnpm dev
```

Open the URL printed by `dreamboard-dev`. Click Add one to play the counter,
switch seats to inspect player perspectives, and use Reset to start again.
Only the first seat can increment in this example. Refresh after source edits to
rebuild. The host saves the session in browser storage and offers Save checkpoint
and Restore checkpoint. Once loaded, play can continue without internet; reloading
still needs the local development server.

The template already pins compatible published SDK and dev-host versions and
owns its TypeScript settings. No dependency conversion or parent repository is
needed. Keep the generated `pnpm-lock.yaml` in your project. Change `name` in
`package.json` to name your game package.

The command uses the current starter on `main`. To reproduce a specific version,
replace `#main` with a Git tag or commit containing this starter. Keep the SDK and
dev-host pins together when upgrading; the host must support the same SDK.

## Project layout

- `manifest.ts` defines the game components and supported player counts.
- `app/game.ts` owns the rules and player view; `app/index.ts` exports the reducer bundle.
- `ui/index.tsx` connects the UI to the host using `iframeSource()`.
- `ui/game.tsx` provides the typed React binding and the counter component.
- `test/` contains rule tests and the named increment scenario.

`pnpm check` runs TypeScript and Vitest. `pnpm build` builds the standalone local
example with Vite, using `ui/dev.tsx` and its testing source. View that build with
`pnpm exec vite preview`; it also accepts `/?scenario=increment&at=incremented`.
Its output is not a hosted
Dreamboard UI bundle: the hosted entry is `ui/index.tsx` and imports only erased
game types, while the host executes `app/index.ts` separately.

This starter supports advanced local authoring. It does not upload to Studio or
publish a hosted Playtest. See the [local authoring guide](https://github.com/dreamboard-games/dreamboard/blob/main/docs/quickstart.mdx)
for host behavior and asset limitations.

## SDK repository verification

The starter stays here alongside its SDK contract tests. From the SDK checkout,
run `pnpm --dir templates/game check` or `pnpm --dir templates/game dev` after
installing dependencies. The template consumes the published SDK even in this
checkout. `pnpm check` additionally tests an isolated starter against the packed
candidate SDK, changing only its SDK dependency. CI bootstraps the exact commit
with Giget and runs install, check, and build against the unchanged published pins.

## Optional UI components

To install source registry items, initialize shadcn for your application and set
`@dreamboard` to `https://registry.dreamboard.games/r/{name}.json` in
`components.json` once that registry is deployed. The bound items import `@game`;
this template maps it to `ui/game.tsx` in TypeScript and Vite. Export your binding's
`useGame` there and enable each installed item's required features. For example,
`board-targets` requires board and pan/zoom features. The
[registry guide](https://github.com/dreamboard-games/dreamboard-sdk/blob/main/registry/README.md)
describes local installation proof and deployment status.
