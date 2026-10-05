import type { CoreInstance, Tile } from "./model.js";
import type { SeatTileRef } from "../shared/domain/seat-reference.js";
declare const game: CoreInstance<unknown>;
declare const ref: SeatTileRef;
const zone = game.zones.get("bag", "table");
const tile: Tile<unknown> = zone.getTile(ref);
const current: SeatTileRef = tile.ref;
zone.findTile(current);
tile.getTargetProps();
if (tile.data.disclosure === "concealed") {
  tile.data.appearance.cells;
  // @ts-expect-error Concealed inventory does not expose its assigned tile type.
  tile.data.tileTypeId;
} else {
  tile.data.tileTypeId;
  tile.data.properties;
}
// @ts-expect-error Authoritative IDs cannot select projected inventory objects.
zone.getTile("seed-id");
// @ts-expect-error Inventory references have no spatial target identity.
tile.spaceIds;
void current;
