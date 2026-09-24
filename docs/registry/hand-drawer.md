# hand-drawer

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand-drawer
```

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`HandDrawer` accepts the same props as Hand inside an initially open native details element. Its summary is keyboard/touch operable; supply a meaningful hand label.

The nested hand requires both zoneId and renderCard. The caller renders hidden cards as backs.
