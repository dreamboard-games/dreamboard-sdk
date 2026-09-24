# inspector

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/inspector
```

Workspace-bound headless UI; copied source owned by the game.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Inspector` takes no props and reads the selected-seat model: version, phase, me, view, local state, connection and request. It never reads the authoritative hidden reducer checkpoint.
