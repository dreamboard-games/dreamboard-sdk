# card-row

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-row
```

An ordered horizontal row with insertion previews. Copied source owned by the game.

```tsx
<CardRow
  zoneId="table"
  hostId="table"
  reorder={{ interaction: "play.place" }}
  renderCard={(card, arriving) => (
    <CardControl
      cardId={card.id}
      disabled={arriving}
      drag={{}}
      renderCard={renderCard}
    />
  )}
```

`reorder` names an authored interaction with a card input and a position input.
Name `input` when the interaction has two card inputs. Omit `reorder` for display
only. The reducer decides which positions are legal and commits the move with
`tx.moveComponentToPosition`; the row does not create interactions or change
selection policy. The same action remains available through authored card menus.

The row reads projected zone contents, including pending landings. It opens a
card-sized ghost at the pointer's position, shifts neighbouring cards, and restores
the order on cancellation. A card arriving from another zone opens an additional
slot. Hit testing uses resting slots so the preview cannot move its own targets.

`renderCard(card, arriving)` supplies the game's control, selection, inspection
and drag behavior. Pass `drag={{}}` to discover routes, or restrict it to an
authored interaction. A group drag without an eligible position input can fall
through to an enclosing `DropArea` bound to the game's group move.

The row uses one `--card-w` and `--card-aspect` for its cards. Customize those
variables, gap and padding; keep its single horizontal, centred flex layout for
position hit testing. Normal div props and `ref` support authored selection and
accessibility. The component includes `data-zone` and `data-zone-host` for landing
geometry. Styling lives in the copied `card-row.css`.
