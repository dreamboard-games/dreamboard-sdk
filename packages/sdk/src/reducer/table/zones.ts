import {
  boardSpaceHostId,
  parseBoardSpaceHostId,
} from "../../shared/domain/board-space-host";
import type {
  RuntimeTableRecord,
  ZoneDefinition,
  ZoneDefinitions,
  ZoneRef,
} from "../model";

/** Only state needed to admit zone hosts, memberships, and containment. */
export type ZoneTable = {
  readonly playerOrder: readonly string[];
  readonly zones: Record<string, Record<string, string[]>>;
  readonly cards: Record<string, { id: string; cardSetId: string }>;
  readonly pieces: Record<
    string,
    { id: string; pieceTypeId: string; ownerId?: string | null }
  >;
  readonly tiles: Record<
    string,
    { id: string; tileTypeId: string; ownerId: string | null }
  >;
  readonly dice: Record<
    string,
    { id: string; dieTypeId: string; ownerId?: string | null }
  >;
  readonly componentLocations: Readonly<
    Record<string, RuntimeTableRecord["componentLocations"][string]>
  >;
  readonly boards: {
    readonly byId: Record<
      string,
      {
        id: string;
        baseId?: string;
        scope: "shared" | "perPlayer";
        playerId?: string | null;
        spaces: Record<string, unknown>;
      }
    >;
  };
};

export type ZoneHostTable = Pick<
  ZoneTable,
  "playerOrder" | "boards" | "pieces" | "dice"
>;

export type ZoneInput = { readonly zoneId: string; readonly hostId?: string };

/** The actual state graph, rather than identity syntax, owns host membership. */
export function enumerateZoneHosts(
  table: ZoneHostTable,
  definition: ZoneDefinition,
): readonly string[] {
  if ("scope" in definition)
    return definition.scope === "shared" ? ["table"] : table.playerOrder;
  const attachment = definition.attachedTo;
  if ("board" in attachment) {
    const boards = Object.values(table.boards.byId).filter(
      (board) => (board.baseId ?? board.id) === attachment.board,
    );
    return boards.flatMap((board) =>
      attachment.space === undefined
        ? [board.id]
        : Object.hasOwn(board.spaces, attachment.space)
          ? [boardSpaceHostId(board.id, attachment.space)]
          : [],
    );
  }
  if ("pieceType" in attachment)
    return Object.values(table.pieces)
      .filter((piece) => piece.pieceTypeId === attachment.pieceType)
      .map((piece) => piece.id);
  return Object.values(table.dice)
    .filter((die) => die.dieTypeId === attachment.dieType)
    .map((die) => die.id);
}

/** Resolve one live host without scanning its inventory family. */
export function resolveZoneHost(
  table: ZoneHostTable,
  definition: ZoneDefinition,
  hostId: string,
): { owner: string | null; shared: boolean; componentId: string | null } {
  const invalid = () => new Error(`Invalid zone host '${hostId}'.`);
  if ("scope" in definition) {
    if (definition.scope === "shared") {
      if (hostId !== "table") throw invalid();
      return { owner: null, shared: true, componentId: null };
    }
    if (!table.playerOrder.includes(hostId)) throw invalid();
    return { owner: hostId, shared: false, componentId: null };
  }
  const attachment = definition.attachedTo;
  if ("board" in attachment) {
    const spaceHost =
      attachment.space === undefined ? null : parseBoardSpaceHostId(hostId);
    const boardId =
      attachment.space === undefined ? hostId : spaceHost?.boardId;
    const board =
      boardId && Object.hasOwn(table.boards.byId, boardId)
        ? table.boards.byId[boardId]
        : undefined;
    if (
      !board ||
      board.id !== boardId ||
      (board.baseId ?? board.id) !== attachment.board ||
      (attachment.space !== undefined &&
        (spaceHost?.spaceId !== attachment.space ||
          !Object.hasOwn(board.spaces, attachment.space)))
    )
      throw invalid();
    return {
      owner: board.scope === "perPlayer" ? (board.playerId ?? null) : null,
      shared: board.scope === "shared",
      componentId: null,
    };
  }
  const component =
    "pieceType" in attachment
      ? Object.hasOwn(table.pieces, hostId) &&
        table.pieces[hostId].pieceTypeId === attachment.pieceType
        ? table.pieces[hostId]
        : undefined
      : Object.hasOwn(table.dice, hostId) &&
          table.dice[hostId].dieTypeId === attachment.dieType
        ? table.dice[hostId]
        : undefined;
  if (!component || component.id !== hostId) throw invalid();
  return {
    owner: component.ownerId ?? null,
    shared: false,
    componentId: hostId,
  };
}

export function resolveZoneOwner(
  table: ZoneHostTable,
  definition: ZoneDefinition,
  hostId: string,
): string | null {
  return resolveZoneHost(table, definition, hostId).owner;
}

/** Audience admission is independent from individual card face visibility. */
export function resolveZoneAccess(
  table: ZoneHostTable,
  definition: ZoneDefinition,
  hostId: string,
  viewerId: string,
): boolean {
  if (definition.visibility === "public") {
    resolveZoneHost(table, definition, hostId);
    return true;
  }
  const { owner, shared } = resolveZoneHost(table, definition, hostId);
  return (definition.visibility === "hidden" && shared) || owner === viewerId;
}

/** Validate the final parent graph before mutating any ordered memberships. */
export function assertContainmentAcyclic(
  table: ZoneTable,
  definitions: ZoneDefinitions,
  proposedLocations: Readonly<
    Record<string, RuntimeTableRecord["componentLocations"][string]>
  > = {},
): void {
  const parents = new Map<string, string>();
  for (const [componentId, current] of Object.entries(
    table.componentLocations,
  )) {
    const location = Object.hasOwn(proposedLocations, componentId)
      ? proposedLocations[componentId]
      : current;
    if (location.type !== "InZone") continue;
    const definition = Object.hasOwn(
      definitions.zoneDefinitions,
      location.zoneId,
    )
      ? definitions.zoneDefinitions[location.zoneId]
      : undefined;
    if (!definition) throw new Error(`Unknown zone '${location.zoneId}'.`);
    const host = resolveZoneHost(table, definition, location.hostId);
    if (host.componentId !== null) parents.set(componentId, host.componentId);
  }
  const complete = new Set<string>();
  for (const start of parents.keys()) {
    const chain = new Set<string>();
    let cursor: string | undefined = start;
    while (cursor !== undefined && !complete.has(cursor)) {
      if (chain.has(cursor))
        throw new Error(`Containment cycle involving component '${cursor}'.`);
      chain.add(cursor);
      cursor = parents.get(cursor);
    }
    for (const id of chain) complete.add(id);
  }
}

/** Resolve one declared, instantiated host; never infer scope from state keys. */
export function resolveZone(
  table: ZoneTable,
  definitions: ZoneDefinitions,
  zone: ZoneInput,
): {
  ref: ZoneRef;
  definition: ZoneDefinition;
  ids: string[];
} {
  const definition = Object.hasOwn(definitions.zoneDefinitions, zone.zoneId)
    ? definitions.zoneDefinitions[zone.zoneId]
    : undefined;
  if (!definition) throw new Error(`Unknown zone '${zone.zoneId}'.`);
  const hostId =
    zone.hostId ??
    ("scope" in definition && definition.scope === "shared"
      ? "table"
      : undefined);
  if (!hostId) throw new Error(`Invalid host '' for zone '${zone.zoneId}'.`);
  resolveZoneHost(table, definition, hostId);
  const hosts = Object.hasOwn(table.zones, zone.zoneId)
    ? table.zones[zone.zoneId]
    : undefined;
  const ids = hosts && Object.hasOwn(hosts, hostId) ? hosts[hostId] : undefined;
  if (!ids)
    throw new Error(
      `Zone '${zone.zoneId}' has no instantiated host '${hostId}'.`,
    );
  return { ref: { zoneId: zone.zoneId, hostId }, definition, ids };
}

export function assertComponent(table: ZoneTable, componentId: string): void {
  if (
    ![table.cards, table.pieces, table.dice, table.tiles].some((family) =>
      Object.hasOwn(family, componentId),
    )
  )
    throw new Error(`Unknown component '${componentId}'.`);
  if (!Object.hasOwn(table.componentLocations, componentId))
    throw new Error(`Missing location for component '${componentId}'.`);
}

export function assertComponentAllowed(
  table: ZoneTable,
  definition: ZoneDefinition,
  componentId: string,
): void {
  assertComponent(table, componentId);
  if (
    Object.hasOwn(table.tiles, componentId) &&
    definition.visibility !== "public"
  )
    throw new Error(
      "Tiles require public zone destinations until tile projection supports privacy.",
    );
  const card = Object.hasOwn(table.cards, componentId)
    ? table.cards[componentId]
    : undefined;
  if (
    card &&
    definition.allowedCardSetIds.length &&
    !definition.allowedCardSetIds.includes(card.cardSetId)
  )
    throw new Error(
      `Card '${componentId}' from card set '${card.cardSetId}' cannot enter this zone.`,
    );
}

/** Admission for externally restored state, including the reverse membership index. */
export function assertZoneConsistency(
  table: ZoneTable,
  definitions: ZoneDefinitions,
): void {
  const components = new Set<string>();
  const families: readonly Record<string, { id: string }>[] = [
    table.cards,
    table.pieces,
    table.dice,
    table.tiles,
  ];
  for (const family of families)
    for (const [id, component] of Object.entries(family)) {
      if (id.startsWith("hidden:"))
        throw new Error(
          `Component id '${id}' uses the reserved hidden-card namespace.`,
        );
      if (components.has(id))
        throw new Error(
          `Duplicate component id '${id}' across component families.`,
        );
      if (component.id !== id)
        throw new Error(`Component key '${id}' does not match its id.`);
      components.add(id);
    }
  const membership = new Set<string>();
  for (const [zoneId, hosts] of Object.entries(table.zones)) {
    const definition = Object.hasOwn(definitions.zoneDefinitions, zoneId)
      ? definitions.zoneDefinitions[zoneId]
      : undefined;
    if (!definition) throw new Error(`Unknown zone '${zoneId}'.`);
    const expected = enumerateZoneHosts(table, definition);
    if (
      Object.keys(hosts).length !== expected.length ||
      expected.some((host) => !Object.hasOwn(hosts, host))
    )
      throw new Error(
        `Zone '${zoneId}' hosts do not match its declared scope and roster.`,
      );
    for (const [hostId, ids] of Object.entries(hosts)) {
      resolveZone(table, definitions, { zoneId, hostId });
      for (const id of ids) {
        assertComponentAllowed(table, definition, id);
        if (membership.has(id))
          throw new Error(
            `Component '${id}' occurs in more than one zone membership.`,
          );
        membership.add(id);
        const location = table.componentLocations[id];
        if (
          location.type !== "InZone" ||
          location.zoneId !== zoneId ||
          location.hostId !== hostId
        )
          throw new Error(
            `Zone membership disagrees with location for '${id}'.`,
          );
      }
    }
  }
  for (const zoneId of Object.keys(definitions.zoneDefinitions))
    if (!Object.hasOwn(table.zones, zoneId))
      throw new Error(`Missing zone '${zoneId}'.`);
  for (const id of components)
    if (!Object.hasOwn(table.componentLocations, id))
      throw new Error(`Missing location for component '${id}'.`);
  for (const [id, location] of Object.entries(table.componentLocations)) {
    if (
      Object.hasOwn(table.tiles, id) &&
      location.type !== "Detached" &&
      location.type !== "InZone"
    )
      throw new Error("Tiles may only be detached or in public zones.");
    if (
      location.type === "InZone" &&
      location.playedBy !== null &&
      !table.playerOrder.includes(location.playedBy)
    )
      throw new Error(`Inactive playedBy player for component '${id}'.`);
    if (!components.has(id))
      throw new Error(`Unknown located component '${id}'.`);
    if (location.type === "InZone" && !membership.has(id))
      throw new Error(`Missing zone membership for '${id}'.`);
  }
  assertContainmentAcyclic(table, definitions);
}
