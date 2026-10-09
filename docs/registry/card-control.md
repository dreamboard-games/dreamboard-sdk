# card-control

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-control
```

`CardControl` owns a card's action-menu opener, hover/hold preview, multi-card selection and menu lifetime. The game owns the face renderer and layout. It uses the canonical types exported by [the game binding](game-provider.md).

```tsx
<CardControl
  cardId={card.id}
  drag={false}
  renderCard={renderCard}
  getCardLabel={cardLabel}
/>
```

A hold, Alt/Option or the menu's Inspect opens `renderPreview(card)`, which defaults to `renderCard(card, "idle")`. Pass a bare face when `renderCard` adds table markers such as damage counters or an exhausted rotation, so the enlarged preview shows only the card.

Use `drag={false}` for table cards that only tap and inspect. Use `drag={{}}` for automatic eligible routes, or `drag={{ interaction: "play.discard" }}` for a specific route. Inspection-only controls allow native scrolling in both directions. `Hand` uses this same control with automatic drag routes and provides the fan/arrival layout through its `children` slot.

The opener remains enabled when no action is available, so players can inspect a card and see the reason. It does not spread `card.getProps()` or inherit direct selection activation. Choosing an action calls `card.select`; a sole multi-card action toggles selection directly. A drag closes the menu, and Escape/outside press dismiss it and restore focus to the card. `disabled` is reserved for a transient arrival animation.

`CardControl` reads the SDK's `useCardPresentation` and pending gesture state. A
provisional landing stays visible and disabled without a preview prop. Concealed
landings use a back and a face-down label. Export `useCardPresentation` from the
game binding alongside the existing gesture hooks.

Without a custom `children` slot, the control owns its Motion `layoutId` and
drag overlay automatically. Its `renderCard` should supply the face without
another `layoutId`. A custom slot, such as the hand's fan, owns its placement
and moving overlay.
