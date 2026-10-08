import { fanLayout, type FanCard, type FanOptions } from "./fan.js";

/**
 * How a hand rests and focuses one card. Lengths are shares of the resting
 * card, so one configuration fits every card size. Missing options come from
 * `handFanPresets.open`.
 */
export interface HandFanOptions extends Pick<
  FanOptions,
  "angle" | "maxSpread"
> {
  /** Distance between neighbouring cards when there is room, in card widths. Default 0.6, as `fanLayout`. */
  readonly spacing?: number;
  /** Share of each resting card's height below the hand's bottom edge. 0 shows whole cards. */
  readonly tuck?: number;
  /** Focused face width as a multiple of the resting card. */
  readonly focusScale?: number;
  /** Tallest focused face, as a share of the window height. */
  readonly focusMaxHeight?: number;
  /**
   * Sideways shift of the first, second, third… neighbour, in card widths.
   * The focused face's extra width tapers over the same neighbours.
   */
  readonly push?: readonly number[];
  /** Narrowest strip of each neighbour kept visible, in card widths. */
  readonly exposed?: number;
}

/** Starting points for a hand; spread one and override what differs. */
export const handFanPresets = {
  /** Whole resting cards; focusing enlarges the card. */
  open: {
    tuck: 0,
    focusScale: 2,
    focusMaxHeight: 0.55,
    push: [0.29, 0.19, 0.1],
    exposed: 0.35,
  },
  /**
   * Larger cards tucked below the bottom edge and spaced like a dealt hand;
   * focusing mostly reveals the card.
   */
  tucked: {
    spacing: 0.75,
    tuck: 0.4,
    focusScale: 1.4,
    focusMaxHeight: 0.4,
    push: [0.29, 0.19, 0.1],
    exposed: 0.35,
  },
  /** Coarse pointers: a shallower tuck and wider strips to tap. */
  touch: {
    spacing: 0.75,
    tuck: 0.2,
    focusScale: 1.6,
    focusMaxHeight: 0.5,
    push: [0.35, 0.2, 0.1],
    exposed: 0.45,
  },
} as const satisfies Record<string, HandFanOptions>;

/** A card's `fanLayout` pose with its scale and stacking order. */
export interface HandFanPose extends FanCard {
  readonly scale: number;
  /** Stacking order: fan order, with the focused card above the rest. */
  readonly layer: number;
}

export interface HandFan {
  /** One pose per card, in the same coordinates as `fanLayout`. */
  readonly cards: readonly HandFanPose[];
  /** The fan's width, as `fanLayout` reports it. */
  readonly width: number;
  /** The visible band: the fan's height less the tucked part of its cards. */
  readonly height: number;
  /** Space above the band that a focused face can rise into. */
  readonly headroom: number;
}

export interface HandFanInput extends Pick<
  FanOptions,
  "count" | "width" | "cardWidth" | "cardHeight"
> {
  /** Index of the focused card, or -1 for none. */
  readonly focused?: number;
  /**
   * The part of the fan the viewer can see, in fan coordinates, such as
   * `width` plus gutters beside it; a focused face stays inside it. Defaults
   * to `width`, centred on the fan.
   */
  readonly visible?: { readonly left: number; readonly width: number };
  /** Window height in pixels; `focusMaxHeight` is a share of it. */
  readonly windowHeight?: number;
  /** Pixels above the band's bottom edge that a focused face may use. */
  readonly room?: number;
  readonly options?: HandFanOptions;
}

/**
 * Lays a hand on a `fanLayout` arc and focuses one card: upright on the
 * band's bottom edge at a readable size, with nearby cards pushed sideways.
 * Neighbours keep their order and at least their `exposed` strip.
 */
export function handFan({
  count,
  width,
  cardWidth,
  cardHeight,
  focused = -1,
  visible,
  windowHeight = Infinity,
  room = Infinity,
  options,
}: HandFanInput): HandFan {
  const o = { ...handFanPresets.open, ...options };
  const fan = fanLayout({
    count,
    width,
    cardWidth,
    cardHeight,
    angle: o.angle,
    maxSpread: o.maxSpread,
    step: o.spacing === undefined ? undefined : o.spacing * cardWidth,
  });
  const band = Math.max(0, fan.height - o.tuck * cardHeight);
  const view = visible ?? {
    left: (fan.width - width) / 2,
    width,
  };
  const exposed = cardWidth * o.exposed;
  // The widest face this hand shows, before an end card's missing strip.
  const largest = Math.max(
    cardWidth,
    Math.min(
      cardWidth * o.focusScale,
      (windowHeight * o.focusMaxHeight * cardWidth) / cardHeight,
      (room * cardWidth) / cardHeight,
      view.width,
    ),
  );
  const headroom = Math.max(0, (largest * cardHeight) / cardWidth - band);
  const cards: HandFanPose[] = fan.cards.map((card, index) => ({
    ...card,
    scale: 1,
    layer: index,
  }));
  if (focused < 0 || focused >= count)
    return { cards, width: fan.width, height: band, headroom };
  const leftStrip = focused > 0 ? exposed : 0;
  const rightStrip = focused < count - 1 ? exposed : 0;
  const face = Math.max(
    cardWidth,
    Math.min(largest, view.width - leftStrip - rightStrip),
  );
  const scale = face / cardWidth;
  const half = face / 2;
  const centre = Math.max(
    view.left + leftStrip + half,
    Math.min(
      view.left + view.width - rightStrip - half,
      cards[focused].x + cardWidth / 2,
    ),
  );
  cards[focused] = {
    x: centre - cardWidth / 2,
    y: band - (cardHeight * (scale + 1)) / 2,
    rotate: 0,
    scale,
    layer: count,
  };
  // The listed pushes taper over their neighbours. A crowded fan needs a
  // longer tail: never reverse card order or erase the next exposed strip.
  const extra = Math.max(0, half - cardWidth / 2);
  const reach = o.push.length;
  for (const direction of [-1, 1] as const) {
    let previous = centre;
    for (
      let distance = 1, index = focused + direction;
      index >= 0 && index < count;
      distance++, index += direction
    ) {
      const card = cards[index];
      const shift =
        (o.push[distance - 1] ?? 0) * cardWidth +
        (reach ? extra * Math.max(0, 1 - (distance - 1) / reach) : 0);
      const desired = card.x + cardWidth / 2 + direction * shift;
      const angle = (card.rotate * Math.PI) / 180;
      const halfWidth =
        (cardWidth * Math.cos(angle) + cardHeight * Math.abs(Math.sin(angle))) /
        2;
      // The rotated bounding corner alone is not a useful pointer target.
      // Use the horizontal projection of the vertical edge's midpoint, a
      // conservative extent within the card's centre row.
      const middleHalfWidth = (cardWidth * Math.cos(angle)) / 2;
      const clearance =
        distance === 1
          ? Math.max(exposed, half - middleHalfWidth + exposed)
          : exposed;
      // Cards farther right stack higher. Keep their left edges beyond the
      // next card's exposed strip rather than covering it entirely.
      const boundary =
        direction === 1 && distance > 1
          ? Math.max(previous + clearance, centre + half + exposed + halfWidth)
          : previous + direction * clearance;
      let next =
        direction === 1
          ? Math.max(desired, boundary)
          : Math.min(desired, boundary);
      // Keep an immediate neighbour inside the visible part of the fan and
      // touching the face: a gap would drop focus between the two cards.
      if (distance === 1)
        next =
          direction === 1
            ? Math.min(
                next,
                view.left + view.width - middleHalfWidth,
                centre + half + middleHalfWidth,
              )
            : Math.max(
                next,
                view.left + middleHalfWidth,
                centre - half - middleHalfWidth,
              );
      cards[index] = { ...card, x: next - cardWidth / 2 };
      previous = next;
    }
  }
  return { cards, width: fan.width, height: band, headroom };
}

/**
 * An exponential approach to the target. An animation restarted from the
 * current pose continues the same curve at full speed, so retargeting never
 * stalls a card or overshoots.
 */
export function exponentialOut(progress: number): number {
  return (1 - Math.exp(-4.5 * progress)) / (1 - Math.exp(-4.5));
}

/** Durations in seconds with an easing function, as Motion transitions take them. */
export const handFanTiming = {
  /** The focused face rises: 90% in about 45ms. */
  focus: { duration: 0.09, ease: exponentialOut },
  /** Sideways travel, neighbours and returning cards: 90% in about 300ms. */
  settle: { duration: 0.6, ease: exponentialOut },
} as const;

/** An easing function as a CSS `linear()` easing, for CSS transitions and the Web Animations API. */
export function cssEasing(
  ease: (progress: number) => number,
  samples = 24,
): string {
  const points = Array.from({ length: samples + 1 }, (_, index) =>
    Number(ease(index / samples).toFixed(4)),
  );
  return `linear(${points.join(", ")})`;
}
