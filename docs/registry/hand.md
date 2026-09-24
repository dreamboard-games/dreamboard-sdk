# hand

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand
```

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Hand` requires zoneId and renderCard; label, className, getCardLabel and sort are optional. The caller's renderCard renders each visible card view and a back when card.hidden is true. Card selection uses canonical headless props and accessible native buttons.
