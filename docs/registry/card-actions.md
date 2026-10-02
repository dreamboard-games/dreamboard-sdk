# card-actions

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-actions
```

A compact ivory popover with a pointer to its card, showing available actions
or why it has none. The first action is filled; others are outlined. The same
presentation is used by [DrawPile](draw-pile.md), with generous touch targets.

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`CardActions` takes a `cardId`, the card control as `anchor`, and `onClose`. It opens a Base UI popover above the card with one button per interaction the card can start now, in the game's order, the first one primary. Choosing one selects the card for that interaction, which submits it when the interaction commits on its own; a board or form input then continues the move. A card without an action shows its interaction's unavailable reason, or a plain fallback. Focus moves to the first action and returns to the card when the menu closes; Escape and an outside press close it. `getCardActions` and `getCardUnavailableReason` expose the same rules. [Hand](hand.md) opens it on a tap.
