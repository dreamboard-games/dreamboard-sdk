import type {
  Card,
  CoreInstance,
  FeatureContext,
  IdOf,
  SeatCardId,
  Zone,
} from "../model.js";

/** A comparator sees only cards projected for the current seat. */
export interface HandSort<G> {
  readonly compare: (
    left: Card<G, Record<never, never>>,
    right: Card<G, Record<never, never>>,
  ) => number;
}
type Sorts<G> = Partial<
  Readonly<Record<string, Readonly<Record<string, HandSort<G>>>>>
>;
type GameSorts<G> = Partial<
  Readonly<Record<IdOf<G, "zoneId">, Readonly<Record<string, HandSort<G>>>>>
>;
type Mode<S, K> = K extends keyof S
  ? Extract<keyof NonNullable<S[K]>, string>
  : never;
export interface HandOptions<G, S extends Sorts<G> = GameSorts<G>> {
  readonly zones?: {
    // Keep the broad key constraint available for comparator inference, then
    // validate concrete zone keys when TypeScript infers the authored config.
    readonly [K in keyof S]: K extends
      IdOf<G, "zoneId"> | (string extends K ? string : never)
      ? {
          readonly sorts: S[K] & Readonly<Record<string, HandSort<G>>>;
          readonly defaultSort?: NoInfer<Mode<S, K>>;
        }
      : never;
  };
}
export interface HandController<G, S extends Sorts<G> = GameSorts<G>> {
  getSortModes<K extends IdOf<G, "zoneId">>(
    zone: Zone<G, Record<never, never>, K>,
  ): readonly Mode<S, K>[];
  getSortMode<K extends IdOf<G, "zoneId">>(
    zone: Zone<G, Record<never, never>, K>,
  ): Mode<S, K> | null;
  setSortMode<K extends IdOf<G, "zoneId">>(
    zone: Zone<G, Record<never, never>, K>,
    mode: Mode<S, NoInfer<K>>,
  ): void;
  getSortedCardIds(
    zone: Zone<G, Record<never, never>>,
  ): readonly SeatCardId<G>[];
}

// Generic G defers the card visibility union, so ids widen to string here.
const seatCardId = <G>(card: { readonly id: string }) =>
  card.id as SeatCardId<G>;

/** Local sort choices belong to a zone attachment and reset with the source or seat. */
export function handFeature<G, const S extends Sorts<G> = Record<never, never>>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
  options: HandOptions<G, S> = {},
) {
  // Copy the author-owned configuration so captured branches remain immutable.
  const zones = new Map<
    string,
    {
      readonly modes: readonly string[];
      readonly defaultSort: string | null;
      readonly sorts: ReadonlyMap<string, HandSort<G>["compare"]>;
    }
  >();
  for (const [id, value] of Object.entries<{
    readonly sorts: Record<string, HandSort<G>>;
    readonly defaultSort?: string;
  }>(options.zones ?? {})) {
    const sorts = new Map(
      Object.entries(value.sorts).map(([mode, sort]) => [mode, sort.compare]),
    );
    const defaultSort = value.defaultSort ?? null;
    if (defaultSort !== null && !sorts.has(defaultSort)) {
      throw new Error(
        `Unknown default hand sort "${defaultSort}" for zone "${id}".`,
      );
    }
    zones.set(id, {
      modes: Object.freeze(Object.keys(value.sorts)),
      defaultSort,
      sorts,
    });
  }
  const keyOf = (zone: Zone<G, Record<never, never>>) =>
    JSON.stringify([zone.id, zone.hostId]);
  let source = game.getOptions().source;
  let seat = game.snapshot?.me;
  let selected: ReadonlyMap<string, string> = new Map();
  let lifetime = {};
  let disposed = false;
  let branch = snapshot();
  function syncLifetime() {
    const nextSource = game.getOptions().source;
    const nextSeat = game.snapshot?.me;
    if (nextSource !== source || nextSeat !== seat) {
      source = nextSource;
      seat = nextSeat;
      selected = new Map();
      lifetime = {};
      branch = snapshot();
    }
  }
  function snapshot(): HandController<G, S> {
    const captured = selected;
    const capturedLifetime = lifetime;
    const getMode = (zone: Zone<G, Record<never, never>>) =>
      captured.get(keyOf(zone)) ?? zones.get(zone.id)?.defaultSort ?? null;
    return Object.freeze({
      getSortModes<K extends IdOf<G, "zoneId">>(
        zone: Zone<G, Record<never, never>, K>,
      ) {
        // Configuration boundary: mode identities come from this zone's declared sorts.
        return (zones.get(zone.id)?.modes ??
          Object.freeze([])) as readonly Mode<S, K>[];
      },
      getSortMode<K extends IdOf<G, "zoneId">>(
        zone: Zone<G, Record<never, never>, K>,
      ) {
        // Selected/default modes originate in this zone's typed configuration.
        return getMode(zone) as Mode<S, K> | null;
      },
      setSortMode<K extends IdOf<G, "zoneId">>(
        zone: Zone<G, Record<never, never>, K>,
        mode: Mode<S, NoInfer<K>>,
      ) {
        syncLifetime();
        if (disposed || lifetime !== capturedLifetime) return;
        // Public HandController annotations can widen the configured mode IDs.
        if (!zones.get(zone.id)?.sorts.has(mode)) return;
        if (
          (selected.get(keyOf(zone)) ??
            zones.get(zone.id)?.defaultSort ??
            null) === mode
        )
          return;
        selected = new Map(selected).set(keyOf(zone), mode);
        branch = snapshot();
        context.invalidate();
      },
      getSortedCardIds(zone: Zone<G, Record<never, never>>) {
        const mode = getMode(zone);
        const compare =
          mode === null ? undefined : zones.get(zone.id)?.sorts.get(mode);
        return Object.freeze(
          zone.getCards({ sort: compare }).map(seatCardId<G>),
        );
      },
    });
  }
  return {
    root: {
      get hand() {
        syncLifetime();
        return branch;
      },
    },
    zone: {
      getSelectedCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly SeatCardId<G>[] {
        return this.getCards()
          .filter((card) => card.getIsSelected())
          .map(seatCardId<G>);
      },
      getSelectableCardIds(
        this: Zone<G, Record<never, never>>,
      ): readonly SeatCardId<G>[] {
        return this.getCards()
          .filter((card) => card.getCanSelect())
          .map(seatCardId<G>);
      },
    },
    dispose() {
      disposed = true;
    },
  };
}
