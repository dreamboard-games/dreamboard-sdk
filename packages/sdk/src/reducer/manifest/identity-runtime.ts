import * as z from "zod";
import {
  perPlayerInstanceId,
  perPlayerInstanceSchema,
  type PerPlayerInstanceFamily,
} from "../../shared/domain/per-player-instance.js";

/** Count expansion precedes replication and preserves singleton authored IDs. */
export function expandBaseIds(baseId: string, count = 1): string[] {
  return count > 1
    ? Array.from({ length: count }, (_, i) => `${baseId}-${i + 1}`)
    : [baseId];
}
export function renderCardInstanceIds(card: {
  id: string;
  count: number;
}): string[] {
  return expandBaseIds(card.id, card.count);
}
export function expandSeedIds(
  seeds: readonly {
    id?: string | null;
    typeId: string;
    count?: number | null;
  }[],
): string[] {
  return seeds.flatMap((seed) =>
    expandBaseIds(seed.id ?? seed.typeId, seed.count ?? 1),
  );
}
export function scopedInstances(
  family: PerPlayerInstanceFamily,
  baseIds: readonly string[],
  scope: "shared" | "perPlayer" | undefined,
  playerIds: readonly string[],
): { id: string; playerId: string | null }[] {
  return baseIds.flatMap<{ id: string; playerId: string | null }>((baseId) =>
    scope === "perPlayer"
      ? playerIds.map((playerId) => ({
          id: perPlayerInstanceId(family, baseId, playerId),
          playerId,
        }))
      : [{ id: baseId, playerId: null }],
  );
}

/** Initial ownership comes from replication; visibility remains authored card data. */
export function initialCardMetadata(
  cardSets: readonly {
    cards: readonly {
      id: string;
      count: number;
      scope?: "shared" | "perPlayer";
      visibility?: { faceUp?: boolean };
    }[];
  }[],
  playerIds: readonly string[],
) {
  const entries = cardSets.flatMap((set) =>
    set.cards.flatMap((card) =>
      scopedInstances(
        "card",
        renderCardInstanceIds(card),
        card.scope,
        playerIds,
      ).map((instance) => ({
        ...instance,
        faceUp: card.visibility?.faceUp ?? true,
      })),
    ),
  );
  return {
    ownerOfCard: Object.fromEntries(
      entries.map((instance) => [instance.id, instance.playerId]),
    ),
    visibility: Object.fromEntries(
      entries.map((instance) => [instance.id, { faceUp: instance.faceUp }]),
    ),
  };
}

/** One declaration policy for public ID schemas and staged field references. */
export function createInstanceDeclaration(
  family: PerPlayerInstanceFamily,
  entries: readonly {
    baseIds: readonly string[];
    scope?: "shared" | "perPlayer";
  }[],
) {
  const shared = entries
    .filter((entry) => entry.scope !== "perPlayer")
    .flatMap((entry) => entry.baseIds);
  const replicated = entries
    .filter((entry) => entry.scope === "perPlayer")
    .flatMap((entry) => entry.baseIds);
  const schema = z.union([
    shared.length ? z.enum(shared) : z.never(),
    perPlayerInstanceSchema(family, replicated),
  ]);
  return {
    schema,
    accepts: (value: string) => schema.safeParse(value).success,
  };
}
