import * as z from "zod";
import { GENERATED_ID_PREFIX } from "./per-player-instance.js";

const tileSpaceTuple = z.tuple([
  z.literal("tile-space"),
  z.string().min(1),
  z.string().min(1),
]);
declare const tileSpaceIdentity: unique symbol;
export type TileSpaceId<
  TileId extends string = string,
  CellId extends string = string,
> = string & {
  readonly [tileSpaceIdentity]: {
    readonly tileId: TileId;
    readonly cellId: CellId;
  };
};

/** Encode stable cell identity; membership and placement are admitted against current state. */
export function tileSpaceId<TileId extends string, CellId extends string>(
  tileId: TileId,
  cellId: CellId,
): TileSpaceId<TileId, CellId> {
  tileSpaceTuple.parse(["tile-space", tileId, cellId]);

  return `${GENERATED_ID_PREFIX}${JSON.stringify(["tile-space", tileId, cellId])}` as TileSpaceId<
    TileId,
    CellId
  >;
}

/** Decode canonical syntax only; membership and placement require current state admission. */
export function parseTileSpaceId(
  value: unknown,
): { readonly tileId: string; readonly cellId: string } | null {
  if (typeof value !== "string" || !value.startsWith(GENERATED_ID_PREFIX))
    return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(value.slice(GENERATED_ID_PREFIX.length));
  } catch {
    return null;
  }
  const parsed = tileSpaceTuple.safeParse(candidate);
  if (!parsed.success) return null;
  const [, tileId, cellId] = parsed.data;
  if (tileSpaceId(tileId, cellId) !== value) return null;
  return { tileId, cellId };
}
