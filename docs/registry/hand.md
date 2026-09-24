# hand

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand
```

Workspace-bound headless UI; copied source owned by the game.

Local development helper; do not import executable game code in the hosted entry.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Hand` requires zoneId and supports label, className, renderCard, getCardLabel and sort. Render from each visible card view; hidden cards use backs. Card selection uses canonical headless props and accessible native buttons.
