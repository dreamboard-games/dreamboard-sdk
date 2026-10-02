# turn-banner

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/turn-banner
```

Announces "Your turn" briefly each time the selected seat can act again.

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

Render `TurnBanner` once anywhere in the game. When the selected seat gains an available interaction, or the seat changes to one that has one, an ivory banner springs in over the table for about a second and a half and then leaves. Screen readers hear the same text through a status region that stays mounted. `label` replaces "Your turn"; `className` styles the layer. It never blocks the table: it takes no pointer events or focus. With reduced motion it fades without scaling.
