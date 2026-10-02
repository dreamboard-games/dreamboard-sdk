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
animate, with Motion or anything else.

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
- `{ player, hidden: true }`: the card came from the private zones of the one
  player who could act, which the seat's frame does not list, as when an
  opponent plays a card to the table.

Visible cards are followed by id. Hidden cards are counted per zone, because
their ids are positions. A card that arrives face up was face down before, so
it is matched to a face-down card that left; several cards leaving several
zones at once can be attributed to the wrong one. Origins last until the next
frame and start over when the seat or source changes. The first frame has
none, so a game opens without dealing itself again.

Read the origin when a card mounts and animate from the origin's element, such
as the zone with that id or the player's seat:

```tsx
const origin = useGame((game) => game.cards.get(cardId).getOrigin());
```
