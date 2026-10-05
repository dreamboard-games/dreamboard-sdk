import { createTableQueries } from "@dreamboard-games/sdk/reducer";
import { manifestContract } from "../app/manifest";
import { BOARD_ID } from "../app/model";

/** Fixed authored map geometry for scenario commands; gameplay queries its current table. */
export const FRONTIER_GEOMETRY = createTableQueries(
  manifestContract.createInitialTable({ playerIds: [] }),
  manifestContract,
).board(BOARD_ID);
export const FRONTIER = FRONTIER_GEOMETRY.state;
export const INTERSECTION_IDS = FRONTIER_GEOMETRY.vertices.map(
  (vertex) => vertex.id,
);
export const EDGE_IDS = FRONTIER_GEOMETRY.edges.map((edge) => edge.id);

if (
  Object.keys(FRONTIER.spaces).length !== 7 ||
  INTERSECTION_IDS.length !== 24 ||
  EDGE_IDS.length !== 30
) {
  throw new Error(
    "Stormtrail topology must contain 7 hexes, 24 intersections, and 30 edges.",
  );
}
