import { z } from "zod";
import type { Brand } from "./model/table";

/**
 * Opaque brand applied to a runtime player identifier.
 *
 * The reducer owns the branded `PlayerId` identity. Authors
 * obtain `PlayerId` values only through:
 *   - `q.player.order()` / `q.player.current()` (reducer queries),
 *   - engine-injected interaction and phase callback arguments,
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
 * use manifest/ingress parsing for that.
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return typeof value === "string" && value.length > 0;
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
