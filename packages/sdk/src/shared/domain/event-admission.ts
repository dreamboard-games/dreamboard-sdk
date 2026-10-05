import type { GameEvent } from "./results.js";

/** Shape admission is canonical wire schema work; current references belong to session authority. */
export function assertGameEventReferences(
  events: readonly GameEvent[],
  table: {
    readonly playerOrder: readonly string[];
    readonly tiles: Readonly<Record<string, unknown>>;
  },
): void {
  const roster = new Set(table.playerOrder);
  for (const [index, event] of events.entries()) {
    if (event.audience.kind === "seats")
      for (const playerId of event.audience.playerIds)
        if (!roster.has(playerId))
          throw new Error(
            `runtime.events[${index}].audience.playerIds: unknown session player '${playerId}'.`,
          );
    for (const [detailIndex, detail] of (event.details ?? []).entries())
      if (
        typeof detail.value === "object" &&
        !Object.hasOwn(table.tiles, detail.value.tileId)
      )
        throw new Error(
          `runtime.events[${index}].details[${detailIndex}]: unknown tile '${detail.value.tileId}'.`,
        );
  }
}
