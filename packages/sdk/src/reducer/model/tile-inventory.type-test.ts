import { tileSpaceId } from "../../shared/domain/tile-space.js";
import * as z from "zod";
import { compileManifest } from "../manifest/compiler";
import { createTableQueries } from "../table-queries";
import { createTestTransaction } from "../transaction-test-fixtures";
import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../../shared/domain/per-player-instance";
import type { TileIdOfTable, TileTypeIdOfTable } from "./extract";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
const manifest = compileManifest({
  players: { minPlayers: 2, maxPlayers: 2 },
  cardSets: [],
  zones: [
    { id: "supply", name: "Supply", scope: "perPlayer", visibility: "public" },
    { id: "hand", name: "Hand", scope: "perPlayer", visibility: "ownerOnly" },
    { id: "bag", name: "Bag", scope: "shared", visibility: "hidden" },
  ],
  boards: [
    {
      id: "map",
      name: "Map",
      layout: "hex",
      scope: "shared",
    },
  ],
  tileTypes: [
    {
      id: "island",
      name: "Island",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
      propertiesSchema: z.object({ charges: z.number() }),
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "island",
      count: 2,
      scope: "perPlayer",
      properties: { charges: 2 },
      home: { type: "zone", zoneId: "supply" },
    },
  ],
});
const table = manifest.createInitialTable({ playerIds: ["alice", "bob"] });
const tileId = perPlayerInstanceId("tile", "terrain-1", "alice");
const q = createTableQueries(table, manifest);
const charges: number = q.tile(tileId).properties.charges;
const componentCharges: number = q.component.data(tileId).properties.charges;
const tileLocation: "Detached" | "InZone" | "OnBoard" =
  q.component.location(tileId).type;
type ExactId = Assert<
  Equal<
    TileIdOfTable<typeof table>,
    PerPlayerInstanceId<"tile", "terrain-1" | "terrain-2">
  >
>;
type ExactType = Assert<Equal<TileTypeIdOfTable<typeof table>, "island">>;
// @ts-expect-error Tile properties preserve their schema output.
const wrong: string = q.tile(tileId).properties.charges;
// @ts-expect-error Canonical identity syntax alone does not admit an undeclared tile base.
q.tile(perPlayerInstanceId("tile", "missing", "alice"));
const tx = createTestTransaction({ table }, manifest);
tx.setComponentOwner({ componentId: tileId, ownerId: null });
tx.moveComponentToDetached({ componentId: tileId });
tx.moveComponentToZone({
  componentId: tileId,
  to: { zoneId: "supply", hostId: table.playerOrder[0] },
});
tx.moveComponentToZone({
  // @ts-expect-error Known owner-only destinations do not admit tile components.
  componentId: tileId,
  to: { zoneId: "hand", hostId: table.playerOrder[0] },
});
tx.moveComponentToZone({
  // @ts-expect-error Known hidden destinations do not admit tile components.
  componentId: tileId,
  to: { zoneId: "bag" },
});
tx.moveComponentToSpace({
  // @ts-expect-error Inventory tiles cannot use OnSpace component locations.
  componentId: tileId,
  boardId: "map",
  spaceId: tileSpaceId(tileId, "center"),
});
tx.moveComponentToEdge({
  // @ts-expect-error Inventory tiles cannot use OnEdge component locations.
  componentId: tileId,
  boardId: "map",
  edgeId: q.board("map").state.edges[0].id,
});
tx.moveComponentToVertex({
  // @ts-expect-error Inventory tiles cannot use OnVertex component locations.
  componentId: tileId,
  boardId: "map",
  vertexId: q.board("map").state.vertices[0].id,
});
void [charges, componentCharges, tileLocation, wrong];
const proofs: [ExactId, ExactType] = [true, true];
void proofs;
