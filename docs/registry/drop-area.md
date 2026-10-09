# drop-area

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/drop-area
```

Where a dragged card can land, with eligible and over states.

Workspace-bound headless UI; copied source owned by the game.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`DropArea` takes a `binding` for `useDropArea` and a `label`, plus section props and children. Bind it to a board target or to an interaction, such as `{ interaction: "play.discard" }`, and a card dropped on it runs that interaction. A parameterized interaction can bind its destination with `{ interaction: "play.move", params: { destination: "discard" } }`; the SDK combines those inputs with the dragged card and checks current domains before applying either. Two areas can bind different destinations of the same interaction. A ready bound single-card drop submits the complete authored action, including a manually committed interaction. Unbound drops and many-card selection retain their normal draft/commit behavior. While a drag can land on it, it outlines itself; while the card is over it, it fills and grows slightly. Add `data-zone` so cards that arrive there from elsewhere, or leave it for a hand, know where it is. Keyboard players reach the same interactions through [card actions](card-actions.md).

For an immediate zone landing, supply the destination's existing metadata:

```tsx
<DropArea
  binding={{ interaction: "play.move", params: { destination } }}
  zone={{ zoneId, hostId }}
  visibility={zone.visibility}
  label={zone.name}
>
  {/* Render useZonePresentation(zoneId, hostId).cards and .count here. */}
</DropArea>
```

`zone` and `visibility` are supplied together. `index` defaults to the end of
the zone; use `0` when a pile renders its first card as its top. Position targets
already identify the destination and index. The SDK owns pending state and
reconciliation; `CardControl` automatically displays and disables the pending
card. See [pending zone landings](../guides/ui/gestures.md#pending-zone-landings).
