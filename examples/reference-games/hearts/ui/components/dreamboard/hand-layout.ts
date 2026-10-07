import type { FanLayout } from "@dreamboard-games/sdk";

/** The whole fan shares one readable bottom edge and one local focus. */
export function handFocusLayout({
  fan,
  active,
  cardWidth,
  cardHeight,
  readableWidth,
  lift,
  gutter,
  visibleLeft,
  visibleWidth,
}: {
  fan: FanLayout;
  active: number;
  cardWidth: number;
  cardHeight: number;
  readableWidth: number;
  lift: number;
  gutter: number;
  visibleLeft: number;
  visibleWidth: number;
}) {
  const exposed = cardWidth * 0.2;
  const leftStrip = active > 0 ? exposed : 0;
  const rightStrip = active >= 0 && active < fan.cards.length - 1 ? exposed : 0;
  readableWidth = Math.min(
    readableWidth,
    visibleWidth - leftStrip - rightStrip,
  );
  const scale = readableWidth / cardWidth;
  const bottom = lift + fan.height;
  const poses = fan.cards.map((card) => ({
    ...card,
    x: card.x + gutter,
    y: card.y + lift,
    scale: 1,
  }));
  if (active < 0) return poses;
  const left = visibleLeft + leftStrip + readableWidth / 2;
  const right = visibleLeft + visibleWidth - rightStrip - readableWidth / 2;
  const center = Math.max(
    left,
    Math.min(right, poses[active].x + cardWidth / 2),
  );
  poses[active] = {
    x: center - cardWidth / 2,
    y: bottom - (cardHeight * (scale + 1)) / 2,
    rotate: 0,
    scale,
  };
  // Three-neighbour taper where spacing permits it. A crowded fan needs a
  // longer tail: never reverse card order or erase the next exposed hit strip.
  const extra = Math.max(0, (readableWidth - cardWidth) / 2);
  for (const direction of [-1, 1]) {
    let previous = center;
    for (
      let distance = 1, index = active + direction;
      index >= 0 && index < poses.length;
      distance++, index += direction
    ) {
      const push =
        ([0, 0.29, 0.19, 0.1][distance] ?? 0) * cardWidth +
        extra * Math.max(0, (4 - distance) / 3);
      const desired = poses[index].x + cardWidth / 2 + direction * push;
      const angle = (poses[index].rotate * Math.PI) / 180;
      const halfWidth =
        (cardWidth * Math.cos(angle) + cardHeight * Math.abs(Math.sin(angle))) /
        2;
      // The rotated bounding corner alone is not a useful pointer target.
      // Use the horizontal projection of the vertical edge's midpoint, a
      // conservative extent within the actual centre-row surface. Keep it inside the
      // scroller when an enlarged edge card is clamped against the viewport.
      const middleHalfWidth = (cardWidth * Math.cos(angle)) / 2;
      const clearance =
        distance === 1
          ? Math.max(exposed, readableWidth / 2 - middleHalfWidth + exposed)
          : exposed;
      // Cards farther right have higher fan z-order. Keep their left edges
      // beyond the next card's exposed strip rather than covering it entirely.
      const boundary =
        direction === 1 && distance > 1
          ? Math.max(
              previous + clearance,
              center + readableWidth / 2 + exposed + halfWidth,
            )
          : previous + direction * clearance;
      let next =
        direction === 1
          ? Math.max(desired, boundary)
          : Math.min(desired, boundary);
      if (distance === 1)
        next =
          direction === 1
            ? Math.min(next, visibleLeft + visibleWidth - middleHalfWidth)
            : Math.max(next, visibleLeft + middleHalfWidth);
      poses[index].x = next - cardWidth / 2;
      previous = next;
    }
  }
  return poses;
}

/**
 * An exponential approach to the target. Motion restarts a retargeted
 * animation from the card's current pose; this curve continues from there at
 * full speed, so a sweep never stalls a card and never overshoots.
 */
export function exponentialOut(progress: number) {
  return (1 - Math.exp(-4.5 * progress)) / (1 - Math.exp(-4.5));
}
/** Sideways travel, neighbours and returning cards: 90% home in about 300ms. */
export const handReturn = { duration: 0.6, ease: exponentialOut } as const;
/** The focused face rises: 90% in about 45ms. */
export const handEnter = { duration: 0.09, ease: exponentialOut } as const;
