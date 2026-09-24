import type { RuntimePayload, RuntimeTableRecord } from "./table";
import type {
  PhaseNameOfState,
  PlayerIdOfState,
  PlayerIdOfTable,
  RuntimeSetupSelection,
} from "./extract";
// --- Shared authoring primitives ---

/**
 * Declarative choice option. Retained as the shape used by prompt-kind
 * interactions' `options` field (see `InteractionSpec.options` in
 * `model/spec.ts`). Independent of any specific prompt authoring API.
 */
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
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = {
  rng: RuntimeRngState;
  setup: Setup | null;
  simultaneous: RuntimeSimultaneousState<PhaseName, PlayerId>;
  lastTransition: {
    from: PhaseName;
    to: PhaseName;
  } | null;
};

export type ReducerRuntimeStateForState<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = RuntimeState<PhaseNameOfState<State>, PlayerIdOfState<State>, Setup>;

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
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = {
  domain: State;
  runtime: ReducerRuntimeStateForState<State, Setup>;
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

import type {
  GameOutcome as PluginGameOutcome,
  OutcomeResult as PluginOutcomeResult,
  OutcomeScoreComponent as PluginOutcomeScoreComponent,
  OutcomeStanding as PluginOutcomeStanding,
  OutcomeTieBreak as PluginOutcomeTieBreak,
} from "@dreamboard-games/plugin-runtime-contract";

export type OutcomeResult = PluginOutcomeResult;
export type OutcomeScoreComponent = PluginOutcomeScoreComponent;
export type OutcomeTieBreak = PluginOutcomeTieBreak;
export type OutcomeStanding<Player extends string = string> =
  PluginOutcomeStanding<Player>;
export type GameOutcome<Player extends string = string> =
  PluginGameOutcome<Player>;

export type GameEventDetail = {
  label: string;
  value: string | number | boolean;
};

export type SystemActionEvent = {
  kind: "systemAction";
  procedureId: string;
  title: string;
  summary?: string;
  details?: readonly GameEventDetail[];
};

export type GameEvent = SystemActionEvent;

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
