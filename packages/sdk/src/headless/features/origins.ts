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

/**
 * Visible ids are card identities, so a visible card is followed between
 * zones. Hidden ids are positions, so hidden cards are counted per zone. A
 * card that arrived otherwise takes a card that left, from its own zone first
 * (a flip), then from any zone (a draw, deal or reshuffle); a card shown now
 * must have been hidden. The rest came from the mover's private zones, which
 * the seat's frame does not list.
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
  const left = Object.entries(previous).flatMap(([zone, { cardIds }]) => [
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
  const arrived = Object.entries(next).flatMap(([zone, { cardIds }]) => {
    const hidden = cardIds.filter(isHidden);
    return [
      ...cardIds.filter(
        (cardId) => !isHidden(cardId) && shownBefore.get(cardId) !== zone,
      ),
      ...hidden.slice(hiddenCount(previous, zone)),
    ].map((cardId) => ({ cardId, zone }));
  });
  // Shown cards can only have been hidden, so they choose first.
  arrived.sort(
    (a, b) => Number(isHidden(a.cardId)) - Number(isHidden(b.cardId)),
  );
  for (const { cardId, zone } of arrived) {
    const from = shownBefore.get(cardId);
    if (from !== undefined) {
      origins.set(cardId, Object.freeze({ zone: from, hidden: false }));
      continue;
    }
    const fits = (card: { hidden: boolean }) => card.hidden || isHidden(cardId);
    const own = left.findIndex((card) => card.zone === zone && fits(card));
    const index = own >= 0 ? own : left.findIndex(fits);
    if (index >= 0)
      origins.set(cardId, Object.freeze(left.splice(index, 1)[0]));
    else if (mover !== null)
      origins.set(cardId, Object.freeze({ player: mover, hidden: true }));
  }
  return origins;
}

/** The one player other than the seat who could act on the previous frame. */
function moverOf(snapshot: SourceSnapshot) {
  const others = snapshot.frame.flow.activePlayers.filter(
    (playerId) => playerId !== snapshot.me,
  );
  return others.length === 1 ? others[0] : null;
}

/**
 * Adds `card.getOrigin()`: where a card that arrived in its zone with the
 * current frame came from, or null. Origins last until the next frame and
 * reset when the seat or source changes. Several cards moving at once can be
 * misattributed between the zones they left.
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
            moverOf(frame),
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
