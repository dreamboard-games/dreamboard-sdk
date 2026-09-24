import type {
  RuntimePayload,
  RuntimeTableRecord,
  RuntimeRecord,
} from "./table";
import type {
  PhaseNameOfState,
  PlayerIdOfState,
  PlayerIdOfTable,
} from "./extract";
// --- Shared authoring primitives ---

/** A labeled finite choice. */
export type ChoiceOption<OptionId extends string = string> = {
  id: OptionId;
  label: string;
};

// --- Runtime Flow & State ---

export type RuntimePhaseState = object;

export type PhaseAccessor<
  PhaseStates extends Record<string, object>,
  CurrentPhase extends keyof PhaseStates & string = keyof PhaseStates & string,
> = {
  get<PhaseName extends keyof PhaseStates & string>(
    phaseName: PhaseName,
  ): CurrentPhase extends PhaseName
    ? PhaseStates[PhaseName]
    : PhaseStates[PhaseName] | null;
};

export type PhasePayload<
  PhaseStates extends Record<string, object>,
  CurrentPhase extends keyof PhaseStates & string,
> = PhaseStates[CurrentPhase] & PhaseAccessor<PhaseStates, CurrentPhase>;

export type FlowState<PhaseName extends string, PlayerId extends string> = {
  currentPhase: PhaseName;
  turn: number;
  round: number;
  activePlayers: PlayerId[];
};

export type RuntimeRngState = {
  seed?: number | null;
  cursor: number;
  trace: string[];
  draws: RuntimeRngDraw[];
};

export type RuntimeRngOperationParameter = string | number | boolean;

export type RuntimeRngOperation = {
  kind: string;
  parameters: Record<string, RuntimeRngOperationParameter>;
};

/**
 * Public, persisted identity for one deterministic RNG cursor advance.
 *
 * Sampled values deliberately remain absent. Their consequences are exposed
 * only through the normal public/player projections.
 */
export type RuntimeRngDraw = {
  index: number;
  cursorBefore: number;
  cursorAfter: number;
  operation: RuntimeRngOperation;
};

export type RuntimeSimultaneousSubmission = {
  interactionId: string;
  params: RuntimePayload;
};

export type RuntimeSimultaneousState<
  PhaseName extends string,
  PlayerId extends string,
> = {
  current: {
    phaseName: PhaseName;
    actors: PlayerId[];
    submissions: Partial<Record<PlayerId, RuntimeSimultaneousSubmission>>;
  } | null;
};

// --- Composite State ---

export type RuntimeState<
  PhaseName extends string,
  PlayerId extends string,
  Options extends RuntimeRecord = RuntimeRecord,
> = {
  rng: RuntimeRngState;
  options: Options;
  simultaneous: RuntimeSimultaneousState<PhaseName, PlayerId>;
  pending: Partial<
    Record<
      PlayerId,
      { phaseName: PhaseName; interactionId: string; values: RuntimePayload[] }
    >
  >;
  lastTransition: {
    from: PhaseName;
    to: PhaseName;
  } | null;
};

export type ReducerRuntimeStateForState<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Options extends RuntimeRecord = RuntimeRecord,
> = RuntimeState<PhaseNameOfState<State>, PlayerIdOfState<State>, Options>;

export type ReducerGameState<
  Table extends RuntimeTableRecord,
  PublicState extends object,
  PrivateState extends object,
  HiddenState extends object,
  PhaseState extends RuntimePhaseState,
  PhaseName extends string,
  PhaseStates extends Record<PhaseName, object> = Record<PhaseName, PhaseState>,
> = {
  table: Table;
  publicState: PublicState;
  privateState: Record<PlayerIdOfTable<Table>, PrivateState>;
  hiddenState: HiddenState;
  flow: FlowState<PhaseName, PlayerIdOfTable<Table>>;
  phase: PhaseState & PhaseAccessor<PhaseStates>;
};

export type ReducerSessionState<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Options extends RuntimeRecord = RuntimeRecord,
> = {
  domain: State;
  runtime: ReducerRuntimeStateForState<State, Options>;
};

// --- Results ---

export type ReducerValidationResult =
  | { valid: true }
  | { valid: false; errorCode: string; message?: string };

export type ReducerReject = {
  type: "reject";
  errorCode: string;
  message?: string;
};

import type { GameEvent, GameOutcome } from "../../shared/domain/results";
export type {
  GameEventDetail,
  SystemActionEvent,
  GameEvent,
  OutcomeResult,
  OutcomeScoreComponent,
  OutcomeTieBreak,
  OutcomeStanding,
  GameOutcome,
} from "../../shared/domain/results";

export type ReducerAcceptOptions<State> = {
  transition?: PhaseNameOfState<State>;
  events?: readonly GameEvent[];
};

export type ReducerAccept<State> = {
  type: "accept";
  state: State;
  transition?: PhaseNameOfState<State>;
  events?: readonly GameEvent[];
  terminal?: GameOutcome<PlayerIdOfState<State>>;
};

export type ReducerResult<State> = ReducerAccept<State> | ReducerReject;
