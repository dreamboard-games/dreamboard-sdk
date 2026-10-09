# Fans and card movement

```tsx
import { fanLayout, liftFanCard } from "@dreamboard-games/sdk";
import { useGame } from "./game";

function Hand({ width }: { width: number }) {
  const cards = useGame((game) =>
    game.me ? game.zones.get("hand", game.me.id).getCards() : [],
  );
  const fan = fanLayout({
    count: cards.length,
    width,
    cardWidth: 72,
    cardHeight: 100,
  });
  return (
    <div
      style={{
        position: "relative",
        width: fan.width,
        height: fan.height,
        marginInline: "auto",
      }}
    >
      {cards.map((card, index) => {
        const { x, y, rotate } = card.getIsSelected()
          ? liftFanCard(fan.cards[index], 16)
          : fan.cards[index];
        return (
          <button
            key={card.id}
            {...card.getProps()}
            style={{
              position: "absolute",
              translate: `${x}px ${y}px`,
              rotate: `${rotate}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
```

The SDK computes positions and origins; the game decides how cards look and
animate, with Motion or anything else. The registry's [hand](../../registry/hand.md)
puts them together with Motion: a fanned hand whose cards keep one `layoutId`
between places and arrive from their origin.

## Fans

`fanLayout({ count, width, cardWidth, cardHeight })` lays cards on a circular
arc. Each card gets `x` and `y`, its CSS `translate` from the fan's top-left
corner, and `rotate` in degrees about its own centre. `width` and `height` are
the fan's bounding box. Centre the fan in its hand and leave room above it for
a lifted card.

- The spread grows by `angle` per card (default 5°) up to `maxSpread` (30°).
- Cards sit `step` apart along the arc (60% of the card width) and tighten
  continuously, so the fan always fits `width`. The layout's `step` is the
  spacing it settled on, about how much of each covered card shows. The hand
  decides when that is too thin to aim at; the registry's hand opens every card
  in a sheet below 16 px.
- There are no breakpoints: a card moves at most as far as the width changes.
- `angle: 0` lays a straight row; with `step` larger than the card it leaves
  gaps until the row has to overlap.

`liftFanCard(card, distance)` moves a card outward along its own tilt, for a
selected or inspected card. Animate `translate` and `rotate` as separate CSS
properties, or Motion's `x`, `y` and `rotate`, so a tilted card never skews.

## Focusing a card

`handFan` lays the same arc and focuses one card for reading. The focused card
stands upright with its bottom on the band's bottom edge, scaled up, and its
neighbours move sideways by a tapering push. They keep their order and an
exposed strip, so the next card stays reachable. Every option is relative to
the resting card, so one configuration fits every card size:

```ts
import { handFan, handFanPresets } from "@dreamboard-games/sdk";

const hand = handFan({
  count: cards.length,
  width,
  cardWidth: 72,
  cardHeight: 100,
  focused: cards.findIndex((card) => card.id === focusedId),
  windowHeight: innerHeight,
  options: { ...handFanPresets.open, focusScale: 2.5 },
});
// hand.cards[i]: { x, y, rotate, scale, layer }; hand.headroom is the space
// the focused face rises into above the band.
```

- `spacing` sets the distance between resting cards in card widths when there
  is room; the fan still tightens to fit.
- `tuck` hides that share of the middle resting card below the band's bottom
  edge. Outer cards follow the arc lower and hide more, so the band keeps its
  height as cards arrive. `hand.height` is the visible band; clip the cards there.
- `focusScale` sizes the focused face; `focusMaxHeight` caps it as a share of
  `windowHeight`, and `room` caps it in pixels when the hand sits near the top.
- `push` lists the sideways shift of the first, second and third neighbour in
  card widths; the face's extra width tapers over the same neighbours.
- `exposed` is the narrowest strip of each neighbour that stays visible.
- `visible` is the part of the hand the viewer sees, in fan coordinates, such
  as the fan plus gutters beside it; an end card's face stays inside it.

`handFanPresets.open` keeps whole resting cards and doubles the focused one.
`tucked` spaces larger cards like a dealt hand and hides 15% of the middle card
below the edge, so a lone card stays readable and focusing reveals the rest.
`touch` suits coarse pointers with a shallower tuck.
Spread one and override what differs.

`handFanTiming.focus` and `handFanTiming.settle` are durations in seconds with
the `exponentialOut` easing, the shape Motion transitions take. A retargeted
animation restarts from the card's current pose, and this curve continues
from there at full speed, so sweeping across the hand never stalls a card.
Without Motion, `cssEasing(handFanTiming.settle.ease)` returns the same curve
as a CSS `linear()` easing:

```ts
const settle = `${handFanTiming.settle.duration}s ${cssEasing(handFanTiming.settle.ease)}`;
element.style.transition = `transform ${settle}`;
```

## Where a card came from

`originsFeature(core)` adds `card.getOrigin()`. For a card that arrived in its
zone with the current frame, it returns where the card was on the previous
frame; otherwise `null`.

- `{ zone, hidden }`: the card was in that zone. `hidden` says the seat saw only
  its back there, so a card drawn from a deck can flip on its way to the hand,
  and one that stayed in its zone and changed face can flip in place.
- `{ player, hidden: true }`: the card is inferred to have come from the private zones of the sole
  player who could act on the immediately preceding frame, which the seat's frame does not list, as when an
  opponent plays a card to the table.

Visible cards are followed by id. Hidden cards are counted per zone, because
their ids name current positions, not persistent card identities. An inferred
zone origin requires one compatible source with enough departures. Several
possible sources, or an arrival among existing hidden cards, return `null`.
Turning a visible card face down among existing hidden cards also returns
`null`, so an unchanged card never receives its flip origin. Player origins
require consecutive frames and one sole active player other than the seat.
Origins last until the next frame and start over when the seat or source
changes. The first frame has none, so a game opens without dealing itself again.

These are animation hints inferred from observed changes, not an authoritative
movement log. A shuffle or an exchange that preserves hidden counts has no
observable identity history. Use a neutral animation when the origin is `null`.
If a game needs exact hidden-card movement, the trusted reducer projection
must provide explicit movement hints limited to what that seat may observe;
do not give concealed cards persistent IDs to reconstruct their history.

Read the origin when a card mounts and animate from the origin's element, such
as the zone with that id or the player's seat:

```tsx
const origin = useGame((game) => game.cards.get(cardId).getOrigin());
```

The registry's `cardEntry`, in `card-motion`, resolves that element for `Hand`
and for any other place a card lands. It prefers the drag copy the card was
released from (marked `data-drag-card`), then the card's own control in the zone
it left, and only then that zone or seat. Draw the flight with `CardArrival`,
which renders above the page, so a scrolling or clipped zone never hides the
card on its way in; an origin wider than the card never enlarges it.
