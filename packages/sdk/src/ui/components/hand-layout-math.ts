/**
 * Pure layout math for the controlled `HandView`.
 *
 * The functions here are independent of React and DOM measurement so they can
 * be unit-tested directly. {@link computeFanLayout} matches the algorithm
 * documented in `docs/references/ui-sdk-mobile-hand-and-card-interactions.md`,
 * and {@link chooseHandLayoutMode} translates a measured container width and a
 * caller policy into the actual presentation mode the hand should render.
 */

export type HandPresentationMode = "fan" | "compressed-fan" | "strip" | "tray";

export interface FanLayoutOptions {
  availableWidth: number;
  cardWidth: number;
  cardHeight: number;
  count: number;
  /** Minimum visible slice for any card (touch readability floor). */
  minVisibleSlice: number;
  /** Maximum tilt of the outermost card, in degrees. */
  maxAngle: number;
  /** How many pixels the outermost cards drop below the center card. */
  arcDepth: number;
}

export interface FanCardPosition {
  left: number;
  rotate: number;
  translateY: number;
  zIndex: number;
}

export interface FanLayoutResult {
  positions: FanCardPosition[];
  /** Step between successive card origins (left offset). */
  step: number;
  /** Minimum bounding width of the laid-out hand. */
  totalWidth: number;
  /** Visible portion of each card after overlap, in pixels. */
  visibleSlice: number;
}

export function computeFanLayout(options: FanLayoutOptions): FanLayoutResult {
  const {
    availableWidth,
    cardWidth,
    count,
    minVisibleSlice,
    maxAngle,
    arcDepth,
  } = options;
  if (count <= 0) {
    return { positions: [], step: 0, totalWidth: 0, visibleSlice: cardWidth };
  }
  if (count === 1) {
    return {
      positions: [{ left: 0, rotate: 0, translateY: 0, zIndex: 1 }],
      step: cardWidth,
      totalWidth: cardWidth,
      visibleSlice: cardWidth,
    };
  }

  const idealStep =
    availableWidth > cardWidth
      ? (availableWidth - cardWidth) / (count - 1)
      : minVisibleSlice;
  const step = Math.max(minVisibleSlice, Math.min(cardWidth, idealStep));
  const center = (count - 1) / 2;

  const positions: FanCardPosition[] = Array.from(
    { length: count },
    (_, index) => {
      const t = center === 0 ? 0 : (index - center) / center;
      return {
        left: index * step,
        rotate: t * maxAngle,
        translateY: Math.abs(t) * arcDepth,
        zIndex: index + 1,
      };
    },
  );

  return {
    positions,
    step,
    totalWidth: cardWidth + (count - 1) * step,
    visibleSlice: step,
  };
}

export interface ChooseHandLayoutModeOptions {
  /** Measured container width in CSS pixels. `0` means unmeasured. */
  containerWidth: number;
  cardCount: number;
  cardWidth: number;
  /**
   * Caller-stated layout preference. The pair represents the desktop/mobile
   * intent — the visible-slice gate decides which one renders.
   */
  desktop: HandPresentationMode;
  mobile: HandPresentationMode;
  /** Minimum visible per-card slice that still feels touch-usable. */
  comfortableSlice?: number;
  /** Floor for compressed fan; below this the mobile fallback wins. */
  compressedSlice?: number;
}

/**
 * Choose the actual presentation mode for the current viewport.
 *
 * The decision is target-exposure based, not breakpoint based:
 *
 * - if the desktop preference fits with a comfortable slice, render it as-is;
 * - if it would only barely fit, use a `compressed-fan` when the desktop side
 *   is fan-like;
 * - otherwise switch to the mobile fallback (`tray`, `strip`, or whatever the
 *   caller asked for) so playable targets stay usable.
 */
export function chooseHandLayoutMode({
  containerWidth,
  cardCount,
  cardWidth,
  desktop,
  mobile,
  comfortableSlice = HAND_MODE_GEOMETRY.fan.minVisibleSlice,
  compressedSlice = HAND_MODE_GEOMETRY["compressed-fan"].minVisibleSlice,
}: ChooseHandLayoutModeOptions): HandPresentationMode {
  if (cardCount <= 1) return desktop;
  if (containerWidth <= 0) return desktop;

  const idealStep = (containerWidth - cardWidth) / (cardCount - 1);
  const step = Math.max(0, Math.min(cardWidth, idealStep));

  const desktopIsFanLike = desktop === "fan" || desktop === "compressed-fan";
  if (!desktopIsFanLike) {
    if (containerWidth >= cardWidth * cardCount) return desktop;
    return mobile;
  }

  if (step >= comfortableSlice) {
    return desktop === "compressed-fan" ? "compressed-fan" : "fan";
  }
  if (step >= compressedSlice) {
    return "compressed-fan";
  }
  return mobile;
}

export interface HandModeGeometry {
  minVisibleSlice: number;
  maxAngle: number;
  arcDepth: number;
}

/** Recommended starting values from the mobile-hand reference. */
export const HAND_MODE_GEOMETRY: Record<
  Exclude<HandPresentationMode, "tray" | "strip">,
  HandModeGeometry
> = {
  fan: { minVisibleSlice: 64, maxAngle: 5, arcDepth: 12 },
  "compressed-fan": { minVisibleSlice: 44, maxAngle: 4, arcDepth: 8 },
};
