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
} from "./frame.js";
import {
  hydrateCompactGameplayFrame,
  visitInteractionRefs,
  type CompactGameplayFrame,
} from "./compact-frame.js";
import type * as Wire from "../runtime-types.js";
import type { RuntimeJson } from "../runtime-json.js";

export interface MaterializePluginGameplayFrameInput {
  readonly players: readonly PlayerId[];
  readonly causedBy?: string;
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
  return PluginGameplayFrameSchema.parse(
    hydrateCompactGameplayFrame(
      materializeCompactGameplayFrame({ ...input, dynamicProjection }),
    ),
  );
}

/** Selects one seat from an already schema-validated all-seat projection. */
export function materializeCompactGameplayFrame(
  input: Omit<MaterializePluginGameplayFrameInput, "dynamicProjection"> & {
    readonly dynamicProjection: Wire.SeatProjectionBundle;
  },
): CompactGameplayFrame {
  const { dynamicProjection } = input;
  if (
    dynamicProjection.referenceBasis.sessionId !== input.sessionId ||
    dynamicProjection.referenceBasis.version !== input.version
  ) {
    throw new Error(
      "Projection reference basis does not match the frame basis.",
    );
  }
  const registry = dynamicProjection.interactionsByRef ?? {};
  const seat = dynamicProjection.seats[input.perspectivePlayerId];
  const availableInteractionRefs = seat?.availableInteractionRefs ?? [];
  const zones = seat?.zones ?? {};
  const selected = new Map<string, InteractionDescriptor>();
  visitInteractionRefs({ availableInteractionRefs, zones }, (ref, path) => {
    if (selected.has(ref)) return;
    if (!Object.hasOwn(registry, ref)) {
      throw new Error(
        `Seat projection ${path.join(".")} references '${ref}', which is missing from interactionsByRef.`,
      );
    }
    selected.set(ref, registry[ref]);
  });

  const frame = {
    players: input.players,
    ...(input.causedBy === undefined ? {} : { causedBy: input.causedBy }),
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
    interactionsByRef: Object.fromEntries(selected),
    availableInteractionRefs,
    zones,
  } satisfies CompactGameplayFrame;

  return frame;
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
