import type { ReducerValidationResult } from "../../reducer/model";
import type * as Wire from "../../shared/runtime-types";
import type { ReducerBundleContract } from "../../shared/worker-contract";

export type ReducerScenarioBundle = Pick<
  ReducerBundleContract,
  "project" | "dispatch" | "boardStatic"
>;

export interface ReducerScenarioViewer {
  readonly seatId: string;
  readonly playerId: string;
}

export interface ReducerScenarioFrame {
  readonly id: string;
  readonly reducerState: Wire.ReducerSessionState;
  readonly dynamicProjection: Wire.SeatProjectionBundle;
  readonly staticProjection?: Wire.BoardStaticProjection | null;
  readonly gameVersion: number;
  readonly actionSetVersion: string;
  readonly projectionDigest: string;
}

export interface ReducerScenarioTrace {
  readonly scenarioId: string;
  readonly gameId: string;
  readonly viewer: ReducerScenarioViewer;
  readonly frames: readonly ReducerScenarioFrame[];
  readonly exchanges: readonly ReducerScenarioExchange[];
}

export type ReducerScenarioExchange =
  | {
      readonly id: string;
      readonly operation: "validate";
      readonly fromFrameId: string;
      readonly input: Wire.GameInput;
      readonly result: ReducerValidationResult;
    }
  | {
      readonly id: string;
      readonly operation: "submit";
      readonly fromFrameId: string;
      readonly input: Wire.GameInput;
      readonly result:
        | {
            readonly kind: "accepted";
            readonly toFrameId: string;
          }
        | {
            readonly kind: "rejected";
            readonly diagnostics: readonly ReducerScenarioDiagnostic[];
          };
    };

export interface ReducerScenarioDiagnostic {
  readonly code: string;
  readonly message: string;
}

export type ReducerScenarioOperation =
  | {
      readonly id: string;
      readonly operation: "validate";
      readonly input: Wire.GameInput;
    }
  | {
      readonly id: string;
      readonly operation: "submit";
      readonly input: Wire.GameInput;
    };

export interface CreateReducerScenarioRunnerOptions {
  readonly scenarioId: string;
  readonly gameId: string;
  readonly initialState: Wire.ReducerSessionState;
  readonly bundle: ReducerScenarioBundle;
  readonly viewer: ReducerScenarioViewer;
  readonly playerIds: readonly string[];
  readonly initialGameVersion?: number;
}

export interface ReducerScenarioRunner {
  run(
    operations: readonly ReducerScenarioOperation[],
  ): Promise<ReducerScenarioTrace>;
}
