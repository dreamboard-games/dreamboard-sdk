import type { RuntimeTableRecord, ZoneDefinitions } from "../model";
import { deriveBoardTopology } from "../../shared/board-topology";
import {
  TilePlacementSchema,
  type TilePlacement,
} from "../../shared/domain/tile-placement";
import { parseTileSpaceId } from "../../shared/domain/tile-space";
import { resolveZone } from "./zones";
import { encodeCanonicalPluginRuntimeJson } from "../../shared/protocol/json";

export type TilePlacementAt =
  | Omit<
      Extract<TilePlacement, { layout: "hex" }>,
      "type" | "boardId" | "layout"
    >
  | Omit<
      Extract<TilePlacement, { layout: "square" }>,
      "type" | "boardId" | "layout"
    >;

type TileMutation = {
  table: RuntimeTableRecord;
  definitions: ZoneDefinitions;
  boardId: string;
  tileId: string;
};

function assertTile(table: RuntimeTableRecord, tileId: string): void {
  if (!Object.hasOwn(table.tiles, tileId))
    throw new Error(`Unknown tile '${tileId}'.`);
}

/** Stable cell contents may follow a same-board move; world occupants cannot. */
function assertDependencies(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  tileId: string,
  sameBoardMove: boolean,
): void {
  const location = Object.hasOwn(table.componentLocations, tileId)
    ? table.componentLocations[tileId]
    : undefined;
  if (location?.type !== "OnBoard") return;
  const topology = deriveBoardTopology(table, definitions, location.boardId);
  if (topology.layout === "generic")
    throw new Error("Tiles require a tiled board.");
  const spaces = new Set<string>(
    Object.keys(topology.spaces).filter(
      (id) => parseTileSpaceId(id)?.tileId === tileId,
    ),
  );
  const edges = new Set<string>(
    topology.edges
      .filter((edge) => edge.spaceIds.some((id) => spaces.has(id)))
      .map((edge) => edge.id),
  );
  const vertices = new Set<string>(
    topology.vertices
      .filter((vertex) => vertex.spaceIds.some((id) => spaces.has(id)))
      .map((vertex) => vertex.id),
  );
  for (const [id, occupant] of Object.entries(table.componentLocations)) {
    if (!("boardId" in occupant) || occupant.boardId !== location.boardId)
      continue;
    if (
      !sameBoardMove &&
      occupant.type === "OnSpace" &&
      spaces.has(occupant.spaceId)
    )
      throw new Error(`Tile '${tileId}' has cell occupant '${id}'.`);
    if (
      (occupant.type === "OnEdge" && edges.has(occupant.edgeId)) ||
      (occupant.type === "OnVertex" && vertices.has(occupant.vertexId))
    )
      throw new Error(`Tile '${tileId}' has world-element occupant '${id}'.`);
  }
  if (sameBoardMove) return;
  for (const [zoneId, hosts] of Object.entries(table.zones)) {
    const definition = definitions.zoneDefinitions[zoneId];
    if (
      !definition ||
      !("attachedTo" in definition) ||
      !("tileType" in definition.attachedTo)
    )
      continue;
    for (const [hostId, ids] of Object.entries(hosts)) {
      if (parseTileSpaceId(hostId)?.tileId === tileId && ids.length)
        throw new Error(
          `Tile '${tileId}' has nonempty attached zone '${zoneId}'.`,
        );
    }
  }
  if (
    topology.relations.some(
      (relation) =>
        spaces.has(relation.fromSpaceId) || spaces.has(relation.toSpaceId),
    )
  )
    throw new Error(`Tile '${tileId}' has incident relations.`);
}

function candidateWithLocation(
  table: RuntimeTableRecord,
  tileId: string,
  location: TilePlacement | { type: "Detached" },
): RuntimeTableRecord {
  return {
    ...table,
    componentLocations: { ...table.componentLocations, [tileId]: location },
  };
}

/** Used by every outgoing component move, so no API bypasses removal dependencies. */
export function assertTileCanLeaveBoard(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  tileId: string,
): void {
  const source = Object.hasOwn(table.componentLocations, tileId)
    ? table.componentLocations[tileId]
    : undefined;
  if (source?.type !== "OnBoard") return;
  assertTile(table, tileId);
  assertDependencies(table, definitions, tileId, false);
  deriveBoardTopology(
    candidateWithLocation(table, tileId, { type: "Detached" }),
    definitions,
    source.boardId,
  );
}

export function placeTileInPlace(
  options: TileMutation & { at: TilePlacementAt },
): void {
  const { table, definitions, boardId, tileId, at } = options;
  assertTile(table, tileId);
  const board = Object.hasOwn(table.boards, boardId)
    ? table.boards[boardId]
    : undefined;
  const definition =
    board && Object.hasOwn(definitions.boardDefinitions, board.baseId)
      ? definitions.boardDefinitions[board.baseId]
      : undefined;
  if (!definition || definition.layout === "generic")
    throw new Error(
      `Tile placement requires a current tiled board '${boardId}'.`,
    );
  const placement = TilePlacementSchema.parse({
    ...at,
    type: "OnBoard",
    boardId,
    layout: definition.layout,
  });
  const source = Object.hasOwn(table.componentLocations, tileId)
    ? table.componentLocations[tileId]
    : undefined;
  if (!source) throw new Error(`Missing location for tile '${tileId}'.`);
  if (
    source.type !== "Detached" &&
    source.type !== "InZone" &&
    source.type !== "OnBoard"
  )
    throw new Error(`Invalid source location for tile '${tileId}'.`);
  const appearance = table.tiles[tileId].disclosure.appearance;
  if (appearance && appearance.layout !== definition.layout)
    throw new Error(
      `Tile '${tileId}' appearance layout does not match board '${boardId}'.`,
    );
  const sameBoard = source.type === "OnBoard" && source.boardId === boardId;
  const candidate = candidateWithLocation(table, tileId, placement);
  deriveBoardTopology(candidate, definitions, boardId);
  // A validated identical placement does not move occupied world elements.
  if (
    sameBoard &&
    encodeCanonicalPluginRuntimeJson(source) ===
      encodeCanonicalPluginRuntimeJson(placement)
  )
    return;
  assertDependencies(table, definitions, tileId, sameBoard);
  if (source.type === "OnBoard" && !sameBoard)
    deriveBoardTopology(candidate, definitions, source.boardId);
  // Resolve and validate the old ordered membership before the first write.
  const sourceIds =
    source.type === "InZone"
      ? resolveZone(table, definitions, source).ids
      : null;
  if (sourceIds && sourceIds.filter((id) => id === tileId).length !== 1)
    throw new Error(`Zone membership disagrees with location for '${tileId}'.`);
  if (sourceIds) sourceIds.splice(sourceIds.indexOf(tileId), 1);
  table.componentLocations[tileId] = placement;
}

export function removeTileInPlace(options: TileMutation): void {
  const { table, definitions, boardId, tileId } = options;
  assertTile(table, tileId);
  const source = Object.hasOwn(table.componentLocations, tileId)
    ? table.componentLocations[tileId]
    : undefined;
  if (source?.type !== "OnBoard" || source.boardId !== boardId)
    throw new Error(`Tile '${tileId}' is not placed on board '${boardId}'.`);
  assertTileCanLeaveBoard(table, definitions, tileId);
  table.componentLocations[tileId] = { type: "Detached" };
}
