import type { CoreInstance, IdOf, SeatCardId } from "../model.js";
import type { SourceSnapshot } from "../sources/types.js";

/**
 * Where a card that arrived in its zone with the current frame was on the
 * previous one: another zone, or the private zones of the player who moved.
 * `hidden` says whether the seat saw only the card's back there.
 */
export type CardOrigin<G> =
  | { readonly zone: IdOf<G, "zoneId">; readonly hidden: boolean }
  | { readonly player: IdOf<G, "playerId">; readonly hidden: true };

type RuntimeOrigin =
  | { readonly zone: string; readonly hidden: boolean }
  | { readonly player: string; readonly hidden: true };
type Zones = SourceSnapshot["frame"]["zones"];

const isHidden = (cardId: string) => cardId.startsWith("hidden:");
const hiddenCount = (zones: Zones, zone: string) =>
  zones[zone]?.cardIds.filter(isHidden).length ?? 0;

function singleOrigin(
  departures: readonly { readonly zone: string; readonly hidden: boolean }[],
  count: number,
) {
  const origin = departures[0];
  return origin &&
    departures.length >= count &&
    departures.every(
      (card) => card.zone === origin.zone && card.hidden === origin.hidden,
    )
    ? Object.freeze(origin)
    : null;
}

/**
 * Visible ids are card identities, so a visible card is followed between
 * zones. Hidden ids are positions, so only their net counts are compared.
 * An inferred origin requires one compatible source with enough departures;
 * existing hidden cards make the arriving positions ambiguous. Unexplained
 * arrivals can come from the sole mover's private zones, which the seat's
 * frame does not list. Ambiguous origins are omitted.
 */
export function findCardOrigins(
  previous: Zones,
  next: Zones,
  mover: string | null,
): ReadonlyMap<string, RuntimeOrigin> {
  const shownBefore = new Map<string, string>();
  for (const [zone, { cardIds }] of Object.entries(previous))
    for (const cardId of cardIds)
      if (!isHidden(cardId)) shownBefore.set(cardId, zone);
  const shownNow = new Set(
    Object.values(next).flatMap(({ cardIds }) =>
      cardIds.filter((cardId) => !isHidden(cardId)),
    ),
  );
  let left = Object.entries(previous).flatMap(([zone, { cardIds }]) => [
    ...cardIds
      .filter((cardId) => !isHidden(cardId) && !shownNow.has(cardId))
      .map(() => ({ zone, hidden: false })),
    ...Array.from(
      {
        length: Math.max(
          0,
          hiddenCount(previous, zone) - hiddenCount(next, zone),
        ),
      },
      () => ({ zone, hidden: true }),
    ),
  ]);
  const origins = new Map<string, RuntimeOrigin>();
  const shownArrivals: string[] = [];
  const hiddenArrivals: (string | null)[] = [];
  for (const [zone, { cardIds }] of Object.entries(next)) {
    for (const cardId of cardIds) {
      if (isHidden(cardId)) continue;
      const from = shownBefore.get(cardId);
      if (from === undefined) shownArrivals.push(cardId);
      else if (from !== zone)
        origins.set(cardId, Object.freeze({ zone: from, hidden: false }));
    }
    const hidden = cardIds.filter(isHidden);
    const before = hiddenCount(previous, zone);
    // Count ambiguous arrivals too, so another destination cannot claim their source.
    hiddenArrivals.push(
      ...Array.from(
        { length: Math.max(0, hidden.length - before) },
        (_, index) => (before === 0 ? hidden[index] : null),
      ),
    );
  }
  // Concealing a visible card can replace a hidden departure without changing
  // the hidden count. Net counts cannot resolve those simultaneous movements.
  if (
    left.some(
      (card) =>
        !card.hidden &&
        hiddenCount(previous, card.zone) > 0 &&
        hiddenCount(next, card.zone) > 0,
    )
  )
    return origins;
  const hiddenLeft = left.filter((card) => card.hidden);
  if (shownArrivals.length) {
    const origin = singleOrigin(hiddenLeft, shownArrivals.length);
    if (origin) {
      for (const cardId of shownArrivals) origins.set(cardId, origin);
      left = [
        ...left.filter((card) => !card.hidden),
        ...hiddenLeft.slice(shownArrivals.length),
      ];
    } else if (hiddenLeft.length) {
      // Which departures the shown cards consumed is also ambiguous.
      return origins;
    } else if (mover !== null) {
      const origin = Object.freeze({ player: mover, hidden: true as const });
      for (const cardId of shownArrivals) origins.set(cardId, origin);
    }
  }
  const hiddenOrigin =
    singleOrigin(left, hiddenArrivals.length) ??
    (left.length === 0 && mover !== null
      ? Object.freeze({ player: mover, hidden: true as const })
      : null);
  if (hiddenOrigin) {
    for (const cardId of hiddenArrivals)
      if (cardId !== null) origins.set(cardId, hiddenOrigin);
  }
  return origins;
}

/** The sole active player, when it is another seat. */
function moverOf(snapshot: SourceSnapshot) {
  const active = snapshot.frame.flow.activePlayers;
  return active.length === 1 && active[0] !== snapshot.me ? active[0] : null;
}

/**
 * Adds `card.getOrigin()`: where a card that arrived in its zone with the
 * current frame came from, or null. Origins last until the next frame and
 * reset when the seat or source changes. Hidden origins are inferred from
 * net counts; ambiguous sources and arriving positions return null.
 */
export function originsFeature<G>(game: CoreInstance<G>) {
  type Origins = ReadonlyMap<SeatCardId<G>, CardOrigin<G>>;
  let frame = game.snapshot;
  let source = game.getOptions().source;
  let origins: Origins = new Map();
  function sync() {
    const next = game.snapshot;
    const nextSource = game.getOptions().source;
    if (
      next?.version === frame?.version &&
      next?.me === frame?.me &&
      nextSource === source
    )
      return;
    // Game-binding boundary: card, zone and player ids come from this instance's frames.
    origins =
      frame && next && next.me === frame.me && nextSource === source
        ? (findCardOrigins(
            frame.frame.zones,
            next.frame.zones,
            next.version === frame.version + 1 ? moverOf(frame) : null,
          ) as Origins)
        : new Map();
    frame = next;
    source = nextSource;
  }
  // Also read lazily, so a reader notified before this listener sees the new frame's origins.
  const unsubscribe = game.subscribe(sync);
  return {
    card: {
      getOrigin(this: { readonly id: SeatCardId<G> }): CardOrigin<G> | null {
        sync();
        return origins.get(this.id) ?? null;
      },
    },
    dispose: unsubscribe,
  };
}
