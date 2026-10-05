import type { RuntimeQueryTable, ZoneDefinitions } from "../../model/table.js";
import type {
  HexSpace,
  SquareSpace,
} from "../../../shared/board-topology-schema.js";
import { createBoardTopologyCache } from "../../../shared/board-topology.js";
import {
  digestPluginRuntimeJson,
  encodeCanonicalPluginRuntimeJson,
} from "../../../shared/protocol/json.js";
import type { ReferenceBasis } from "../../../shared/runtime-types.js";
import {
  SeatTileRefSchema,
  SeatSpaceRefSchema,
  type SeatTileRef,
  type SeatSpaceRef,
} from "../../../shared/domain/seat-reference.js";
import {
  tileSpaceId,
  parseTileSpaceId,
} from "../../../shared/domain/tile-space.js";
import { parsePerPlayerInstanceId } from "../../../shared/domain/per-player-instance.js";
import { parseBoardSpaceHostId } from "../../../shared/domain/board-space-host.js";
import {
  BoardProjectionSchema,
  type ProjectedTile,
  type SeatBoardTopology,
} from "../../../shared/seat-topology-schema.js";
import {
  enumerateZoneHosts,
  resolveZoneAccess,
  resolveZoneHost,
} from "../../table/zones.js";

type Access = { readonly inventory: boolean; readonly face: boolean };
const denied: Access = { inventory: false, face: false };
const visible: Access = { inventory: true, face: true };
const topologyOf = createBoardTopologyCache();
export type SeatZoneInventory = {
  readonly zoneId: string;
  readonly hostId: string;
  readonly seatHostId: string;
  readonly componentIds: readonly string[];
  readonly tiles: readonly ProjectedTile[];
};

/** One disclosure decision and reference domain shared by projection and ingress. */
export function createSeatDisclosure(
  table: RuntimeQueryTable,
  definitions: ZoneDefinitions,
  playerId: string,
  referenceBasis: ReferenceBasis,
) {
  const tileRefs = new Map<string, SeatTileRef>();
  const tileIds = new Map<string, string>();
  const spaceRefs = new Map<string, SeatSpaceRef>();
  const spaceIds = new Map<string, string>();
  const projectedTiles = new Map<string, ProjectedTile>();
  const boards: Record<string, SeatBoardTopology> = {};
  const accessMemo = new Map<string, Access>();
  const visiting = new Set<string>();
  const zones: SeatZoneInventory[] = [];

  const token = (kind: string, location: unknown, ordinal: number) =>
    digestPluginRuntimeJson({
      kind,
      referenceBasis,
      playerId,
      location,
      ordinal,
    });
  function boardAccess(boardId: string): Access {
    const board = table.boards[boardId];
    if (!board) return denied;
    if (board.visibility === "public") return visible;
    if (board.visibility === "hidden") return denied;
    return parsePerPlayerInstanceId(boardId)?.playerId === playerId
      ? visible
      : denied;
  }
  function tileFace(tileId: string): boolean {
    const tile = table.tiles[tileId];
    if (!tile) return false;
    const face = tile.disclosure.face;
    return (
      face.audience === "public" ||
      (face.audience === "owner" && tile.ownerId === playerId) ||
      (face.audience === "seats" && face.playerIds.includes(playerId))
    );
  }
  function hostAccess(zoneId: string, hostId: string): Access {
    const definition = definitions.zoneDefinitions[zoneId];
    if (!definition) return denied;
    const host = resolveZoneHost(table, definitions, definition, hostId);
    if (host.componentId !== null) {
      const access = locationAccess(host.componentId);
      if (!access.face) return denied;
      if (Object.hasOwn(table.tiles, host.componentId))
        return tileFace(host.componentId) &&
          table.componentLocations[host.componentId]?.type === "OnBoard"
          ? visible
          : denied;
      const restriction = table.visibility[host.componentId];
      return !restriction ||
        restriction.faceUp ||
        restriction.visibleTo?.includes(playerId)
        ? visible
        : denied;
    }
    if ("attachedTo" in definition && "board" in definition.attachedTo) {
      const boardId =
        definition.attachedTo.space === undefined
          ? hostId
          : parseBoardSpaceHostId(hostId)?.boardId;
      return boardId ? boardAccess(boardId) : denied;
    }
    return visible;
  }
  function zoneAccess(zoneId: string, hostId: string): Access {
    const definition = definitions.zoneDefinitions[zoneId];
    if (
      !definition ||
      !resolveZoneAccess(table, definitions, definition, hostId, playerId)
    )
      return denied;
    const host = hostAccess(zoneId, hostId);
    return {
      inventory: host.inventory,
      face: host.face && definition.visibility !== "hidden",
    };
  }
  function locationAccess(componentId: string): Access {
    const cached = accessMemo.get(componentId);
    if (cached) return cached;
    if (visiting.has(componentId))
      throw new Error("Cyclic disclosure dependency.");
    visiting.add(componentId);
    const location = table.componentLocations[componentId];
    let access: Access = denied;
    if (
      location?.type === "Detached" &&
      !Object.hasOwn(table.tiles, componentId)
    )
      access = visible;
    if (location?.type === "InZone")
      access = zoneAccess(location.zoneId, location.hostId);
    else if (location?.type === "OnBoard")
      access = boardAccess(location.boardId);
    else if (
      location?.type === "OnSpace" ||
      location?.type === "OnEdge" ||
      location?.type === "OnVertex"
    ) {
      const board = boards[location.boardId];
      const exists =
        location.type === "OnSpace"
          ? board &&
            (board.layout === "generic"
              ? Object.hasOwn(board.spaces, location.spaceId)
              : Object.hasOwn(
                  board.spaces,
                  spaceRefs.get(location.spaceId) ?? "",
                ))
          : board &&
            board.layout !== "generic" &&
            (location.type === "OnEdge"
              ? board.edges.some((edge) => edge.id === location.edgeId)
              : board.vertices.some(
                  (vertex) => vertex.id === location.vertexId,
                ));
      access = exists ? boardAccess(location.boardId) : denied;
    }
    visiting.delete(componentId);
    accessMemo.set(componentId, access);
    return access;
  }
  function disclosure(tileId: string): "visible" | "concealed" | null {
    const access = locationAccess(tileId);
    if (!access.inventory) return null;
    if (access.face && tileFace(tileId)) return "visible";
    return table.tiles[tileId]?.disclosure.appearance ? "concealed" : null;
  }
  function tilePresentation(
    tileId: string,
  ):
    | Omit<Extract<ProjectedTile, { disclosure: "visible" }>, "ref">
    | Omit<Extract<ProjectedTile, { disclosure: "concealed" }>, "ref">
    | null {
    const tile = table.tiles[tileId];
    const state = disclosure(tileId);
    if (!tile || state === null) return null;
    if (state === "concealed") {
      const appearance = tile.disclosure.appearance;
      return appearance ? { disclosure: state, appearance } : null;
    }
    const definition = definitions.tileDefinitions[tile.tileTypeId];
    return {
      disclosure: state,
      tileTypeId: tile.tileTypeId,
      name: definition.name,
      ...(definition.frontImage === undefined
        ? {}
        : { frontImage: definition.frontImage }),
      ownerId: tile.ownerId,
      fields: definition.fields,
      properties: tile.properties,
    };
  }
  function issueTile(
    tileId: string,
    location: unknown,
    ordinal: number,
  ): ProjectedTile | null {
    const presentation = tilePresentation(tileId);
    if (!presentation) return null;
    const ref = SeatTileRefSchema.parse(
      `tile-ref:${token("tile", location, ordinal)}`,
    );
    const projected = { ...presentation, ref };
    tileRefs.set(tileId, ref);
    tileIds.set(ref, tileId);
    projectedTiles.set(tileId, projected);
    return projected;
  }

  // Board slots depend only on disclosed placement and presentation, not inventory IDs.
  // Equal public slots are indistinguishable; their ordinal reveals only disclosed count.
  for (const boardId of Object.keys(table.boards).sort()) {
    if (!boardAccess(boardId).inventory) continue;
    const instance = table.boards[boardId];
    const definition = definitions.boardDefinitions[instance.baseId];
    const candidates = Object.keys(table.tiles)
      .flatMap((tileId) => {
        const location = table.componentLocations[tileId];
        if (location?.type !== "OnBoard" || location.boardId !== boardId)
          return [];
        const presentation = tilePresentation(tileId);
        return presentation
          ? [
              {
                tileId,
                location,
                presentation,
                key: encodeCanonicalPluginRuntimeJson({
                  location,
                  presentation,
                }),
              },
            ]
          : [];
      })
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const placed = candidates.flatMap(({ tileId, location }, index) => {
      const tile = issueTile(tileId, { boardId }, index);
      if (!tile) return [];
      const placement =
        location.layout === "hex"
          ? {
              layout: location.layout,
              q: location.q,
              r: location.r,
              rotation: location.rotation,
            }
          : {
              layout: location.layout,
              col: location.col,
              row: location.row,
              rotation: location.rotation,
            };
      return [{ ...tile, placement }];
    });
    const visibleIds = candidates
      .filter(({ tileId }) => disclosure(tileId) === "visible")
      .map(({ tileId }) => tileId);
    const visibleSpaces = new Set(
      definition.layout === "generic"
        ? Object.keys(definition.spaces)
        : visibleIds.flatMap((tileId) =>
            definitions.tileDefinitions[
              table.tiles[tileId].tileTypeId
            ].cells.map((cell) => tileSpaceId(tileId, cell.id)),
          ),
    );
    const topology = topologyOf(
      {
        boards: {
          [boardId]: {
            ...instance,
            relations: instance.relations.filter(
              (relation) =>
                visibleSpaces.has(relation.fromSpaceId) &&
                visibleSpaces.has(relation.toSpaceId),
            ),
          },
        },
        tiles: Object.fromEntries(
          visibleIds.map((id) => [id, table.tiles[id]]),
        ),
        componentLocations: Object.fromEntries(
          visibleIds.map((id) => [id, table.componentLocations[id]]),
        ),
      },
      definitions,
      boardId,
    );
    if (topology.layout === "generic") {
      boards[boardId] = topology;
      continue;
    }
    for (const space of Object.values<HexSpace | SquareSpace>(
      topology.spaces,
    )) {
      const ref = tileRefs.get(space.tileId);
      if (!ref) throw new Error("Visible cell has no issued tile reference.");
      const spaceRef = SeatSpaceRefSchema.parse(
        `space-ref:${digestPluginRuntimeJson({ ref, cell: space.localCellId })}`,
      );
      spaceRefs.set(space.id, spaceRef);
      spaceIds.set(spaceRef, space.id);
    }
    const projectedSpaceId = (id: string) => {
      const ref = spaceRefs.get(id);
      if (!ref)
        throw new Error("Projected topology references an undisclosed cell.");
      return ref;
    };
    const projected = {
      ...topology,
      tiles: placed,
      spaces: Object.fromEntries(
        Object.values<HexSpace | SquareSpace>(topology.spaces).map((space) => {
          const { tileId, ...cell } = space;
          const id = projectedSpaceId(space.id);
          return [id, { ...cell, id, tileRef: tileRefs.get(tileId) }];
        }),
      ),
      relations: topology.relations.map((relation) => ({
        ...relation,
        fromSpaceId: projectedSpaceId(relation.fromSpaceId),
        toSpaceId: projectedSpaceId(relation.toSpaceId),
      })),
      edges: topology.edges.map((edge) => ({
        ...edge,
        spaceIds: edge.spaceIds.map(projectedSpaceId),
      })),
      vertices: topology.vertices.map((vertex) => ({
        ...vertex,
        spaceIds: vertex.spaceIds.map(projectedSpaceId),
      })),
    };
    boards[boardId] = BoardProjectionSchema.parse({ [boardId]: projected })[
      boardId
    ];
  }

  for (const zoneId of Object.keys(definitions.zoneDefinitions).sort()) {
    const definition = definitions.zoneDefinitions[zoneId];
    const hosts = enumerateZoneHosts(table, definitions, definition)
      .flatMap((hostId) => {
        if (!zoneAccess(zoneId, hostId).inventory) return [];
        const parsed =
          "attachedTo" in definition && "tileType" in definition.attachedTo
            ? parseTileSpaceId(hostId)
            : null;
        const seatHostId = parsed ? spaceRefs.get(hostId) : hostId;
        return seatHostId ? [{ hostId, seatHostId }] : [];
      })
      .sort((a, b) =>
        a.seatHostId < b.seatHostId ? -1 : a.seatHostId > b.seatHostId ? 1 : 0,
      );
    for (const { hostId, seatHostId } of hosts) {
      const componentIds = table.zones[zoneId]?.[hostId] ?? [];
      const tiles: ProjectedTile[] = [];
      for (const id of componentIds) {
        if (!Object.hasOwn(table.tiles, id)) continue;
        const projected = issueTile(
          id,
          { zoneId, hostId: seatHostId },
          tiles.length,
        );
        if (projected) tiles.push(projected);
      }
      zones.push({ zoneId, hostId, seatHostId, componentIds, tiles });
    }
  }

  function boardTarget(
    kind: "space" | "edge" | "vertex",
    boardId: string,
    id: string,
  ): string | null {
    const board = boards[boardId];
    if (!board) return null;
    if (kind === "space") {
      const ref = board.layout === "generic" ? id : spaceRefs.get(id);
      return ref && Object.hasOwn(board.spaces, ref) ? ref : null;
    }
    if (board.layout === "generic") return null;
    return (kind === "edge" ? board.edges : board.vertices).some(
      (item) => item.id === id,
    )
      ? id
      : null;
  }
  return {
    boards,
    zones,
    locationAccess,
    referenceBasis,
    tile: (id: string) => projectedTiles.get(id) ?? null,
    tileRef: (id: string) => tileRefs.get(id) ?? null,
    tileId: (ref: string) => tileIds.get(ref) ?? null,
    boardTarget,
    authoritativeBoardTarget(
      kind: "space" | "edge" | "vertex",
      boardId: string,
      ref: string,
    ): string | null {
      const board = boards[boardId];
      const id =
        kind === "space" && board?.layout !== "generic"
          ? spaceIds.get(ref)
          : ref;
      return id && boardTarget(kind, boardId, id) === ref ? id : null;
    },
    cardRef: (location: unknown, ordinal: number) =>
      `card-ref:${token("card", location, ordinal)}`,
  };
}
export type SeatDisclosure = ReturnType<typeof createSeatDisclosure>;
