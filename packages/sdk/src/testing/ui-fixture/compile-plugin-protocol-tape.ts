import {
  materializePluginGameplayFrame,
  type PluginSessionDescriptor,
} from "@dreamboard-games/plugin-runtime-contract";
import { digestUIFixtureTransportRequest } from "./canonical.js";
import type { PluginProtocolTape, UIFixtureFrame } from "./schema.js";
import type { UIFixtureProtocolStep } from "./schema.js";
import type {
  ReducerScenarioExchange,
  ReducerScenarioFrame,
  ReducerScenarioTrace,
} from "../reducer-scenario/types.js";

export interface CompilePluginProtocolTapeOptions {
  readonly trace: ReducerScenarioTrace;
  readonly session: PluginSessionDescriptor;
}

export function compilePluginProtocolTape(
  options: CompilePluginProtocolTapeOptions,
): PluginProtocolTape {
  const frames = options.trace.frames.map((frame) =>
    materializeTraceFrame(frame, options.trace.viewer.playerId),
  );
  const frameById = new Map(frames.map((frame) => [frame.id, frame]));
  const steps: UIFixtureProtocolStep[] = [];

  const firstFrame = frames[0];
  if (!firstFrame) {
    throw new Error(
      `Reducer scenario '${options.trace.scenarioId}' did not record frames.`,
    );
  }
  steps.push({
    id: `${firstFrame.id}.host-frame`,
    kind: "host.frame",
    frameId: firstFrame.id,
  });

  for (const exchange of options.trace.exchanges) {
    const fromFrame = frameById.get(exchange.fromFrameId);
    if (!fromFrame) {
      throw new Error(
        `Reducer exchange '${exchange.id}' references missing frame '${exchange.fromFrameId}'.`,
      );
    }
    if (exchange.operation === "validate") {
      // Reducer validation remains part of the authored scenario trace, but
      // protocol v4 performs no live host validation round trip.
      continue;
    }

    steps.push({
      id: exchange.id,
      kind: "client.submit",
      fromFrameId: exchange.fromFrameId,
      requestDigest: digestRuntimeCommand(exchange, fromFrame),
      response:
        exchange.result.kind === "accepted"
          ? {
              type: "interaction.result",
              clientActionId: exchange.id,
              accepted: true,
            }
          : {
              type: "interaction.result",
              clientActionId: exchange.id,
              accepted: false,
              errorCode:
                exchange.result.diagnostics[0]?.code ?? "fixture-rejected",
              message: exchange.result.diagnostics[0]?.message,
            },
    });
    if (exchange.result.kind === "accepted") {
      if (!frameById.has(exchange.result.toFrameId)) {
        throw new Error(
          `Reducer exchange '${exchange.id}' references missing toFrameId '${exchange.result.toFrameId}'.`,
        );
      }
      steps.push({
        id: `${exchange.id}.host-frame`,
        kind: "host.frame",
        frameId: exchange.result.toFrameId,
      });
    }
  }

  return {
    session: options.session,
    frames,
    steps,
  };
}

function materializeTraceFrame(
  frame: ReducerScenarioFrame,
  perspectivePlayerId: string,
): UIFixtureFrame {
  const flow = readFlowState(frame.reducerState);
  return {
    id: frame.id,
    frame: materializePluginGameplayFrame({
      currentPhase: flow.currentPhase,
      activePlayers: flow.activePlayers,
      dynamicProjection: frame.dynamicProjection,
      staticProjection: frame.staticProjection,
      perspectivePlayerId,
      generation: 0,
      version: frame.gameVersion,
      actionSetVersion: frame.actionSetVersion,
    }),
    projectionDigest: frame.projectionDigest,
  };
}

function digestRuntimeCommand(
  exchange: ReducerScenarioExchange,
  frame: UIFixtureFrame,
): string {
  return digestUIFixtureTransportRequest({
    operation: exchange.operation === "validate" ? "validate" : "submit",
    basis: frame.frame.basis,
    interactionId: exchange.input.interactionId,
    payload: exchange.input.params,
  });
}

function readFlowState(state: {
  readonly domain?: {
    readonly flow?: {
      readonly currentPhase?: string;
      readonly activePlayers?: readonly string[];
    };
  };
}): { currentPhase: string | null; activePlayers: readonly string[] } {
  return {
    currentPhase: state.domain?.flow?.currentPhase ?? null,
    activePlayers: [...(state.domain?.flow?.activePlayers ?? [])],
  };
}
