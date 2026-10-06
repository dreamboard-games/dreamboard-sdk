import { canonicalizePluginRuntimeJson } from "./json";
import {
  PluginGameplayFrameSchema,
  SeatProjectionBundleSchema,
} from "./schema.js";
import type {
  InteractionDescriptor,
  PlayerId,
  PluginGameplayFrame,
  ReducerSeatProjectionBundle,
  ZoneHandlesSnapshot,
} from "./frame.js";
import type { RuntimeJson } from "../runtime-json.js";

export interface MaterializePluginGameplayFrameInput {
  readonly currentPhase: string | null;
  readonly activePlayers: readonly PlayerId[];
  readonly dynamicProjection: ReducerSeatProjectionBundle;
  readonly perspectivePlayerId: PlayerId;

  readonly sessionId: string;
  readonly version: number;
  readonly actionSetVersion: string;
}

export function materializePluginGameplayFrame(
  input: MaterializePluginGameplayFrameInput,
): PluginGameplayFrame {
  const dynamicProjection = SeatProjectionBundleSchema.parse(
    canonicalizePluginRuntimeJson(input.dynamicProjection),
  );
  if (
    dynamicProjection.referenceBasis.sessionId !== input.sessionId ||
    dynamicProjection.referenceBasis.version !== input.version
  ) {
    throw new Error(
      "Projection reference basis does not match the frame basis.",
    );
  }
  const registry = dynamicProjection.interactionsByRef ?? {};
  const seat = dynamicProjection.seats[input.perspectivePlayerId] ?? null;

  const availableInteractions =
    seat == null
      ? []
      : hydrateInteractionRefs(
          registry,
          seat.availableInteractionRefs ?? [],
          "availableInteractionRefs",
        );
  const zones =
    seat?.zones == null ? {} : hydrateZones(registry, seat.zones, "zones");

  const frame = {
    events: seat?.events ?? [],
    basis: {
      sessionId: input.sessionId,
      version: input.version,
      actionSetVersion: input.actionSetVersion,
      perspectivePlayerId: input.perspectivePlayerId,
    },
    view: materializeView(seat?.view, seat?.boards),
    flow: {
      currentPhase: input.currentPhase,
      activePlayers: [...input.activePlayers],
      simultaneousPhase: dynamicProjection.simultaneousPhase ?? null,
    },
    availableInteractions,
    zones,
  } satisfies PluginGameplayFrame;

  return PluginGameplayFrameSchema.parse(frame);
}

function materializeView(
  seatView: unknown,
  seatBoards: ReducerSeatProjectionBundle["seats"][string]["boards"],
): RuntimeJson | null {
  const parts = [
    seatView,
    seatBoards === undefined ? undefined : { boards: seatBoards },
  ].filter((part) => part !== undefined && part !== null);
  if (parts.length === 0) return null;
  // Admitting schemas guarantee records and reject authored `boards` fields.
  return Object.assign({}, ...parts) as Record<string, RuntimeJson>;
}

function hydrateZones(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: NonNullable<ReducerSeatProjectionBundle["seats"][string]["zones"]>,
  path: string,
): Record<string, Record<string, ZoneHandlesSnapshot>> {
  return Object.fromEntries(
    Object.entries(value).map(([zoneId, hosts]) => [
      zoneId,
      Object.fromEntries(
        Object.entries(hosts).map(([hostId, zone]) => [
          hostId,
          {
            tiles: zone.tiles,
            cardIds: zone.cardIds,
            cardViewsById: zone.cardViewsById,
            cardBacksById: zone.cardBacksById,
            playableByCardId: Object.fromEntries(
              Object.entries(zone.playableByCardId).map(([cardId, refs]) => [
                cardId,
                hydrateInteractionRefs(
                  registry,
                  refs,
                  `${path}.${zoneId}.${hostId}.playableByCardId.${cardId}`,
                ),
              ]),
            ),
          },
        ]),
      ),
    ]),
  );
}

function hydrateInteractionRefs(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: readonly string[],
  path: string,
): InteractionDescriptor[] {
  return value.map((ref, index) => {
    const descriptor = registry[ref];
    if (!descriptor) {
      throw new Error(
        `Seat projection ${path}[${index}] references '${ref}', which is missing from interactionsByRef.`,
      );
    }
    return descriptor;
  });
}
