import { isPlayerIdValue } from "../shared/domain/player-identity.js";
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
 * valid live player key. Does not validate against a specific player roster;
 * use manifest/ingress parsing for that.
 */
export function isPlayerId(value: unknown): value is PlayerId {
  return isPlayerIdValue(value);
}
