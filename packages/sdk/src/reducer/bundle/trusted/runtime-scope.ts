import { createDerivedResolver } from "../../derived";
import type { DerivedResolver } from "../../derived";
import { createReducerEdit } from "../../transaction";
import { createStateQueries } from "../../table-queries";
import type { TrustedRuntimeInput } from "../../core/types";
import { createReducerDiagnosticsEmitter } from "../../diagnostics";
import type {
  ReducerDiagnosticsEmitter,
  ReducerDiagnosticsSink,
} from "../../diagnostics";
import type {
  AnyInteractionSpec,
  BaseGameSessionOfContract,
  BaseGameStateOfContract,
  ManifestContractOf,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  PlayerIdOfState,
  ReducerGameContractLike,
  ReducerGameDefinition,
  TableQueriesOfState,
  GameOutcome,
  GameEvent,
  ReducerAcceptOptions,
  ViewMapOf,
} from "../../model";
import type {
  ActionContext,
  RandomHelpers,
} from "../../model/spec/runtime-args";
import {
  collectTrustedRuntimeRegistry,
  type TrustedErasedPhase,
  type TrustedInteractionEntry,
  type TrustedPhaseRegistry,
  type TrustedRuntimeRegistry,
} from "./runtime-registry";
import {
  buildContext as buildTrustedContext,
  buildRuntimeArgs as buildTrustedRuntimeArgs,
  type RuntimeArgsWithTransaction,
} from "./trusted-runtime-args";
import { rejectResult, runtimeResultHelpers } from "./trusted-runtime-result";
import {
  toCombinedState as codecToCombinedState,
  toDomainState as codecToDomainState,
  toSessionState as codecToSessionState,
} from "./trusted-state-codec";

export { normalizeResult } from "./trusted-runtime-result";
export { rejectResult };

export type TrustedDefinition<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReducerGameDefinition<Contract, Definitions, Views>;

export type TrustedDomainState<Contract extends ReducerGameContractLike> =
  BaseGameStateOfContract<Contract>;

export type TrustedSessionState<Contract extends ReducerGameContractLike> =
  BaseGameSessionOfContract<Contract>;

export type TrustedState<Contract extends ReducerGameContractLike> =
  TrustedDomainState<Contract> & {
    runtime: TrustedSessionState<Contract>["runtime"];
  };

export type TrustedManifest<Contract extends ReducerGameContractLike> =
  ManifestContractOf<Contract>;

export type TrustedPhaseName<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = PhaseNamesOfDefinition<TrustedDefinition<Contract, Definitions, Views>>;

export type TrustedPlayerId<Contract extends ReducerGameContractLike> =
  PlayerIdOfState<TrustedDomainState<Contract>>;

export type TrustedInput<Contract extends ReducerGameContractLike> =
  TrustedRuntimeInput<TrustedPlayerId<Contract>>;

export type { TrustedErasedPhase } from "./runtime-registry";

export interface TrustedRuntimeHelpers<
  Contract extends ReducerGameContractLike,
> {
  accept: (
    state: TrustedDomainState<Contract>,
    options?: ReducerAcceptOptions<TrustedDomainState<Contract>>,
  ) => {
    type: "accept";
    state: TrustedDomainState<Contract>;
    transition?: import("../../model").PhaseNameOfState<
      TrustedDomainState<Contract>
    >;
    events: GameEvent[];
  };
  endGame: (
    state: TrustedDomainState<Contract>,
    outcome: GameOutcome<TrustedPlayerId<Contract>>,
    options?: ReducerAcceptOptions<TrustedDomainState<Contract>>,
  ) => {
    type: "accept";
    state: TrustedDomainState<Contract>;
    transition?: import("../../model").PhaseNameOfState<
      TrustedDomainState<Contract>
    >;
    events: GameEvent[];
    terminal: GameOutcome<TrustedPlayerId<Contract>>;
  };
  reject: typeof rejectResult;
  edit: ReturnType<typeof createReducerEdit<TrustedDomainState<Contract>>>;
}

export interface TrustedRuntimeScope<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> {
  definition: TrustedDefinition<Contract, Definitions, Views>;
  diagnostics: ReducerDiagnosticsEmitter;
  registry: TrustedRuntimeRegistry<Contract, Definitions, Views>;
  phaseEntries: ReadonlyArray<
    readonly [
      TrustedPhaseName<Contract, Definitions, Views>,
      TrustedErasedPhase<Contract>,
    ]
  >;
  defaultInitialPhase: TrustedPhaseName<Contract, Definitions, Views>;
  runtimeHelpers: TrustedRuntimeHelpers<Contract>;
  toDomainState(state: TrustedState<Contract>): TrustedDomainState<Contract>;
  toCombinedState(
    session: TrustedSessionState<Contract>,
  ): TrustedState<Contract>;
  toSessionState(state: TrustedState<Contract>): TrustedSessionState<Contract>;
  phaseRegistryByName(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): TrustedPhaseRegistry<Contract, Definitions, Views> | undefined;
  phaseByName(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): TrustedErasedPhase<Contract>;
  findInteractionInPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
    interactionId: string,
  ):
    | AnyInteractionSpec<
        TrustedDomainState<Contract>,
        TrustedManifest<Contract>
      >
    | undefined;
  interactionEntriesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): ReadonlyArray<TrustedInteractionEntry<Contract>>;
  buildContext(
    state: TrustedState<Contract>,
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>>;
  buildRuntimeArgs<Extra extends object>(
    state: TrustedState<Contract>,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<TrustedDomainState<Contract>>;
      derived?: DerivedResolver;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>> &
    TrustedRuntimeHelpers<Contract> & {
      q: ReturnType<typeof createStateQueries<TrustedDomainState<Contract>>>;
      derived: ReturnType<
        typeof createDerivedResolver<TrustedDomainState<Contract>>
      >;
      runtime: Omit<TrustedState<Contract>["runtime"], "rng">;
      random: RandomHelpers;
    } & RuntimeArgsWithTransaction<TrustedDomainState<Contract>> &
    Extra;
}

export function createTrustedRuntimeScope<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: TrustedDefinition<Contract, Definitions, Views>,
  options: { diagnostics?: ReducerDiagnosticsSink } = {},
): TrustedRuntimeScope<Contract, Definitions, Views> {
  type DomainState = TrustedDomainState<Contract>;
  type SessionState = TrustedSessionState<Contract>;
  type State = TrustedState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  const registry = collectTrustedRuntimeRegistry(definition);
  const { phaseEntries } = registry;
  const defaultInitialPhase = definition.initialPhase ?? phaseEntries[0]?.[0];
  if (!defaultInitialPhase) {
    throw new Error("Reducer-native games must define at least one phase.");
  }

  function toDomainState(state: State): DomainState {
    return codecToDomainState<State, DomainState>(state);
  }

  function toCombinedState(session: SessionState): State {
    return codecToCombinedState<SessionState, State>(session);
  }

  function toSessionState(state: State): SessionState {
    return codecToSessionState<State, DomainState, SessionState>(
      state,
      toDomainState,
    );
  }

  function phaseRegistryByName(
    phaseName: PhaseName,
  ): TrustedPhaseRegistry<Contract, Definitions, Views> | undefined {
    return registry.phasesByName.get(phaseName);
  }

  function phaseByName(phaseName: PhaseName): TrustedErasedPhase<Contract> {
    const phaseRegistry = phaseRegistryByName(phaseName);
    if (!phaseRegistry) {
      throw new Error(`Unknown reducer phase '${phaseName}'.`);
    }
    return phaseRegistry.phase;
  }

  function findInteractionInPhase(
    phaseName: PhaseName,
    interactionId: string,
  ): AnyInteractionSpec<DomainState, Manifest> | undefined {
    const found = interactionEntriesForPhase(phaseName).find(
      ([id]) => id === interactionId,
    );
    return found?.[1];
  }

  function interactionEntriesForPhase(phaseName: PhaseName) {
    return phaseRegistryByName(phaseName)?.interactions ?? [];
  }

  const helpers: TrustedRuntimeHelpers<Contract> = {
    ...runtimeResultHelpers,
    edit: createReducerEdit<DomainState>(),
  };

  function buildContext(state: State): ActionContext<DomainState, Manifest> {
    return buildTrustedContext<Contract>(state, definition.contract.manifest);
  }

  function buildRuntimeArgs<Extra extends object>(
    state: State,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<DomainState>;
      derived?: DerivedResolver;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ) {
    return buildTrustedRuntimeArgs<Contract, Extra>(
      state,
      definition.contract.manifest,
      helpers,
      toDomainState,
      extra,
      options,
    );
  }

  return {
    definition,
    diagnostics: createReducerDiagnosticsEmitter(options.diagnostics),
    registry,
    phaseEntries,
    defaultInitialPhase,
    runtimeHelpers: helpers,
    toDomainState,
    toCombinedState,
    toSessionState,
    phaseRegistryByName,
    phaseByName,
    findInteractionInPhase,
    interactionEntriesForPhase,
    buildContext,
    buildRuntimeArgs,
  };
}
