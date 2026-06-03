import { z } from "zod";
import type { Brand } from "./model/table";

/**
 * Opaque brand applied to a runtime player identifier.
 *
 * Generators produce a workspace-specific `PlayerId` alias (e.g.
 * `Brand<string, "PlayerId">` in `shared/manifest-contract.ts`). Authors
 * obtain `PlayerId` values only through:
 *   - `q.player.order()` / `q.player.current()` (reducer queries),
 *   - engine-injected callback arguments (actions, phases, prompts),
 *   - `perPlayerKeys(...)` / entries iteration,
 *   - `asPlayerId(raw)` as an explicit escape hatch (e.g. ingress parsing).
 *
 * The brand is a phantom type: at runtime a `PlayerId` is just a string.
 * Do not JSON-serialize the brand marker; it exists purely at the type
 * level to block accidental literal comparisons such as
 * `playerId === "player-1"`.
 */
export type PlayerId = Brand<string, "PlayerId">;

/**
 * Explicit conversion from a raw string to a branded `PlayerId`.
 *
 * Use at trust boundaries only (wire ingress, tests, fixtures). Inside
 * reducer logic, obtain `PlayerId` values from the engine instead of
 * constructing them yourself.
 */
export function asPlayerId(raw: string): PlayerId {
  return raw as PlayerId;
}

/**
 * Type guard that narrows `unknown` to `PlayerId` when the value is a
 * non-empty string. Does not validate against a specific player roster;
 * use `perPlayerSchema`/ingress parsing for that.
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return typeof value === "string" && value.length > 0;
}

/**
 * A runtime-accurate per-player map.
 *
 * `PerPlayer<Value>` is an opaque, ordered container whose entries are
 * exactly the players that exist at runtime (the seats passed to
 * `initialize`).
 *
 * The `__perPlayer` discriminator keeps the structural type nominal-ish
 * without depending on a symbol (symbols do not round-trip through JSON,
 * which this shape must).
 *
 * Construct with `perPlayer(ids, init)` and read with the accessors in
 * this module; do not reach into `entries` directly unless you need
 * ordered iteration.
 */
export interface PerPlayer<Value, Id extends PlayerId = PlayerId> {
  readonly __perPlayer: true;
  readonly entries: ReadonlyArray<readonly [Id, Value]>;
}

/**
 * Construct a `PerPlayer<Value>` with one entry per `id` in `ids`.
 *
 * `ids` is treated as the authoritative runtime seat list: the returned
 * `PerPlayer` contains exactly `ids.length` entries, in the same order.
 * Duplicate ids throw.
 */
export function perPlayer<Value, Id extends PlayerId = PlayerId>(
  ids: readonly Id[],
  init: (id: Id, index: number) => Value,
): PerPlayer<Value, Id> {
  const seen = new Set<string>();
  const entries: Array<readonly [Id, Value]> = [];
  for (const [index, id] of ids.entries()) {
    if (seen.has(id)) {
      throw new Error(`perPlayer: duplicate player id '${id}'`);
    }
    seen.add(id);
    entries.push([id, init(id, index)] as const);
  }
  return { __perPlayer: true, entries };
}

/** Ordered list of seat ids present in the `PerPlayer`. */
export function perPlayerKeys<Id extends PlayerId>(
  value: PerPlayer<unknown, Id>,
): Id[] {
  return value.entries.map((entry) => entry[0]);
}

/** Ordered list of values present in the `PerPlayer`. */
export function perPlayerValues<Value>(
  value: PerPlayer<Value, PlayerId>,
): Value[] {
  return value.entries.map((entry) => entry[1]);
}

/**
 * Ordered `[id, value]` pairs. Returns the backing array as-is; callers
 * must not mutate it.
 */
export function perPlayerEntries<Value, Id extends PlayerId>(
  value: PerPlayer<Value, Id>,
): ReadonlyArray<readonly [Id, Value]> {
  return value.entries;
}

/** Number of seats in the `PerPlayer`. */
export function perPlayerSize(value: PerPlayer<unknown, PlayerId>): number {
  return value.entries.length;
}

/** Whether `id` has a value. */
export function perPlayerHas<Id extends PlayerId>(
  value: PerPlayer<unknown, Id>,
  id: Id,
): boolean {
  for (const [candidate] of value.entries) {
    if (candidate === id) {
      return true;
    }
  }
  return false;
}

/** Lookup with no fallback; returns `undefined` for missing seats. */
export function perPlayerGet<Value, Id extends PlayerId>(
  value: PerPlayer<Value, Id>,
  id: Id,
): Value | undefined {
  for (const [candidate, v] of value.entries) {
    if (candidate === id) {
      return v;
    }
  }
  return undefined;
}

/**
 * Lookup that throws if `id` is not present.
 *
 * Use when the caller has already established (via `q.player.order()`,
 * an action context, etc.) that `id` is an active runtime seat.
 */
export function perPlayerRequire<Value, Id extends PlayerId>(
  value: PerPlayer<Value, Id>,
  id: Id,
): Value {
  const found = perPlayerGet(value, id);
  if (found === undefined && !perPlayerHas(value, id)) {
    throw new Error(`perPlayerRequire: missing entry for player id '${id}'`);
  }
  return found as Value;
}

/**
 * Return a new `PerPlayer` with `id`'s value replaced (or added if the
 * id is not present). Preserves entry order; new entries are appended.
 */
export function perPlayerSet<Value, Id extends PlayerId>(
  value: PerPlayer<Value, Id>,
  id: Id,
  next: Value,
): PerPlayer<Value, Id> {
  const entries = value.entries.slice();
  const index = entries.findIndex((entry) => entry[0] === id);
  if (index >= 0) {
    entries[index] = [id, next] as const;
  } else {
    entries.push([id, next] as const);
  }
  return { __perPlayer: true, entries };
}

/**
 * Return a new `PerPlayer` where each value is replaced by `f(value, id)`.
 * Seat order is preserved.
 */
export function perPlayerMap<Value, Next, Id extends PlayerId>(
  value: PerPlayer<Value, Id>,
  f: (v: Value, id: Id, index: number) => Next,
): PerPlayer<Next, Id> {
  return {
    __perPlayer: true,
    entries: value.entries.map(
      ([id, v], index) => [id, f(v, id, index)] as const,
    ),
  };
}

/**
 * Structural check for a `PerPlayer` without a Zod schema. Useful in
 * debug paths and as a fast pre-filter before schema validation.
 */
export function isPerPlayer(value: unknown): value is PerPlayer<unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { __perPlayer?: unknown; entries?: unknown };
  if (candidate.__perPlayer !== true) {
    return false;
  }
  if (!Array.isArray(candidate.entries)) {
    return false;
  }
  return candidate.entries.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === "string",
  );
}

/**
 * Options accepted by `perPlayerSchema`.
 *
 * Setting `players` locks the schema to an exact seat list: parse fails
 * if the input is missing any seat or has an unknown id. Leaving
 * `players` unset yields a schema that accepts any non-empty string as
 * a key, which is the right default for generic SDK types.
 *
 * `playerIdSchema` lets callers feed a manifest-scoped Zod id schema in
 * so parse errors carry the same message as other branded ids.
 */
export type PerPlayerSchemaOptions<Id extends PlayerId> = {
  readonly playerIdSchema?: z.ZodType<Id>;
  readonly players?: readonly Id[];
};

/**
 * Build a Zod schema that validates a wire-shaped `PerPlayer<Value>`.
 *
 * When `options.players` is supplied the schema enforces that entries
 * match that exact set (same cardinality, same ids, any order). This is
 * the mechanism that catches the class of bug where a 3-player session
 * produced a view shape the old `Record<PlayerId, T>` type claimed had
 * a `player-4` key.
 */
export function perPlayerSchema<Value, Id extends PlayerId = PlayerId>(
  valueSchema: z.ZodType<Value>,
  options: PerPlayerSchemaOptions<Id> = {},
): z.ZodType<PerPlayer<Value, Id>> {
  const keySchema =
    options.playerIdSchema ?? (z.string().min(1) as unknown as z.ZodType<Id>);

  const base = z
    .object({
      __perPlayer: z.literal(true),
      entries: z.array(z.tuple([keySchema, valueSchema])),
    })
    .transform(
      (value): PerPlayer<Value, Id> => ({
        __perPlayer: true as const,
        entries: value.entries as ReadonlyArray<readonly [Id, Value]>,
      }),
    );

  if (!options.players) {
    return base as unknown as z.ZodType<PerPlayer<Value, Id>>;
  }

  const expected = options.players;
  return base.superRefine((value, ctx) => {
    const seen = new Set<string>();
    for (const [id] of value.entries) {
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate player id '${id}'`,
        });
      }
      seen.add(id);
    }
    for (const expectedId of expected) {
      if (!seen.has(expectedId)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing entry for player id '${expectedId}'`,
        });
      }
    }
    for (const id of seen) {
      if (!expected.some((expectedId) => expectedId === id)) {
        ctx.addIssue({
          code: "custom",
          message: `Unexpected player id '${id}' (allowed: ${expected.join(", ")})`,
        });
      }
    }
  }) as unknown as z.ZodType<PerPlayer<Value, Id>>;
}

// ---------------------------------------------------------------------------
// BoardRef: replacement for flat `"board:player-N"` literal unions.
// ---------------------------------------------------------------------------

/**
 * Reference to a board by its authored `baseId`, plus an optional seat
 * for per-player boards.
 *
 * Replaces the old generated `"ring:player-1" | "ring:player-2" | ...`
 * flat unions whose keys pretended to be static but were actually
 * derived from `maxPlayers` and therefore misaligned with the runtime
 * seat list.
 *
 * The discriminant is the *presence* of `seat`, not a `scope` field, so
 * authors can destructure and pass the ref directly without needing a
 * discriminator check for shared boards.
 */
export type BoardRef<
  BaseId extends string = string,
  Id extends PlayerId = PlayerId,
> = SharedBoardRef<BaseId> | PerPlayerBoardRef<BaseId, Id>;

export interface SharedBoardRef<BaseId extends string = string> {
  readonly baseId: BaseId;
  readonly seat?: undefined;
}

export interface PerPlayerBoardRef<
  BaseId extends string = string,
  Id extends PlayerId = PlayerId,
> {
  readonly baseId: BaseId;
  readonly seat: Id;
}

/** Construct a shared board ref. */
export function sharedBoardRef<BaseId extends string>(
  baseId: BaseId,
): SharedBoardRef<BaseId> {
  return { baseId };
}

/** Construct a per-player board ref. */
export function perPlayerBoardRef<BaseId extends string, Id extends PlayerId>(
  baseId: BaseId,
  seat: Id,
): PerPlayerBoardRef<BaseId, Id> {
  return { baseId, seat };
}

/**
 * Construct a `BoardRef` without knowing the scope ahead of time. Pass
 * `seat` for per-player boards; omit for shared boards.
 */
export function boardRef<BaseId extends string, Id extends PlayerId>(
  baseId: BaseId,
  seat?: Id,
): BoardRef<BaseId, Id> {
  if (seat === undefined) {
    return { baseId };
  }
  return { baseId, seat };
}

/** Stable string key for Maps/Records keyed by a `BoardRef`. */
export function boardRefKey(ref: BoardRef): string {
  return ref.seat === undefined ? ref.baseId : `${ref.baseId}:${ref.seat}`;
}

/**
 * Inverse of `boardRefKey`. Parses `"base"` as a shared ref and
 * `"base:player-N"` as a per-player ref. Returns `null` for malformed
 * input.
 */
export function parseBoardRefKey(key: string): BoardRef | null {
  if (!key.length) {
    return null;
  }
  const colon = key.indexOf(":");
  if (colon < 0) {
    return { baseId: key };
  }
  const baseId = key.slice(0, colon);
  const seat = key.slice(colon + 1);
  if (!baseId.length || !seat.length) {
    return null;
  }
  return { baseId, seat: seat as PlayerId };
}

/**
 * Zod schema for a `BoardRef` with free-form base and seat ids.
 *
 * Feed a manifest-scoped `baseIdSchema` and `playerIdSchema` to bind
 * the ref to a specific workspace.
 */
export function boardRefSchema<
  BaseId extends string = string,
  Id extends PlayerId = PlayerId,
>(
  options: {
    readonly baseIdSchema?: z.ZodType<BaseId>;
    readonly playerIdSchema?: z.ZodType<Id>;
  } = {},
): z.ZodType<BoardRef<BaseId, Id>> {
  const baseSchema =
    options.baseIdSchema ?? (z.string().min(1) as unknown as z.ZodType<BaseId>);
  const playerSchema =
    options.playerIdSchema ?? (z.string().min(1) as unknown as z.ZodType<Id>);
  const shared = z.strictObject({ baseId: baseSchema });
  const perPlayer = z.strictObject({ baseId: baseSchema, seat: playerSchema });
  return z.union([perPlayer, shared]) as unknown as z.ZodType<
    BoardRef<BaseId, Id>
  >;
}

/** True when `ref` targets a shared board (no seat). */
export function isSharedBoardRef<BaseId extends string>(
  ref: BoardRef<BaseId, PlayerId>,
): ref is SharedBoardRef<BaseId> {
  return ref.seat === undefined;
}

/** True when `ref` targets a per-player board (has a seat). */
export function isPerPlayerBoardRef<BaseId extends string, Id extends PlayerId>(
  ref: BoardRef<BaseId, Id>,
): ref is PerPlayerBoardRef<BaseId, Id> {
  return ref.seat !== undefined;
}
