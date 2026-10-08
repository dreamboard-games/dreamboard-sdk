const RADIANS = Math.PI / 180;

export interface FanOptions {
  readonly count: number;
  /** The width available to the fan, in pixels. */
  readonly width: number;
  readonly cardWidth: number;
  readonly cardHeight: number;
  /** Distance between neighbouring cards along the arc when there is room. Default: 60% of the card width. */
  readonly step?: number;
  /** Degrees between neighbouring cards. Default 5; 0 lays a straight row. */
  readonly angle?: number;
  /** The most degrees between the two end cards. Default 30. */
  readonly maxSpread?: number;
}

/** A card's CSS `translate` from the fan's top-left corner, and its `rotate` about its own centre. */
export interface FanCard {
  readonly x: number;
  readonly y: number;
  /** Degrees clockwise. */
  readonly rotate: number;
}

export interface FanLayout {
  readonly cards: readonly FanCard[];
  /** The fan's bounding box. It is wider than the available width only when a single end card is. */
  readonly width: number;
  readonly height: number;
  /** Distance between neighbouring cards along the arc: about how much of each covered card shows. */
  readonly step: number;
}

/**
 * Lays cards on a circular arc. The spread grows with the card count up to
 * `maxSpread`; the step shrinks continuously so the fan always fits the
 * width. A hand decides for itself when the step is too thin to aim at.
 */
export function fanLayout({
  count,
  width,
  cardWidth,
  cardHeight,
  step = cardWidth * 0.6,
  angle = 5,
  maxSpread = 30,
}: FanOptions): FanLayout {
  if (count < 1) return { cards: [], width: 0, height: 0, step: 0 };
  const gaps = count - 1;
  const delta = gaps ? Math.min(angle, maxSpread / gaps) * RADIANS : 0;
  const edge = (gaps * delta) / 2;
  // The horizontal distance between the end cards' centres is `spacing * span`.
  const span = delta ? (2 * Math.sin(edge)) / delta : gaps;
  // The end cards' outer halves, tilted by the edge angle.
  const ends = cardWidth * Math.cos(edge) + cardHeight * Math.sin(edge);
  const spacing = span ? Math.max(0, Math.min(step, (width - ends) / span)) : 0;
  const radius = delta ? spacing / delta : 0;
  const centres = Array.from({ length: count }, (_, index) => {
    if (!delta) return { theta: 0, x: (index - gaps / 2) * spacing, y: 0 };
    const theta = (index - gaps / 2) * delta;
    return {
      theta,
      x: radius * Math.sin(theta),
      y: radius * (1 - Math.cos(theta)),
    };
  });
  const halfHeight = (theta: number) =>
    (cardHeight / 2) * Math.cos(theta) +
    (cardWidth / 2) * Math.abs(Math.sin(theta));
  const top = Math.min(
    ...centres.map((card) => card.y - halfHeight(card.theta)),
  );
  const bottom = Math.max(
    ...centres.map((card) => card.y + halfHeight(card.theta)),
  );
  const fanWidth = spacing * span + ends;
  return {
    cards: centres.map((card) => ({
      x: card.x + (fanWidth - cardWidth) / 2,
      y: card.y - top - cardHeight / 2,
      rotate: card.theta / RADIANS,
    })),
    width: fanWidth,
    height: bottom - top,
    step: spacing,
  };
}

/** Moves a fanned card outward along its own tilt, as for a selected card. */
export function liftFanCard(card: FanCard, distance: number): FanCard {
  const theta = card.rotate * RADIANS;
  return {
    x: card.x + distance * Math.sin(theta),
    y: card.y - distance * Math.cos(theta),
    rotate: card.rotate,
  };
}
