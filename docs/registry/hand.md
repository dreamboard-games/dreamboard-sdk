# hand

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand
```

A fanned hand: tap for actions, hold or hover to preview, drag to a drop area.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Hand` requires `zoneId` and `renderCard(card, state)`; `label`, `className`, `getCardLabel` and `sort` are optional. Enable `originsFeature` and `dragFeature` in the game binding. Use the UI binding's [GameProvider](game-provider.md); it includes card motion and draw coordination automatically.

- Cards sit on a `fanLayout` arc and move with Motion springs. The fan tightens to fit the hand and scrolls sideways when it cannot; a finger's sideways swipe browses it.
- `renderCard` draws a card in the state the hand gives it: selected for the lifted card, eligible for playable cards, and dimmed for unplayable cards while another is playable. Keep it stable, at module scope or in `useCallback`, so a drag renders only the dragged card. Leave `layoutId` to the hand.
- A tap opens [card actions](card-actions.md) above the card. A card whose only action picks several cards toggles instead. A dimmed card shakes and says why.
- A hold, or a resting mouse, opens a [card preview](card-preview.md).
- A card with somewhere to land drags. Its copy under the pointer shares the card's `layoutId`, so it lifts out of the fan without a jump, settles where it lands once the move is confirmed, and glides back otherwise.
- A card arriving with an origin starts at the element marked `data-zone` or `data-player` for it, travels in a portal outside the hand's clipped scroll container, and flips from back to face after settling when it was hidden there. The hand marks itself with its own `data-zone`.

Cards stay pressable when unplayable, marked `aria-disabled`, so they can be inspected and explain themselves.
