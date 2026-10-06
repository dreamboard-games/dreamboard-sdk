import type {
  RuntimeTableRecord,
  ZoneDefinition,
  ZoneDefinitions,
  ZoneRef,
} from "../model";

type ZoneTable = Pick<
  RuntimeTableRecord,
  "playerOrder" | "zones" | "cards" | "pieces" | "dice" | "componentLocations"
>;

export type ZoneInput = { readonly zoneId: string; readonly hostId?: string };

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
    zone.hostId ?? (definition.scope === "shared" ? "table" : undefined);
  if (
    !hostId ||
    (definition.scope === "shared"
      ? hostId !== "table"
      : !table.playerOrder.includes(hostId))
  )
    throw new Error(
      `Invalid host '${hostId ?? ""}' for zone '${zone.zoneId}'.`,
    );
  const hosts = table.zones[zone.zoneId];
  const ids = hosts && Object.hasOwn(hosts, hostId) ? hosts[hostId] : undefined;
  if (!ids)
    throw new Error(
      `Zone '${zone.zoneId}' has no instantiated host '${hostId}'.`,
    );
  return { ref: { zoneId: zone.zoneId, hostId }, definition, ids };
}

export function assertComponent(table: ZoneTable, componentId: string): void {
  if (
    ![table.cards, table.pieces, table.dice].some((family) =>
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
    const expected =
      definition.scope === "shared" ? ["table"] : table.playerOrder;
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
}
