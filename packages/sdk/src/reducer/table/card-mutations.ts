import type { RuntimeTableRecord, ZoneDefinitions } from "../model";
import { removeComponentFromCurrentLocation } from "./component-mutations";
import {
  assertContainmentAcyclic,
  assertComponent,
  assertComponentAllowed,
  resolveZone,
  type ZoneInput,
} from "./zones";
import { assertNonNegativeSafeInteger } from "./numeric";

export type ZonePosition = "top" | "bottom" | number;

function insertionIndex(
  position: ZonePosition | undefined,
  length: number,
): number {
  if (position === undefined || position === "bottom") return length;
  if (position === "top") return 0;
  assertNonNegativeSafeInteger(position, "Zone insertion position");
  if (position > length)
    throw new Error("Zone insertion position exceeds its length.");
  return position;
}

function validateSource(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  id: string,
): void {
  assertComponent(table, id);
  const source = table.componentLocations[id];
  if (source.type === "InZone") {
    const { ids } = resolveZone(table, definitions, source);
    if (ids.filter((candidate) => candidate === id).length !== 1)
      throw new Error(`Zone membership disagrees with location for '${id}'.`);
  }
}

function place(
  table: RuntimeTableRecord,
  definitions: ZoneDefinitions,
  id: string,
  zone: ZoneInput,
  playedBy: string | null,
): void {
  const { ref, definition } = resolveZone(table, definitions, zone);
  table.componentLocations[id] = { type: "InZone", ...ref, playedBy };
  if (Object.hasOwn(table.cards, id)) {
    table.visibility[id] = { faceUp: definition.visibility !== "hidden" };
  }
}

export function moveComponentToZoneInPlace(options: {
  table: RuntimeTableRecord;
  definitions: ZoneDefinitions;
  componentId: string;
  to: ZoneInput;
  position?: ZonePosition;
  playedBy?: string | null;
}): void {
  const { table, definitions, componentId } = options;
  const destination = resolveZone(table, definitions, options.to);
  assertComponentAllowed(table, destination.definition, componentId);
  validateSource(table, definitions, componentId);
  if (options.playedBy != null && !table.playerOrder.includes(options.playedBy))
    throw new Error("playedBy must name an active player.");
  const source = table.componentLocations[componentId];
  const same =
    source.type === "InZone" &&
    source.zoneId === destination.ref.zoneId &&
    source.hostId === destination.ref.hostId;
  if (!same && destination.ids.includes(componentId))
    throw new Error(
      `Component '${componentId}' already occurs at the destination.`,
    );
  const index = insertionIndex(
    options.position,
    destination.ids.length - (same ? 1 : 0),
  );
  const playedBy =
    options.playedBy === undefined
      ? source.type === "InZone"
        ? source.playedBy
        : null
      : options.playedBy;
  assertContainmentAcyclic(table, definitions, {
    [componentId]: { type: "InZone", ...destination.ref, playedBy },
  });
  removeComponentFromCurrentLocation(table, componentId, definitions);
  destination.ids.splice(index, 0, componentId);
  place(table, definitions, componentId, destination.ref, playedBy);
}

export function dealComponentsInPlace(options: {
  table: RuntimeTableRecord;
  definitions: ZoneDefinitions;
  from: ZoneInput;
  to: ZoneInput;
  count: number;
}): void {
  const { table, definitions } = options;
  assertNonNegativeSafeInteger(options.count, "Deal count");
  const source = resolveZone(table, definitions, options.from);
  const destination = resolveZone(table, definitions, options.to);
  if (
    source.ref.zoneId === destination.ref.zoneId &&
    source.ref.hostId === destination.ref.hostId
  )
    throw new Error("Deal source and destination must differ.");
  const selected = source.ids.slice(0, options.count);
  for (const id of selected) {
    validateSource(table, definitions, id);
    const location = table.componentLocations[id];
    if (
      location.type !== "InZone" ||
      location.zoneId !== source.ref.zoneId ||
      location.hostId !== source.ref.hostId
    )
      throw new Error(`Source membership disagrees with location for '${id}'.`);
    assertComponentAllowed(table, destination.definition, id);
    if (destination.ids.includes(id))
      throw new Error(`Component '${id}' already occurs at destination.`);
  }
  if (new Set(selected).size !== selected.length)
    throw new Error("Duplicate source membership.");
  assertContainmentAcyclic(
    table,
    definitions,
    Object.fromEntries(
      selected.map((id) => [
        id,
        { type: "InZone", ...destination.ref, playedBy: null },
      ]),
    ),
  );
  source.ids.splice(0, selected.length);
  destination.ids.push(...selected);
  for (const id of selected)
    place(table, definitions, id, destination.ref, null);
}

export function rotateZoneInPlace(options: {
  table: RuntimeTableRecord;
  definitions: ZoneDefinitions;
  zoneId: string;
  direction: "left" | "right";
  players?: readonly string[];
  componentIdsByPlayer?: Partial<Record<string, readonly string[]>>;
  position?: "top" | "bottom";
}): void {
  const { table, definitions, zoneId } = options;
  const definition = Object.hasOwn(definitions.zoneDefinitions, zoneId)
    ? definitions.zoneDefinitions[zoneId]
    : undefined;
  if (
    !definition ||
    !("scope" in definition) ||
    definition.scope !== "perPlayer"
  )
    throw new Error(`Zone '${zoneId}' must have perPlayer scope.`);
  if (options.direction !== "left" && options.direction !== "right")
    throw new Error("Rotation direction must be left or right.");
  if (
    options.position !== undefined &&
    options.position !== "top" &&
    options.position !== "bottom"
  )
    throw new Error("Rotation position must be top or bottom.");
  const players = [...(options.players ?? table.playerOrder)];
  for (const hostId of Object.keys(options.componentIdsByPlayer ?? {})) {
    if (!players.includes(hostId))
      throw new Error(
        `Rotation selection host '${hostId}' is not a selected player.`,
      );
  }
  if (new Set(players).size !== players.length)
    throw new Error("Rotation players must be unique.");
  const snapshots = players.map((hostId) => {
    const source = resolveZone(table, definitions, { zoneId, hostId });
    const selected = [
      ...(options.componentIdsByPlayer?.[hostId] ?? source.ids),
    ];
    if (new Set(selected).size !== selected.length)
      throw new Error("Rotation selections must be unique.");
    for (const id of selected) {
      if (!source.ids.includes(id))
        throw new Error(`Component '${id}' is absent from rotation source.`);
      validateSource(table, definitions, id);
      const location = table.componentLocations[id];
      if (
        location.type !== "InZone" ||
        location.zoneId !== zoneId ||
        location.hostId !== hostId
      )
        throw new Error(
          `Rotation membership disagrees with location for '${id}'.`,
        );
      assertComponentAllowed(table, definition, id);
    }
    return {
      source,
      selected,
      remaining: source.ids.filter((id) => !selected.includes(id)),
    };
  });
  const proposed: RuntimeTableRecord["componentLocations"] = {};
  snapshots.forEach(({ source }, index) => {
    const offset = options.direction === "left" ? -1 : 1;
    for (const id of snapshots[
      (index + offset + snapshots.length) % snapshots.length
    ].selected)
      proposed[id] = { type: "InZone", ...source.ref, playedBy: null };
  });
  assertContainmentAcyclic(table, definitions, proposed);
  snapshots.forEach(({ source, remaining }, index) => {
    const offset = options.direction === "left" ? -1 : 1;
    const additions =
      snapshots[(index + offset + snapshots.length) % snapshots.length]
        .selected;
    source.ids.splice(
      0,
      source.ids.length,
      ...(options.position === "top"
        ? [...additions, ...remaining]
        : [...remaining, ...additions]),
    );
    for (const id of additions) place(table, definitions, id, source.ref, null);
  });
}

export function flipCardInPlace(
  table: RuntimeTableRecord,
  cardId: string,
  faceUp: boolean,
): void {
  if (!Object.hasOwn(table.cards, cardId))
    throw new Error(`Unknown card '${cardId}'.`);
  if (table.componentLocations[cardId]?.type !== "InZone")
    throw new Error("Only cards in zones can be flipped.");
  table.visibility[cardId] = { ...table.visibility[cardId], faceUp };
}
