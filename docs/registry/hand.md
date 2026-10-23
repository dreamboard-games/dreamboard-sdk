# hand

```sh
pnpm dlx shadcn@4.21.0 add @dreamboard/hand
```

A fanned hand that always fits: tap for actions, slide to browse, hold or Alt/Option to inspect, drag to a drop area. Browse opens every card in a readable sheet.

Hosted-safe control; the game binding imports reducer types only.

Follow [registry installation](../../registry/README.md) first. Installation copies
source into your workspace; read its exported props and compose normal DOM props
and slots there. Styling uses copied tokens. The source file and registry metadata
are authoritative; there is no separate SDK component import.

## Props and behavior

`Hand` requires `zoneId`, `hostId` and `renderCard(card, state)`; `label`, `className`, `renderPreview`, `getCardLabel`, `options` and `reorder` are optional. `renderPreview(card)` draws the inspected face, here and in the hand sheet, as for [CardControl](card-control.md). `options` takes the SDK's `HandFanOptions`: spread a `handFanPresets` entry and override what differs. It defaults to `handFanPresets.open`. With `handFanPresets.tucked`, the middle card hangs a little below the hand's bottom edge and outer cards hang lower along the arc; the edge clips them and keeps its height as cards come and go. Place a tucked hand on the bottom edge of the game and give it larger cards through `--card-w-hand`. Enable `handFeature(core, context)`, `originsFeature` and `dragFeature` in the game binding, and export `useActiveCard`, `useCardRow`, `useDropArea`, `useZonePresentation` and `useCardPresentation` from it. Use the UI binding's [GameProvider](game-provider.md); it includes card motion and draw coordination automatically.

- The hand renders `game.hand.getSortedCardIds(zone)`. Configure named comparators in `handFeature`; the authored game owns the mode labels, controls, and any shortcut that calls `game.hand.setSortMode(zone, mode)`. Reordering keeps selection and motion identity attached to card IDs.
- Cards sit on the SDK's `handFan` arc and move with Motion on `handFanTiming`, one exponential ease-out, so a card retargeted mid-sweep keeps moving instead of stalling. The fan tightens to fit the hand and never scrolls.
- A finger sliding along the hand enlarges each card it crosses in a portalled preview, while the fan and its resting targets stay still. The shared browser tries above the finger, below with extra hand clearance, then the sides. It respects the visible viewport and safe areas, retains a fitting placement throughout the gesture, and never shrinks below 180px wide. Lifting there opens that card's menu, sliding off the hand chooses nothing, and turning up or down picks the card up.
- A visible **Browse N cards** button opens every card at a readable size in hand order. However thin the fan's cards get, each keeps its tap, hold, slide and drag; Browse is the readable view beside them. It is also the fallback when the screen cannot fit a readable touch preview. The sheet uses the same menus and inspection; choosing an action closes it, while multi-card selection keeps it open. Swipe down, Escape or Done closes it, Done restores focus to Browse, and switching seats closes it too. No instructional hint is shown.

- `renderCard` draws a card in the state the hand gives it: selected for the lifted card, eligible for playable cards, and dimmed for unplayable cards while another is playable. Keep it stable, at module scope or in `useCallback`, so a drag renders only the dragged card. Leave `layoutId` to the hand.
- A tap opens [card actions](card-actions.md) above the card, and the card holds its pose until the menu closes. A card whose only action picks several cards toggles instead. A dimmed card shakes and says why.
- Hover raises and enlarges the card in place above its neighbours. Crossing a sliver between moving cards keeps the last card raised; leaving the hand lowers it. A hold, Alt/Option, or the Inspect card menu action opens a [card preview](card-preview.md).
- The hand reserves vertical space even when empty; incoming-card previews do not resize the table. Resting cards sit below an empty band they lift into; the hand sets its height as `--db-hand-lift`, so a host can place a control such as Browse in that band and pad only what the control needs beyond it. Only cards answer pointers there.
- `reorder` names an interaction with a card input and a [position input](../guides/reducer/interactions-and-steps.md#positions-in-a-zone) on this zone, such as `{ interaction: "play.reorder" }`. Dragging a card along the hand moves its slot to the one nearest the pointer, so its neighbours part around a dashed gap (`.db-hand-insertion`), and dropping there submits the move. On release, the pending card lands in that slot while the SDK waits for the authoritative frame; a rejected move, Escape or a release elsewhere returns the card to its slot. A card from elsewhere that the interaction accepts opens a new slot instead; one it does not accept leaves the hand's enclosing drop area, such as a move into the hand, reachable. Reordering is off while a sort shows the hand in another order than the zone's own. Keyboard players choose the same interaction from the card menu; an [InteractionForm](interaction-form.md) then lists its places by neighbour, such as "Before 4 of hearts".
- A card with somewhere to land drags at 120% size with a deeper shadow, then takes the size of the place it would land: a pile's stack, or a gap such as the hand's own. Over a pile it sits flat on the stack, and over a zone that hides it, it shows its back. On touch, settling into a pile ticks. Only its lifted copy is visible. Its copy under the pointer shares the card's `layoutId`, so it lifts out of the fan without a jump, settles where it lands once the move is confirmed, and glides back otherwise.
- A card arriving with an origin starts at the element marked `data-zone` or `data-player` for it and travels in a portal outside the hand's clipped container. A draw lands upright above the tucked edge, then reveals its face while settling into the fan once confirmed. Other hidden arrivals turn face up after travel. The hand marks itself with its own `data-zone`.

Cards stay pressable when unplayable so they can be inspected and explain themselves. The shared [CardControl](card-control.md) owns the action menu and inspection; its opener stays enabled while the selected action decides whether the card can be played.

Piles catch a dragged card near their stack and zones hold it inside their edge; see [snapping](../guides/ui/gestures.md#snapping). Exact board-space targets keep their native shape. Touch reaches further. Escape, pointer cancellation, a changed frame, and a lost window focus cancel a drag.
