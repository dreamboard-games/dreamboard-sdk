import type { RuntimeTableRecord } from "./model/table";
import type { TableQueriesOfState } from "./model/queries";
import type { BaseGameStateOfContract } from "./model/definition";
import { createStateQueries } from "./table-queries";

/**
 * A freestanding, memoized projection of immutable game state.
 *
 * Use `defineDerived` for values that are pure functions of component
 * locations, zone contents, resources, or other state fields - and are
 * consumed from multiple reducer or view call sites, or whose compute cost
 * is non-trivial (graph walks, aggregate reductions).
 *
 * Do NOT cache derived values in `publicState`. State fields should be
 * inputs to derivations, not mirrors of them.
 */
export type DerivedDefinition<Contract, Value> = {
  /** Optional label for debugging. Does not affect caching. */
  readonly name?: string;
  readonly compute: (ctx: {
    readonly state: BaseGameStateOfContract<Contract>;
    readonly q: TableQueriesOfState<BaseGameStateOfContract<Contract>>;
    readonly derived: DerivedResolver;
  }) => Value;
};

/**
 * Resolves a `DerivedDefinition` to its value. Callers do not need to know
 * about memoization - the resolver handles caching internally.
 */
export type DerivedResolver = <Value>(
  def: DerivedDefinition<never, Value>,
) => Value;

type AnyDerivedDefinition = DerivedDefinition<unknown, unknown>;

/**
 * Author-facing factory for creating a derived value tied to a game
 * contract. Usage:
 *
 * ```ts
 * export const longestRoad = defineDerived<GameContract>()({
 *   name: "longestRoad",
 *   compute: ({ q, derived }) => computeLongestRoad(q),
 * });
 * ```
 */
export function defineDerived<Contract>() {
  return <Value>(def: {
    name?: string;
    compute: (ctx: {
      state: BaseGameStateOfContract<Contract>;
      q: TableQueriesOfState<BaseGameStateOfContract<Contract>>;
      derived: DerivedResolver;
    }) => Value;
  }): DerivedDefinition<Contract, Value> => def;
}

/**
 * Creates a resolver scoped to a single state snapshot. Each engine tick
 * and each view projection call creates its own resolver; cache lifetime
 * ends with the call. Cache key is the `DerivedDefinition` identity (the
 * object reference).
 *
 * Re-entry on an in-flight definition throws a readable error.
 */
export function createDerivedResolver<
  State extends { table: RuntimeTableRecord },
>(
  state: State,
  options: { q?: TableQueriesOfState<State> } = {},
): DerivedResolver {
  const cache = new Map<AnyDerivedDefinition, unknown>();
  const inflight = new Set<AnyDerivedDefinition>();
  const q = options.q ?? createStateQueries(state);

  const resolver: DerivedResolver = <Value>(
    def: DerivedDefinition<never, Value>,
  ): Value => {
    const typedDef = def as unknown as AnyDerivedDefinition;
    if (cache.has(typedDef)) {
      return cache.get(typedDef) as Value;
    }
    if (inflight.has(typedDef)) {
      throw new Error(
        `Cyclic derived: '${def.name ?? "<anonymous>"}' depends on itself.`,
      );
    }
    inflight.add(typedDef);
    try {
      const value = (
        def.compute as unknown as (ctx: {
          state: unknown;
          q: unknown;
          derived: DerivedResolver;
        }) => Value
      )({ state, q, derived: resolver });
      cache.set(typedDef, value);
      return value;
    } finally {
      inflight.delete(typedDef);
    }
  };

  return resolver;
}
