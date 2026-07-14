import {
  computePluginActionSetVersion,
  materializePluginGameplayFrame,
} from "@dreamboard-games/plugin-runtime-contract";
import { digestUIFixtureJson } from "../ui-fixture/canonical.js";
import type {
  CreateReducerScenarioRunnerOptions,
  ReducerScenarioFrame,
  ReducerScenarioExchange,
  ReducerScenarioOperation,
  ReducerScenarioRunner,
  ReducerScenarioTrace,
} from "./types.js";

export function createReducerScenarioRunner(
  options: CreateReducerScenarioRunnerOptions,
): ReducerScenarioRunner {
  return {
    async run(
      operations: readonly ReducerScenarioOperation[],
    ): Promise<ReducerScenarioTrace> {
      let state = structuredClone(options.initialState);
      let gameVersion = options.initialGameVersion ?? 1;
      const frames: ReducerScenarioFrame[] = [];
      const exchanges: ReducerScenarioExchange[] = [];

      const appendFrame = (id: string): ReducerScenarioFrame => {
        const dynamicProjection = options.bundle.projectSeatsDynamic({
          state,
          playerIds: [options.viewer.playerId],
        });
        const staticProjection = options.bundle.projectStatic?.() ?? null;
        const flow = readFlowState(state);
        const materialized = materializePluginGameplayFrame({
          currentPhase: flow.currentPhase,
          activePlayers: flow.activePlayers,
          dynamicProjection,
          staticProjection,
          perspectivePlayerId: options.viewer.playerId,
          gameVersion,
          actionSetVersion: "pending",
        });
        const actionSetVersion = computePluginActionSetVersion({
          gameVersion,
          availableInteractions: materialized.availableInteractions,
        });
        const frame = {
          id,
          reducerState: structuredClone(state),
          dynamicProjection,
          staticProjection,
          gameVersion,
          actionSetVersion,
          projectionDigest: digestUIFixtureJson({
            digestVersion: "reducer-scenario-frame@2",
            scenarioId: options.scenarioId,
            frameId: id,
            dynamicProjection,
            staticProjection,
            gameVersion,
            actionSetVersion,
          }),
        } satisfies ReducerScenarioFrame;
        frames.push(frame);
        return frame;
      };

      appendFrame("frame-1");

      for (const operation of operations) {
        const fromFrame = frames[frames.length - 1];
        if (!fromFrame) {
          throw new Error("Reducer scenario runner lost its initial frame.");
        }
        if (operation.operation === "validate") {
          const result = await options.bundle.validateInput({
            state,
            input: operation.input,
          });
          exchanges.push({
            id: operation.id,
            operation: "validate",
            fromFrameId: fromFrame.id,
            input: operation.input,
            result,
          });
          continue;
        }

        const result = await options.bundle.dispatch({
          state,
          input: operation.input,
        });
        if (result.kind === "reject") {
          exchanges.push({
            id: operation.id,
            operation: "submit",
            fromFrameId: fromFrame.id,
            input: operation.input,
            result: {
              kind: "rejected",
              diagnostics: [
                {
                  code: result.errorCode,
                  message: result.message ?? result.errorCode,
                },
              ],
            },
          });
          continue;
        }

        state = structuredClone(result.state);
        gameVersion += 1;
        const toFrame = appendFrame(`frame-${frames.length + 1}`);
        exchanges.push({
          id: operation.id,
          operation: "submit",
          fromFrameId: fromFrame.id,
          input: operation.input,
          result: {
            kind: "accepted",
            toFrameId: toFrame.id,
          },
        });
      }

      return {
        scenarioId: options.scenarioId,
        gameId: options.gameId,
        viewer: options.viewer,
        frames,
        exchanges,
      };
    },
  };
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
