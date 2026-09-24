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
  ViewOfContract,
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
import { rejectResult } from "./trusted-runtime-result";
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
  View extends ViewOfContract<Contract>,
> = ReducerGameDefinition<Contract, Definitions, View>;

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
  View extends ViewOfContract<Contract>,
> = PhaseNamesOfDefinition<TrustedDefinition<Contract, Definitions, View>>;

export type TrustedPlayerId<Contract extends ReducerGameContractLike> =
  PlayerIdOfState<TrustedDomainState<Contract>>;

export type TrustedInput<Contract extends ReducerGameContractLike> =
  TrustedRuntimeInput<TrustedPlayerId<Contract>>;

export type { TrustedErasedPhase } from "./runtime-registry";

export interface TrustedRuntimeScope<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> {
  definition: TrustedDefinition<Contract, Definitions, View>;
  diagnostics: ReducerDiagnosticsEmitter;
  registry: TrustedRuntimeRegistry<Contract, Definitions, View>;
  phaseEntries: ReadonlyArray<
    readonly [
      TrustedPhaseName<Contract, Definitions, View>,
      TrustedErasedPhase<Contract>,
    ]
  >;
  defaultInitialPhase: TrustedPhaseName<Contract, Definitions, View>;
  toDomainState(state: TrustedState<Contract>): TrustedDomainState<Contract>;
  toCombinedState(
    session: TrustedSessionState<Contract>,
  ): TrustedState<Contract>;
  toSessionState(state: TrustedState<Contract>): TrustedSessionState<Contract>;
  phaseRegistryByName(
    phaseName: TrustedPhaseName<Contract, Definitions, View>,
  ): TrustedPhaseRegistry<Contract, Definitions, View> | undefined;
  phaseByName(
    phaseName: TrustedPhaseName<Contract, Definitions, View>,
  ): TrustedErasedPhase<Contract>;
  findInteractionInPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, View>,
    interactionId: string,
  ):
    | AnyInteractionSpec<
        TrustedDomainState<Contract>,
        TrustedManifest<Contract>
      >
    | undefined;
  interactionEntriesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, View>,
  ): ReadonlyArray<TrustedInteractionEntry<Contract>>;

  buildContext(
    state: TrustedState<Contract>,
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>>;
  buildRuntimeArgs<Extra extends object>(
    state: TrustedState<Contract>,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<TrustedDomainState<Contract>>;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>> & {
    q: ReturnType<typeof createStateQueries<TrustedDomainState<Contract>>>;
    runtime: Omit<TrustedState<Contract>["runtime"], "rng">;
    random: RandomHelpers;
  } & RuntimeArgsWithTransaction<TrustedDomainState<Contract>> &
    Extra;
}

export function createTrustedRuntimeScope<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  definition: TrustedDefinition<Contract, Definitions, View>,
  options: { diagnostics?: ReducerDiagnosticsSink } = {},
): TrustedRuntimeScope<Contract, Definitions, View> {
  type DomainState = TrustedDomainState<Contract>;
  type SessionState = TrustedSessionState<Contract>;
  type State = TrustedState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
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
  ): TrustedPhaseRegistry<Contract, Definitions, View> | undefined {
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

  const createTransaction = createReducerEdit<DomainState>();

  function buildContext(state: State): ActionContext<DomainState, Manifest> {
    return buildTrustedContext<Contract>(state, definition.contract.manifest);
  }

  function buildRuntimeArgs<Extra extends object>(
    state: State,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<DomainState>;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ) {
    return buildTrustedRuntimeArgs<Contract, Extra>(
      state,
      definition.contract.manifest,
      createTransaction,
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
