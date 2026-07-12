import type { DispatchTraceEntry, TrustedRuntimeInput } from "../core/types";
import type {
  GameEvent,
  GameOutcome,
  BaseGameStateOfContract,
  BaseGameSessionOfContract,
  ManifestContractOf,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  PlayerIdOfState,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ReducerReject,
  ReducerValidationResult,
  RuntimeSetupSelectionInput,
  ViewMapOf,
} from "../model";
import type { RuntimeInstructionForState } from "../core/runtime-instruction";
import type {
  ReducerBundleContract,
  Wire,
} from "@dreamboard-games/reducer-contract";
import type {
  InteractionActionabilityResult,
  InteractionExplanation,
  InteractionInputEnumerationResult,
} from "./trusted/interaction-types";
import type { ReducerDiagnosticsSink } from "../diagnostics";
import type { InteractionDiagnosticsMode } from "./trusted/interaction-types";

export type ReducerBundleOptions = {
  /**
   * Host-owned reducer diagnostics sink. Events are summarized and must not
   * contain reducer state.
   *
   * The legacy `"verbose"` value is retained as an additive alias for
   * descriptorDiagnostics while existing callers migrate.
   */
  diagnostics?: ReducerDiagnosticsSink | InteractionDiagnosticsMode;
  descriptorDiagnostics?: InteractionDiagnosticsMode;
};

type TrustedSessionState<Contract extends ReducerGameContractLike> =
  BaseGameSessionOfContract<Contract>;

type TrustedCombinedState<Contract extends ReducerGameContractLike> =
  BaseGameStateOfContract<Contract> & {
    runtime: TrustedSessionState<Contract>["runtime"];
  };

type TrustedPlayerId<Contract extends ReducerGameContractLike> =
  PlayerIdOfState<BaseGameStateOfContract<Contract>>;

type ProjectionTimingMetadata = {
  resolveAvailableInteractionsMs: number;
  resolveViewMs: number;
  resolveZoneHandlesMs: number;
  descriptorHashMs: number;
};

export type TrustedReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = {
  initialize(input: {
    table: BaseGameStateOfContract<Contract>["table"];
    playerIds: TrustedPlayerId<Contract>[];
    rngSeed?: number | null;
    setup?: RuntimeSetupSelectionInput<ManifestContractOf<Contract>> | null;
  }): Promise<TrustedSessionState<Contract>>;
  initializePhase(input: {
    state: TrustedSessionState<Contract>;
    to: PhaseNamesOfDefinition<
      ReducerGameDefinition<Contract, Definitions, Views>
    >;
  }): Promise<TrustedSessionState<Contract>>;
  validateInput(input: {
    state: TrustedSessionState<Contract>;
    input: TrustedRuntimeInput<TrustedPlayerId<Contract>>;
  }): Promise<ReducerValidationResult>;
  explainInteraction(input: {
    state: TrustedSessionState<Contract>;
    playerId: TrustedPlayerId<Contract>;
    interactionId: string;
  }): InteractionExplanation;
  resolveInteractionActionability(input: {
    state: TrustedSessionState<Contract>;
    playerId: TrustedPlayerId<Contract>;
    interactionId: string;
  }): InteractionActionabilityResult;
  enumerateInteractionParams(input: {
    state: TrustedSessionState<Contract>;
    playerId: TrustedPlayerId<Contract>;
    interactionId: string;
    maxEvaluations: number;
  }): InteractionInputEnumerationResult;
  reduce(input: {
    state: TrustedSessionState<Contract>;
    input: TrustedRuntimeInput<TrustedPlayerId<Contract>>;
  }): Promise<
    | ReducerReject
    | {
        type: "accept";
        state: TrustedSessionState<Contract>;
        instructions: readonly RuntimeInstructionForState<
          TrustedCombinedState<Contract>
        >[];
        events: readonly GameEvent[];
        terminal?: GameOutcome<TrustedPlayerId<Contract>>;
      }
  >;
  dispatch(input: {
    state: TrustedSessionState<Contract>;
    input: TrustedRuntimeInput<TrustedPlayerId<Contract>>;
  }): Promise<
    | ReducerReject
    | {
        type: "accept";
        state: TrustedSessionState<Contract>;
        trace: readonly DispatchTraceEntry<
          TrustedCombinedState<Contract>,
          TrustedPlayerId<Contract>
        >[];
        events: readonly GameEvent[];
        terminal?: GameOutcome<TrustedPlayerId<Contract>>;
      }
  >;
  projectStatic(): {
    view: unknown;
    hash: string;
    manifestVersion: string;
  } | null;
  projectSeatsDynamic(input: {
    state: TrustedSessionState<Contract>;
    playerIds: TrustedPlayerId<Contract>[];
    projectionMode?: "full" | "actionsOnly";
  }): {
    currentStage: string | null;
    stageSeats: string[];
    simultaneousPhase: {
      phaseName: string;
      interactionId: string;
      actorIds: string[];
      sealedPlayerIds: string[];
      pendingPlayerIds: string[];
    } | null;
    schedulerFlow: Wire.SchedulerFlowAuthorityProjection;
    sharedView?: unknown;
    seats: Record<
      string,
      {
        view?: unknown;
        availableInteractionRefs: unknown;
        zones?: unknown;
      }
    >;
    interactionsByRef: Record<string, unknown>;
    timing: ProjectionTimingMetadata;
  };
};

export type ReducerBundle = ReducerBundleContract & {
  createInProcessRuntime(): {
    initialize(input: {
      table: unknown;
      playerIds: string[];
      rngSeed?: number | null;
      setup?: unknown;
    }): Promise<void>;
    hydrate(input: { state: unknown }): void;
    dispatch(input: {
      input: unknown;
    }): Promise<
      | { kind: "accept" }
      | { kind: "accept"; state: unknown; trace: unknown[] }
      | { kind: "reject"; errorCode: string; message?: string }
    >;
    projectSeatsDynamic(input: {
      playerIds: unknown[];
      projectionMode?: "full" | "actionsOnly";
    }): {
      currentStage: string | null;
      stageSeats: string[];
      simultaneousPhase: {
        phaseName: string;
        interactionId: string;
        actorIds: string[];
        sealedPlayerIds: string[];
        pendingPlayerIds: string[];
      } | null;
      schedulerFlow: Wire.SchedulerFlowAuthorityProjection;
      sharedView?: unknown;
      seats: Record<
        string,
        {
          view?: unknown;
          availableInteractionRefs: unknown;
          zones?: unknown;
        }
      >;
      interactionsByRef: Record<string, unknown>;
      timing: ProjectionTimingMetadata;
    };
    explainInteraction(input: {
      playerId: unknown;
      interactionId: string;
    }): InteractionExplanation;
    snapshot(): unknown;
    unsafeState(): unknown;
  };
  explainInteraction(input: {
    state: unknown;
    playerId: unknown;
    interactionId: string;
  }): InteractionExplanation;
};

/**
 * SDK-internal extension used by scenario inspection and exploration.
 * The runtime operations stay off the author-facing `ReducerBundle` type.
 */
export type ReducerBundleTestingRuntime = Omit<
  ReducerBundle,
  "createInProcessRuntime"
> & {
  createInProcessRuntime(): ReturnType<
    ReducerBundle["createInProcessRuntime"]
  > & {
    resolveInteractionActionability(input: {
      playerId: unknown;
      interactionId: string;
    }): InteractionActionabilityResult;
    enumerateInteractionParams(input: {
      playerId: unknown;
      interactionId: string;
      maxEvaluations: number;
    }): InteractionInputEnumerationResult;
  };
  resolveInteractionActionability(input: {
    state: unknown;
    playerId: unknown;
    interactionId: string;
  }): InteractionActionabilityResult;
  enumerateInteractionParams(input: {
    state: unknown;
    playerId: unknown;
    interactionId: string;
    maxEvaluations: number;
  }): InteractionInputEnumerationResult;
};
