import type {
  PluginGameplayFrame,
  PluginSessionDescriptor,
} from "@dreamboard-games/plugin-runtime-contract";
import type { PluginRuntimeClient } from "./core/types.js";

export function makeTestGameplayFrame<View = unknown>(options: {
  gameVersion: number;
  view: View | null;
  perspectivePlayerId?: string;
  currentPhase?: string | null;
  currentStage?: string | null;
  activePlayers?: readonly string[];
  availableInteractions?: PluginGameplayFrame["availableInteractions"];
  zones?: PluginGameplayFrame["zones"];
}): PluginGameplayFrame<View> {
  return {
    basis: {
      generation: 0,
      version: options.gameVersion,
      actionSetVersion: `sha256:${options.gameVersion.toString(16).padStart(64, "0")}`,
      perspectivePlayerId: options.perspectivePlayerId ?? "player-1",
    },
    view: options.view,
    flow: {
      currentPhase: options.currentPhase ?? "play",
      currentStage: options.currentStage ?? null,
      activePlayers: [...(options.activePlayers ?? ["player-1"])],
      simultaneousPhase: null,
    },
    availableInteractions: options.availableInteractions ?? [],
    recentEvents: [],
    zones: options.zones ?? {},
  };
}

export function makeTestRuntimeHarness(
  initialFrame: PluginGameplayFrame,
  options: {
    session?: PluginSessionDescriptor;
    submitInteraction?: PluginRuntimeClient["submitInteraction"];
  } = {},
) {
  let frame = initialFrame;
  let session =
    options.session ??
    ({
      sessionId: "session-1",
      players: [{ playerId: "player-1", displayName: "Player One" }],
    } satisfies PluginSessionDescriptor);
  const frameListeners = new Set<() => void>();
  const sessionListeners = new Set<() => void>();
  const submitCalls: Array<{ interactionId: string; params: unknown }> = [];
  let submitImpl: PluginRuntimeClient["submitInteraction"] =
    options.submitInteraction ??
    (async (interactionId, params) => {
      submitCalls.push({ interactionId, params });
    });
  const runtime: PluginRuntimeClient = {
    getSession: () => session,
    subscribeSession: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    getFrame: () => frame,
    subscribeFrame: (listener) => {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    submitInteraction: (...args) => submitImpl(...args),
    disconnect: () => undefined,
  };

  return {
    runtime,
    submitCalls,
    emit(nextFrame: PluginGameplayFrame) {
      frame = nextFrame;
      for (const listener of frameListeners) {
        listener();
      }
    },
    emitSession(nextSession: PluginSessionDescriptor) {
      session = nextSession;
      for (const listener of sessionListeners) {
        listener();
      }
    },
    setSubmitImpl(impl: PluginRuntimeClient["submitInteraction"]) {
      submitImpl = impl;
    },
  };
}
