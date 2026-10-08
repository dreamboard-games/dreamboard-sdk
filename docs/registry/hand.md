# hand

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand
```

A fanned hand that always fits: tap for actions, slide to browse, hold or Alt/Option to inspect, drag to a drop area. A crowded hand opens every card in a sheet.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Hand` requires `zoneId`, `hostId` and `renderCard(card, state)`; `label`, `className`, `renderPreview`, `getCardLabel`, `options` and `reorder` are optional. `renderPreview(card)` draws the inspected face, here and in the hand sheet, as for [CardControl](card-control.md). `options` takes the SDK's `HandFanOptions`: spread a `handFanPresets` entry and override what differs. It defaults to `handFanPresets.open`. With `handFanPresets.tucked`, the middle card hangs a little below the hand's bottom edge and outer cards hang lower along the arc; the edge clips them and keeps its height as cards come and go. Place a tucked hand on the bottom edge of the game and give it larger cards through `--card-w-hand`. Enable `handFeature(core, context)`, `originsFeature` and `dragFeature` in the game binding, and export `useActiveCard`, `useCardRow` and `useDropArea` from it. Use the UI binding's [GameProvider](game-provider.md); it includes card motion and draw coordination automatically.

- The hand renders `game.hand.getSortedCardIds(zone)`. Configure named comparators in `handFeature`; the authored game owns the mode labels, controls, and any shortcut that calls `game.hand.setSortMode(zone, mode)`. Reordering keeps selection and motion identity attached to card IDs.
- Cards sit on the SDK's `handFan` arc and move with Motion on `handFanTiming`, one exponential ease-out, so a card retargeted mid-sweep keeps moving instead of stalling. The fan tightens to fit the hand and never scrolls.
- A finger sliding along the hand raises each card it crosses, by the cards' resting places, so the next card is always one strip away. Lifting there opens that card's menu, sliding off the hand chooses nothing, and turning upward picks the card up.
- When each covered card would show less than 16 px (`CROWDED_STEP` in the copied source), the hand becomes one button showing the card count. It opens `HandSheet`, a bottom sheet with every card at a readable size in hand order. A card there opens the same menu and preview; choosing an action closes the sheet so the table shows the rest of the move, while a card an action picks several of toggles and keeps it open. Swipe down, Escape or Done closes it, and switching seats closes it too.
- `renderCard` draws a card in the state the hand gives it: selected for the lifted card, eligible for playable cards, and dimmed for unplayable cards while another is playable. Keep it stable, at module scope or in `useCallback`, so a drag renders only the dragged card. Leave `layoutId` to the hand.
- A tap opens [card actions](card-actions.md) above the card, and the card holds its pose until the menu closes. A card whose only action picks several cards toggles instead. A dimmed card shakes and says why.
- Hover raises and enlarges the card in place above its neighbours. Crossing a sliver between moving cards keeps the last card raised; leaving the hand lowers it. A hold, Alt/Option, or the Inspect card menu action opens a [card preview](card-preview.md).
- The hand reserves vertical space even when empty; incoming-card previews do not resize the table.
- `reorder` names an interaction with a card input and a [position input](../guides/reducer/interactions-and-steps.md#positions-in-a-zone) on this zone, such as `{ interaction: "play.reorder" }`. Dragging a card along the hand moves its slot to the one nearest the pointer, so its neighbours part around a dashed gap (`.db-hand-insertion`), and dropping there submits the move. The gap holds until the authoritative frame arrives, so no card jumps back; a rejected move, Escape or a release elsewhere returns the card to its slot. A card from elsewhere that the interaction accepts opens a new slot instead. Reordering is off while a sort shows the hand in another order than the zone's own and while the hand is crowded. Keyboard players choose the same interaction from the card menu; an [InteractionForm](interaction-form.md) then lists its places by neighbour, such as "Before 4 of hearts".
- A card with somewhere to land drags at 120% size with a deeper shadow. Only its lifted copy is visible. Its copy under the pointer shares the card's `layoutId`, so it lifts out of the fan without a jump, settles where it lands once the move is confirmed, and glides back otherwise.
- A card arriving with an origin starts at the element marked `data-zone` or `data-player` for it, travels in a portal outside the hand's clipped scroll container, and flips from back to face after settling when it was hidden there. The hand marks itself with its own `data-zone`.

Cards stay pressable when unplayable so they can be inspected and explain themselves. The shared [CardControl](card-control.md) owns the action menu and inspection; its opener stays enabled while the selected action decides whether the card can be played.

Draws keep one face-down flight all the way to the insertion slot before flipping. Eligible rectangular drop areas acquire a nearby pointer early and retain it through a wider exit band; exact board-space targets keep their native shape. Touch has a larger snap margin. Escape, pointer cancellation, a changed frame, and a lost window focus cancel a drag.
