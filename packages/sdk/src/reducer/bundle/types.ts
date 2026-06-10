import type { DispatchTraceEntry, TrustedRuntimeInput } from "../core/types";
import type {
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
import type { ReducerBundleContract } from "@dreamboard-games/reducer-contract";

type TrustedSessionState<Contract extends ReducerGameContractLike> =
  BaseGameSessionOfContract<Contract>;

type TrustedCombinedState<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
> = BaseGameStateOfContract<Contract> & {
  runtime: TrustedSessionState<Contract>["runtime"];
};

type TrustedPlayerId<
  Contract extends ReducerGameContractLike,
  _Definitions extends PhaseMapOf<Contract>,
> = PlayerIdOfState<BaseGameStateOfContract<Contract>>;

export type TrustedReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = {
  initialize(input: {
    table: BaseGameStateOfContract<Contract>["table"];
    playerIds: TrustedPlayerId<Contract, Definitions>[];
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
    input: TrustedRuntimeInput<TrustedPlayerId<Contract, Definitions>>;
  }): Promise<ReducerValidationResult>;
  reduce(input: {
    state: TrustedSessionState<Contract>;
    input: TrustedRuntimeInput<TrustedPlayerId<Contract, Definitions>>;
  }): Promise<
    | ReducerReject
    | {
        type: "accept";
        state: TrustedSessionState<Contract>;
        instructions: RuntimeInstructionForState<
          TrustedCombinedState<Contract, Definitions>
        >[];
      }
  >;
  dispatch(input: {
    state: TrustedSessionState<Contract>;
    input: TrustedRuntimeInput<TrustedPlayerId<Contract, Definitions>>;
  }): Promise<
    | ReducerReject
    | {
        type: "accept";
        state: TrustedSessionState<Contract>;
        trace: DispatchTraceEntry<
          TrustedCombinedState<Contract, Definitions>,
          TrustedPlayerId<Contract, Definitions>
        >[];
      }
  >;
  projectStatic(): {
    view: unknown;
    hash: string;
    manifestVersion: string;
  } | null;
  projectSeatsDynamic(input: {
    state: TrustedSessionState<Contract>;
    playerIds: TrustedPlayerId<Contract, Definitions>[];
    viewId?: string;
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
    seats: Record<
      string,
      {
        view?: unknown;
        availableInteractionRefs: unknown;
        zones?: unknown;
      }
    >;
    interactionsByRef: Record<string, unknown>;
  };
  projectSeatViewDynamic(input: {
    state: TrustedSessionState<Contract>;
    playerId: TrustedPlayerId<Contract, Definitions>;
    viewId?: string;
  }): unknown;
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
    projectSeatViewDynamic(input: {
      playerId: unknown;
      viewId?: string;
    }): unknown;
    projectSeatsDynamic(input: {
      playerIds: unknown[];
      viewId?: string;
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
      seats: Record<
        string,
        {
          view?: unknown;
          availableInteractionRefs: unknown;
          zones?: unknown;
        }
      >;
      interactionsByRef: Record<string, unknown>;
    };
    snapshot(): unknown;
    unsafeState(): unknown;
  };
  projectSeatViewDynamic(input: {
    state: unknown;
    playerId: unknown;
    viewId?: string;
  }): unknown;
};
