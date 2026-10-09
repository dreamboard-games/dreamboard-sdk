import type { Point } from "./features/pointer-session.js";
import { magneticDropPoint } from "./gesture.js";

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Tuned by hand with a mouse and emulated touch. Distances to a pile are in its own slot sizes. */
const SNAP = Object.freeze({
  /** A pile catches a card whose centre comes this close to its own. */
  slotCatch: 0.75,
  /** A caught card leaves the pile beyond this. */
  slotRelease: 1.15,
  /** A finger reaches this much further. */
  coarseReach: 0.2,
  /** Another pile takes a caught card only when this much closer. */
  slotSwitch: 0.1,
  /** A card enters a zone once this share of it covers the zone... */
  zoneEnter: 0.35,
  /** ...and leaves it once less than this share does. */
  zoneLeave: 0.1,
  /** How much a card in a pile still follows the pointer. */
  slotGive: 0.15,
  /** How much a card held inside a zone's edge follows the pointer beyond it. */
  edgeGive: 0.25,
});

/** An eligible area: a pile's slot, a zone's visible box, or neither for SVG targets. */
export interface SnapArea {
  readonly box: Box | null;
  readonly slot: boolean;
  /** How many other areas contain it; the innermost covered zone wins. */
  readonly depth: number;
}

export interface Snap {
  /** The chosen area, or -1. */
  readonly index: number;
  /** Where the card's centre is drawn: in its pile, held inside a zone's edge, or free. */
  readonly center: Point;
  /** Drawn somewhere other than under the pointer. */
  readonly held: boolean;
}

const centerOf = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});
const toward = (from: Point, to: Point, share: number): Point => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share,
});
const contains = (box: Box, point: Point) =>
  point.x >= box.x &&
  point.x <= box.x + box.width &&
  point.y >= box.y &&
  point.y <= box.y + box.height;
/** The share of `card` over `box`. */
function cover(card: Box, box: Box) {
  const width =
    Math.min(card.x + card.width, box.x + box.width) - Math.max(card.x, box.x);
  const height =
    Math.min(card.y + card.height, box.y + box.height) -
    Math.max(card.y, box.y);
  return width > 0 && height > 0
    ? (width * height) / (card.width * card.height)
    : 0;
}

/**
 * Chooses where a dragged card lands and where it is drawn. A pile catches the
 * card by its centre and draws it in its slot; the area under the pointer
 * comes next; a zone takes a card that covers enough of it, or that the
 * pointer nearly reaches, and holds it inside its edge until it is pulled
 * clear. `retained` is the current area, which each rule favours so the
 * choice never flickers at a boundary.
 */
export function snapDrop({
  pointer,
  card,
  areas,
  hit,
  retained,
  coarse,
}: {
  readonly pointer: Point;
  /** The card as it would be drawn under the pointer. */
  readonly card: Box;
  /** Null where an area cannot take the card now. */
  readonly areas: readonly (SnapArea | null)[];
  /** The area the browser hit-tests under the pointer, or -1. */
  readonly hit: number;
  readonly retained: number;
  readonly coarse: boolean;
}): Snap {
  const free = centerOf(card);
  const inSlot = (index: number, box: Box): Snap => ({
    index,
    center: toward(centerOf(box), free, SNAP.slotGive),
    held: true,
  });
  let best = -1;
  let score = Infinity;
  areas.forEach((area, index) => {
    const box = area?.slot ? area.box : null;
    if (!box?.width || !box.height) return;
    const middle = centerOf(box);
    const distance = Math.hypot(
      (free.x - middle.x) / box.width,
      (free.y - middle.y) / box.height,
    );
    const kept = index === retained;
    const reach =
      (kept ? SNAP.slotRelease : SNAP.slotCatch) +
      (coarse ? SNAP.coarseReach : 0);
    const value = kept ? distance - SNAP.slotSwitch : distance;
    if (distance <= reach && value < score) {
      best = index;
      score = value;
    }
  });
  if (best >= 0) return inSlot(best, areas[best]!.box!);
  const under = hit >= 0 ? areas[hit] : null;
  if (under)
    return under.slot && under.box?.width
      ? inSlot(hit, under.box)
      : { index: hit, center: free, held: false };
  // A held card stays inside the zone's edge and gives a little toward the pointer.
  const hold = (index: number, box: Box): Snap => {
    if (contains(box, pointer)) return { index, center: free, held: false };
    const inside = {
      x: Math.max(box.x, Math.min(free.x, box.x + box.width)),
      y: Math.max(box.y, Math.min(free.y, box.y + box.height)),
    };
    return { index, center: toward(inside, free, SNAP.edgeGive), held: true };
  };
  const zone = (index: number) => {
    const area = areas[index];
    return area && !area.slot && area.box?.width ? area.box : null;
  };
  const kept = retained >= 0 ? zone(retained) : null;
  if (
    kept &&
    (cover(card, kept) >= SNAP.zoneLeave ||
      magneticDropPoint(pointer, kept, true, coarse))
  )
    return hold(retained, kept);
  let chosen = -1;
  let share = 0;
  areas.forEach((_, index) => {
    const box = zone(index);
    if (!box) return;
    const value = cover(card, box);
    if (
      value < SNAP.zoneEnter &&
      !magneticDropPoint(pointer, box, false, coarse)
    )
      return;
    const deeper = chosen < 0 || areas[index]!.depth > areas[chosen]!.depth;
    if (
      deeper ||
      (areas[index]!.depth === areas[chosen]!.depth && value > share)
    ) {
      chosen = index;
      share = value;
    }
  });
  return chosen >= 0
    ? hold(chosen, zone(chosen)!)
    : { index: -1, center: free, held: false };
}
