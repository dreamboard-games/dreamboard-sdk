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

Use `drag={false}` for table cards that only tap and inspect. Use `drag={{}}` for automatic eligible routes, or `drag={{ interaction: "play.discard" }}` for a specific route. Inspection-only controls allow native scrolling in both directions. `Hand` uses this same control with automatic drag routes and provides the fan/arrival layout through its `children` slot.

The opener remains enabled when no action is available, so players can inspect a card and see the reason. It does not spread `card.getProps()` or inherit direct selection activation. Choosing an action calls `card.select`; a sole multi-card action toggles selection directly. A drag closes the menu, and Escape/outside press dismiss it and restore focus to the card. `disabled` is reserved for a transient arrival animation.
