# card

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card
```

Pure card presentation with states, a shake and a Motion layoutId. No SDK dependency.

Pure display item; no SDK runtime or provider dependency.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Card` is a Motion `div` with `state: idle | eligible | selected | dimmed` and a `shake` counter: change the number to shake the card, as when a dimmed card is tapped. Give the same `layoutId` to a card in each place it can be, and Motion carries it between them; a card in flight is marked `data-moving` and drawn above the others. `CardBack` labels a face-down card; pass `image`, such as a hidden card's `backImage`, to draw the game's back art instead of the plain back. Compose a Card inside a native button for actions; the visual face itself is not a button. `cardSpring` is the spring every card movement uses.
