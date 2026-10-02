# draw-pile

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/draw-pile @dreamboard/hand
```

`DrawPile` adds a draw interaction to the existing stack presentation. Use it
inside the UI binding's [GameProvider](game-provider.md). The binding supplies `useGame`; the
destination hand also requires `originsFeature`.

```tsx
<GameProvider source={source}>
  <DrawPile
    zoneId="deck"
    interaction="drawing.draw"
    destinationZoneId="hand"
    label="Draw pile"
  />
  <Hand zoneId="hand" renderCard={renderCard} />
</GameProvider>
```

The bound interaction must be a no-input draw action that moves one card from the
source zone into the destination hand. Its reducer owns actor authorization,
availability, card choice and state changes. Both menu Draw and a hand drop
submit that interaction through the SDK; lifting or cancelling submits nothing.

For example, a player phase can define the interaction below. The phase limits
the actor to its active player, and the rule is checked again on submission.

```ts
draw: play.interaction({
  presentation: { label: "Draw" },
  inputs: {},
  rules: [{
    id: "deck-has-cards",
    errorCode: "DECK_EMPTY",
    message: "The draw pile is empty.",
    available: ({ q }) => q.zone.sharedCards("deck").length > 0,
  }],
  reduce({ tx, input }) {
    tx.deal({
      fromZoneId: "deck",
      toZoneId: "hand",
      playerId: input.playerId,
      count: 1,
    });
  },
}),
```

Bind this phase's interaction key (for example, `play.draw`) to `DrawPile`.
Free play can use the same UI with broader reducer permissions.

Tap, click or Enter opens the action menu. Escape closes it and returns focus.
The pile and its lifted copy show the top card's back art when the game has one.
A pointer drag lifts a slightly enlarged back with a stronger shadow, highlights
the hand and opens an insertion gap when over it. Drop elsewhere or press Escape
to glide back. Availability and submission failures use the game's reason.

Pending draws stay face down. A confirmed menu draw flies from the pile; a
confirmed drag settles from the release position. The card travels outside the
clipped hand, settles into its slot, then flips from back to face. A rejected draw
returns to the pile. Reduced motion skips enlargement, travel and flipping.
