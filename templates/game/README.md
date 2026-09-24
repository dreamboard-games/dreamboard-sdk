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

For a standalone copy, replace `workspace:*` with the exact published SDK version
and catalog dependencies with their resolved versions. Install React,
React DOM, and `@tanstack/react-store` when using `/react`. The repository's
`pnpm reference` gate makes that conversion in a disposable directory, installs
one immutable SDK artifact for both games and this template, then typechecks and
tests each consumer.

To install source registry items, initialize shadcn for your application and set
`@dreamboard` to `https://registry.dreamboard.games/r/{name}.json` in
`components.json` once that registry is deployed. The bound items import `@game`;
this template maps it to `ui/game.tsx` in TypeScript and Vite. Export your binding's
`useGame` there and enable each installed item's required features. For example,
`board-targets` requires board and pan/zoom features. The [registry guide](../../registry/README.md)
describes local installation proof and the deployment status.
