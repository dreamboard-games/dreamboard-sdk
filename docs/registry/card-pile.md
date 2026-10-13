# card-pile

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-pile
```

A bound, top-first pile using projected zone contents, including pending landings.
It reveals the next face and reduces the displayed count during pickup. Lifting
the last card reveals an empty outline while its live control stays mounted to
own the pointer, floating card and cancellation. A rejected move restores the
source pile. The count stays above animated card faces.

```tsx
<CardPile
  zoneId="discard"
  hostId="table"
  label="Discard"
  renderCard={(card, arriving) => (
    <CardControl
      cardId={card.id}
      disabled={arriving}
      drag={{ interaction: "play.move" }}
      renderCard={renderCard}
    />
  )}
  renderFace={(card) => renderCard(card, "idle")}
/>
```

`renderCard(card, arriving)` supplies the authored control. `renderFace(card)`
supplies an inert face underneath lifted cards; it must respect `card.hidden` and
must not mount a second control. Pile faces do not need row layout animations;
the gesture overlay owns pickup and drop motion.

The first projected card is the top. An enclosing `DropArea` supplies drop
bindings, destination visibility and landing index. The game decides whether to
cancel same-pile drops, where to insert cards, whether to turn them face up or
down, and when to shuffle. `CardPile` submits no actions.

Omit `count` to use the projected zone count. Supply an aggregate `count` when
another player's concealed zone exposes its size without card identities; the
pile shows a card back and applies pending incoming/outgoing deltas to that
authoritative count. Normal div props and `ref` are forwarded. Styling lives
in `card-pile.css`; `--card-w-pile` sizes both the stack and its live control.
Surrounding scroll containers must reserve space for the
badge outside the card's top and right edges.

Use the pure `Pile` component when no bound drag presentation is needed. The
game binding must export `useGame`, `useZonePresentation`, `useDragOverlay`, `GameCard` and
`ZoneId`.
