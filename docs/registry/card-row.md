# card-row

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/card-row
```

An ordered horizontal row with insertion previews. Copied source owned by the game.
A crowded row overlaps its cards evenly to fit its width, like a hand, and offers a visible **Browse N cards** button. However thin its overlapped cards get, each keeps its own gestures; Browse opens every card at a readable size in order.

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

A finger slides across resting slots to inspect cards without moving the row. With `CardControl`, the enlarged face appears outside the finger's reserved area: above first, then below, then either side. Positioning uses Floating UI against the visible viewport and safe-area margins. The preview keeps its accepted placement and size while they fit, tries alternatives before shrinking, and stops below 180px wide; Browse remains available when no readable placement fits. Releasing a slide opens the chosen card's actions, pulling up or down drags it, and cancellation chooses nothing. No instructional hint is shown.

`label` names the Browse dialog (default `Cards`). The shared browser preserves order and each authored control's actions; `CardControl` disables dragging inside the sheet and closes it after an action. Done restores focus to Browse, and changing seats closes the sheet.

`renderCard(card, arriving)` supplies the game's control, selection, inspection
and drag behavior. Pass `drag={{}}` to discover routes, or restrict it to an
authored interaction. A group drag without an eligible position input can fall
through to an enclosing `DropArea` bound to the game's group move.

The row uses one `--card-w` and `--card-aspect` for its cards. Customize those
variables, gap, padding and `--card-row-min-slot`; keep its single
horizontal, centred flex layout, where card slots shrink evenly and the last
keeps a whole card, for position hit testing. Normal div props and `ref` support authored selection and
accessibility. The component includes `data-zone` and `data-zone-host` for landing
geometry. Styling lives in the copied `card-row.css`.

The game binding must export `useCardRow` as well as the existing row hooks.
