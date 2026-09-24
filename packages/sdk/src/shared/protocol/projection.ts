import { canonicalizePluginRuntimeJson } from "./json";
import {
  BoardStaticProjectionSchema,
  PluginGameplayFrameSchema,
  SeatProjectionBundleSchema,
} from "./schema.js";
import type {
  InteractionDescriptor,
  PlayerId,
  PluginGameplayFrame,
  ReducerBoardStaticProjection,
  ReducerSeatProjectionBundle,
  ZoneHandlesSnapshot,
} from "./frame.js";
import type { RuntimeJson } from "../runtime-json.js";

export interface MaterializePluginGameplayFrameInput {
  readonly currentPhase: string | null;
  readonly activePlayers: readonly PlayerId[];
  readonly dynamicProjection: ReducerSeatProjectionBundle;
  readonly staticProjection?: ReducerBoardStaticProjection | null;
  readonly perspectivePlayerId: PlayerId;

  readonly version: number;
  readonly actionSetVersion: string;
}

export function materializePluginGameplayFrame(
  input: MaterializePluginGameplayFrameInput,
): PluginGameplayFrame {
  const dynamicProjection = SeatProjectionBundleSchema.parse(
    canonicalizePluginRuntimeJson(input.dynamicProjection),
  );
  const staticProjection =
    input.staticProjection == null
      ? null
      : BoardStaticProjectionSchema.parse(
          canonicalizePluginRuntimeJson(input.staticProjection),
        );

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
    events: dynamicProjection.events,
    basis: {
      version: input.version,
      actionSetVersion: input.actionSetVersion,
      perspectivePlayerId: input.perspectivePlayerId,
    },
    view: materializeView(staticProjection, seat?.view),
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
  staticProjection: ReducerBoardStaticProjection | null,
  seatView: unknown,
): RuntimeJson | null {
  const parts = [staticProjection?.view, seatView].filter(
    (part) => part !== undefined && part !== null,
  );
  if (parts.length === 0) return null;
  // Admitting schemas guarantee records and reject authored `boards` fields.
  return Object.assign({}, ...parts) as Record<string, RuntimeJson>;
}

function hydrateZones(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: NonNullable<ReducerSeatProjectionBundle["seats"][string]["zones"]>,
  path: string,
): Record<string, ZoneHandlesSnapshot> {
  return Object.fromEntries(
    Object.entries(value).map(([zoneId, zone]) => [
      zoneId,
      {
        cardIds: zone.cardIds,
        cardViewsById: zone.cardViewsById,
        playableByCardId: Object.fromEntries(
          Object.entries(zone.playableByCardId).map(([cardId, refs]) => [
            cardId,
            hydrateInteractionRefs(
              registry,
              refs,
              `${path}.${zoneId}.playableByCardId.${cardId}`,
            ),
          ]),
        ),
      },
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
