import { useCallback } from "react";
import type { CardIntent } from "../../ui.js";
import { useInteractionUiStore } from "../context/InteractionDraftContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import {
  applyCardIntent,
  decodeRuntimeDropTargetId,
  type CardIntentResult,
} from "../utils/card-intent-adapter.js";

export type RuntimeCardIntentResult = CardIntentResult;

/**
 * Author-facing card intent. Mirrors the SDK shape, but for `drop` intents
 * `targetId` is the manifest id (e.g. `"hex-a"`) — the runtime adapter
 * decodes the opaque SDK target id before invoking author callbacks. This
 * matches the type the generated `hand.Hand` facade declares.
 */
export type AuthoredCardIntent =
  | { type: "activate"; cardId: string; source: "tap" | "keyboard" }
  | { type: "previewStart"; cardId: string }
  | { type: "previewEnd"; cardId: string }
  | {
      type: "drop";
      cardId: string;
      targetId: string;
      source: "pointer" | "keyboard";
    };

/**
 * Translate a raw SDK `CardIntent` into the author-facing
 * `AuthoredCardIntent` shape. For drop intents the opaque encoded
 * `targetId` is decoded into its manifest value; non-decodable target
 * ids fall through unchanged so authors can detect and ignore them.
 */
export function decodeAuthoredCardIntent(
  intent: CardIntent,
): AuthoredCardIntent {
  if (intent.type !== "drop") {
    return intent;
  }
  const decoded = decodeRuntimeDropTargetId(String(intent.targetId));
  return {
    type: "drop",
    cardId: String(intent.cardId),
    source: intent.source,
    targetId: decoded ? decoded.value : String(intent.targetId),
  };
}

export interface UseCardIntentAdapterOptions {
  /** Zone the hand is rendering. Used for snapshot lookup. */
  zone: string;
  /**
   * Optional hook for the host to react to the runtime classification of an
   * intent. Useful for confirmation animations or analytics. The intent is
   * already routed by the time this fires. Receives the decoded
   * authored-shape intent so `targetId` is the manifest id, not the SDK
   * opaque encoding.
   */
  onResult?: (
    intent: AuthoredCardIntent,
    result: RuntimeCardIntentResult,
  ) => void;
}

/**
 * Bind SDK card intent emission to the canonical runtime collector pipeline.
 *
 * The returned callback accepts the SDK `CardIntent` shape unchanged. The
 * adapter looks up the descriptor for the originating card, atomically
 * applies the card and any decoded drop-target inputs, and routes
 * pending/submitting/submitted classifications through the runtime API.
 *
 * Preview intents are forwarded to the optional `onResult` callback as
 * `ignored` results so authors can attach analytics without owning the
 * routing logic themselves.
 */
export function useCardIntentAdapter({
  zone,
  onResult,
}: UseCardIntentAdapterOptions) {
  const store = useInteractionUiStore();
  const { controllingPlayerId } = usePluginSession();
  const runtime = useRuntimeContext();
  const zoneSnapshot = usePluginState(
    (state) => state.gameplay.zones[zone] ?? null,
  );
  const availableInteractions = usePluginState(
    (state) => state.gameplay.availableInteractions,
  );

  return useCallback(
    async (intent: CardIntent): Promise<RuntimeCardIntentResult> => {
      const authored = decodeAuthoredCardIntent(intent);
      if (intent.type === "previewStart" || intent.type === "previewEnd") {
        const result: RuntimeCardIntentResult = {
          status: "ignored",
          reason: "no-descriptor",
        };
        onResult?.(authored, result);
        return result;
      }
      if (!controllingPlayerId) {
        const result: RuntimeCardIntentResult = {
          status: "ignored",
          reason: "interaction-unavailable",
        };
        onResult?.(authored, result);
        return result;
      }
      const result = await applyCardIntent(
        {
          store,
          availableInteractions,
          zoneSnapshot,
          submit: async (descriptor, params) => {
            await runtime.submitInteraction(
              controllingPlayerId,
              descriptor.interactionId,
              params,
            );
          },
        },
        intent.type === "drop"
          ? {
              type: "drop",
              cardId: String(intent.cardId),
              targetId: String(intent.targetId),
            }
          : { type: "activate", cardId: String(intent.cardId) },
      );
      onResult?.(authored, result);
      return result;
    },
    [
      availableInteractions,
      controllingPlayerId,
      onResult,
      runtime,
      store,
      zoneSnapshot,
    ],
  );
}
