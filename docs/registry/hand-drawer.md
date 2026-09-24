# hand-drawer

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand-drawer
```

Workspace-bound headless UI; copied source owned by the game.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`HandDrawer` accepts the same props as Hand inside an initially open native details element. Its summary is keyboard/touch operable; supply a meaningful hand label.
