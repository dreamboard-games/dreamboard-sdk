# Gestures and drop areas

```tsx
import { createPortal } from "react-dom";
import { useCardGesture, useDragOverlay, useDropArea, useGame } from "./game";

function HandCard({ cardId }: { cardId: string }) {
  const card = useGame((game) => game.cards.get(cardId));
  const gesture = useCardGesture(cardId, { drag: {} });
  return (
    <button {...card.getProps()} {...gesture.props}>
      {cardId}
    </button>
  );
}

function DiscardPile() {
  const area = useDropArea({ interaction: "play.discard" });
  return <section {...area.props} aria-label="Discard pile" />;
}

function DraggedCard() {
  const overlay = useDragOverlay();
  return overlay
    ? createPortal(<div ref={overlay.ref}>{overlay.cardId}</div>, document.body)
    : null;
}
```

The SDK provides behavior, not layout. Hooks classify presses, route drops and
report state; the game decides where hands, piles and boards sit and how cards
look and move. Enable `dragFeature` for dragging; tap, hold and Alt/Option inspection work
without it.

## One press, four outcomes

`useCardGesture(cardId, { drag })` returns `props` for the card's own control.
Spread them after the card's selection props. A press becomes:

| Outcome | Mouse                                            | Touch or pen                               |
| ------- | ------------------------------------------------ | ------------------------------------------ |
| Tap     | Release without moving: the native click selects | The same                                   |
| Inspect | Hold Alt/Option over the card (`hover`)          | Hold still for 350 ms (`hold`)             |
| Drag    | Move 8 px in any direction                       | Move 8 px upward                           |
| Browse  | —                                                | Move sideways; native scrolling takes over |

Cards use `touch-action: pan-x`, so a sideways swipe scrolls their container
natively. A row that fits uses `useCardRow` instead. A card drags only when it
has somewhere to land; otherwise the press browses. The
click the browser fires after a hold, drag or browse is not a selection. Keyboard
activation always clicks. `inspecting` and `data-inspecting` tell the game to
show a preview; haptics and preview presentation are the game's choice.
`GESTURE_THRESHOLDS` holds the timings, and `createGestureRecognizer` is the
framework-free classifier the hook uses.

## Rows that fit

`useCardRow(cardAt)` marks a row of cards that never scrolls, such as a hand.
Spread its `props` on the element holding the cards. `cardAt(point)` names the
card whose resting place is under a viewport point, or `null` off the row. A
finger pressed on one of the row's cards slides along it: the card under the
finger becomes active, as a hovered card does for a mouse; lifting there clicks
it, and turning upward drags it. Answering from resting places rather than the
raised face keeps each card one strip's travel from the next. Taps, holds and
straight upward drags work as on any card.

## Where a card lands

`useDropArea(binding)` returns `props` for the element a card can land on, plus
`isEligible` and `isOver`. The browser's own hit testing finds the area under the
pointer, so transformed, rotated and SVG areas need no geometry. A binding is
either a board `DropTarget` from `game.drag.getDropTargets()` or an interaction:

- An interaction with a board input lands only on the board. The copied
  `BoardTargets` binds each space, edge and vertex to its target.
- An interaction without a board input lands on an area bound to it, such as
  `{ interaction: "play.discard" }`. Dropping adds the card to the interaction's
  card input, then submits when the interaction commits automatically. A
  many-card input never toggles a dropped card back out. Name `input` when the
  interaction has two card inputs.

`data-drop-target` marks eligible areas during a drag and `data-drop-over` marks
the one under the pointer. A release outside every area changes nothing. A new
frame, seat or source cancels the drag.

## The dragged card

`useDragOverlay()` returns the dragged `cardId` and a `ref`. Attach the ref to a
copy of the card, usually portalled to `document.body`; it is positioned fixed
and follows the pointer without rendering on each move. After a drop that
submitted a move, `settling` stays true until the authoritative frame arrives,
so the copy can animate into its new place instead of snapping back. The
original card carries `data-dragging` meanwhile.

Keyboard players do not drag. They select the card and then its destination,
through the card's own button, the interaction form or the board's target
buttons.

Use `{ drag: false }` for inspection-only controls such as table cards. Use `{ drag: {} }` to discover eligible drop routes, or put `interaction` and `input` inside `drag` to restrict them. Drag support is explicit; hover and hold inspection remain available when dragging is disabled.
