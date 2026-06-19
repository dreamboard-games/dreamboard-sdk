import {
  BoardStaticProjectionSchema,
  InteractionDescriptorSchema,
  PluginGameplayFrameSchema,
  SeatProjectionBundleSchema,
  ZoneHandlesSnapshotSchema,
} from "./schema.js";
import type {
  InteractionDescriptor,
  PlayerId,
  PluginGameplayFrame,
  ReducerBoardStaticProjection,
  ReducerSeatProjectionBundle,
  ZoneHandlesSnapshot,
} from "./frame.js";
import { canonicalizePluginRuntimeJson } from "./json.js";
import type { RuntimeJson } from "./json.js";

export interface MaterializePluginGameplayFrameInput {
  readonly currentPhase: string | null;
  readonly activePlayers: readonly PlayerId[];
  readonly dynamicProjection: ReducerSeatProjectionBundle;
  readonly staticProjection?: ReducerBoardStaticProjection | null;
  readonly perspectivePlayerId: PlayerId | null;
  readonly gameVersion: number;
  readonly actionSetVersion: string;
}

export function materializePluginGameplayFrame(
  input: MaterializePluginGameplayFrameInput,
): PluginGameplayFrame {
  const dynamicProjection = SeatProjectionBundleSchema.parse(
    canonicalizeReducerProjection(input.dynamicProjection),
  ) as ReducerSeatProjectionBundle;
  const staticProjection =
    input.staticProjection == null
      ? null
      : (BoardStaticProjectionSchema.parse(
          canonicalizeReducerProjection(input.staticProjection),
        ) as ReducerBoardStaticProjection);

  const registry = parseInteractionRegistry(
    dynamicProjection.interactionsByRef,
  );
  const seat =
    input.perspectivePlayerId == null
      ? null
      : (dynamicProjection.seats[input.perspectivePlayerId] ?? null);

  const availableInteractions =
    seat == null
      ? []
      : hydrateInteractionRefs(
          registry,
          seat.availableInteractionRefs,
          "availableInteractionRefs",
        );
  const zones =
    seat?.zones == null ? {} : hydrateZones(registry, seat.zones, "zones");

  const frame = {
    gameVersion: input.gameVersion,
    actionSetVersion: input.actionSetVersion,
    perspectivePlayerId: input.perspectivePlayerId,
    view: composeProjectionView(staticProjection, seat?.view),
    flow: {
      currentPhase: input.currentPhase,
      currentStage: dynamicProjection.currentStage ?? null,
      activePlayers: [...input.activePlayers],
      simultaneousPhase: dynamicProjection.simultaneousPhase ?? null,
    },
    availableInteractions,
    guidance: dynamicProjection.guidance ?? null,
    recentEvents: [...(dynamicProjection.recentEvents ?? [])],
    zones,
  } satisfies PluginGameplayFrame;

  return PluginGameplayFrameSchema.parse(frame);
}

function canonicalizeReducerProjection(value: unknown): unknown {
  return canonicalizePluginRuntimeJson(value);
}

function parseInteractionRegistry(
  value: ReducerSeatProjectionBundle["interactionsByRef"],
): Record<string, InteractionDescriptor> {
  if (value == null) return {};
  if (!isRecord(value)) {
    throw new Error("Seat projection interactionsByRef must be an object.");
  }
  return Object.fromEntries(
    Object.entries(value).map(([ref, descriptor]) => [
      ref,
      InteractionDescriptorSchema.parse(descriptor),
    ]),
  );
}

function hydrateZones(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: unknown,
  path: string,
): Record<string, ZoneHandlesSnapshot> {
  if (!isRecord(value)) {
    throw new Error(`Seat projection ${path} must be an object.`);
  }
  return Object.fromEntries(
    Object.entries(value).map(([zoneId, zoneValue]) => [
      zoneId,
      hydrateZone(registry, zoneValue, `${path}.${zoneId}`),
    ]),
  );
}

function hydrateZone(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: unknown,
  path: string,
): ZoneHandlesSnapshot {
  if (!isRecord(value)) {
    throw new Error(`Seat projection ${path} must be an object.`);
  }
  const cardIds = arrayOfStrings(value.cardIds, `${path}.cardIds`);
  const cardViewsById = stringRecord(
    value.cardViewsById,
    `${path}.cardViewsById`,
  );
  if (!isRecord(value.playableByCardId)) {
    throw new Error(
      `Seat projection ${path}.playableByCardId must be an object.`,
    );
  }
  const playableByCardId = Object.fromEntries(
    Object.entries(value.playableByCardId).map(([cardId, refs]) => [
      cardId,
      hydrateInteractionRefs(
        registry,
        refs,
        `${path}.playableByCardId.${cardId}`,
      ),
    ]),
  );
  return ZoneHandlesSnapshotSchema.parse({
    cardIds,
    cardViewsById,
    playableByCardId,
  });
}

function hydrateInteractionRefs(
  registry: Readonly<Record<string, InteractionDescriptor>>,
  value: unknown,
  path: string,
): InteractionDescriptor[] {
  if (!Array.isArray(value)) {
    throw new Error(`Seat projection ${path} must be an array of refs.`);
  }
  return value.map((ref, index) => {
    if (typeof ref !== "string") {
      throw new Error(
        `Seat projection ${path}[${index}] must be a ref string.`,
      );
    }
    const descriptor = registry[ref];
    if (!descriptor) {
      throw new Error(
        `Seat projection ${path}[${index}] references '${ref}', which is missing from interactionsByRef.`,
      );
    }
    return descriptor;
  });
}

function composeProjectionView(
  staticProjection: ReducerBoardStaticProjection | null,
  dynamicView: unknown,
): RuntimeJson | null {
  const normalizedDynamicView =
    dynamicView === undefined ? null : (dynamicView as RuntimeJson | null);
  if (staticProjection == null) {
    return normalizedDynamicView;
  }
  if (normalizedDynamicView == null) {
    return staticProjection.view;
  }
  if (isRecord(staticProjection.view) && isRecord(normalizedDynamicView)) {
    return {
      ...staticProjection.view,
      ...normalizedDynamicView,
    } as RuntimeJson;
  }
  return {
    static: staticProjection.view,
    dynamic: normalizedDynamicView,
  };
}

function arrayOfStrings(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Seat projection ${path} must be an array of strings.`);
  }
  return value;
}

function stringRecord(value: unknown, path: string): Record<string, string> {
  if (!isRecord(value)) {
    throw new Error(`Seat projection ${path} must be an object.`);
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") {
      throw new Error(`Seat projection ${path}.${key} must be a string.`);
    }
    result[key] = item;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
