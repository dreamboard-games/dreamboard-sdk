# Fans and card movement

```tsx
import { fanLayout, liftFanCard } from "@dreamboard-games/sdk";
import { useGame } from "./game";

function Hand({ width }: { width: number }) {
  const cards = useGame((game) => game.zones.get("hand").getCards());
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
the fan's bounding box. Centre the fan with `margin-inline: auto` rather than
`justify-content: center`, so an overflowing fan still scrolls to its first
card, and leave room above it for a lifted card.

- The spread grows by `angle` per card (default 5°) up to `maxSpread` (30°).
- Cards sit `step` apart along the arc (60% of the card width) and tighten
  continuously to fit `width`, down to `minStep` (25%). Past that the fan is
  wider than `width`, and the hand should scroll sideways, which a finger's
  sideways swipe already does.
- There are no breakpoints: a card moves at most as far as the width changes.
- `angle: 0` lays a straight row; with `step` larger than the card it leaves
  gaps until the row has to overlap.

`liftFanCard(card, distance)` moves a card outward along its own tilt, for a
selected or inspected card. Animate `translate` and `rotate` as separate CSS
properties, or Motion's `x`, `y` and `rotate`, so a tilted card never skews.

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
