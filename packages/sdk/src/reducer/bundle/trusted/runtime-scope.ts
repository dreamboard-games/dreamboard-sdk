import { createReducerEdit } from "../../transaction";
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
  ExactManifestContractOf,
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

export type { ManifestContractOf as TrustedManifest } from "../../model/extract.js";

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
  manifest: ManifestContractOf<Contract> & ExactManifestContractOf<Contract>;
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
        ManifestContractOf<Contract>
      >
    | undefined;
  interactionEntriesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, View>,
  ): ReadonlyArray<TrustedInteractionEntry<Contract>>;

  buildContext(
    state: TrustedState<Contract>,
  ): ActionContext<TrustedDomainState<Contract>, ManifestContractOf<Contract>>;
  buildRuntimeArgs<Extra extends object>(
    state: TrustedState<Contract>,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<
        TrustedDomainState<Contract>,
        ManifestContractOf<Contract>
      >;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ): ActionContext<
    TrustedDomainState<Contract>,
    ManifestContractOf<Contract>
  > & {
    q: TableQueriesOfState<
      TrustedDomainState<Contract>,
      ManifestContractOf<Contract>
    >;
    runtime: Omit<TrustedState<Contract>["runtime"], "rng">;
    random: RandomHelpers;
  } & RuntimeArgsWithTransaction<
      TrustedDomainState<Contract>,
      ManifestContractOf<Contract>
    > &
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
  type Manifest = ManifestContractOf<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  // The manifest is supplied by this same Contract. Bind its conditional
  // table and identity projections once at the runtime composition boundary.
  const manifest = definition.contract
    .manifest as ManifestContractOf<Contract> &
    ExactManifestContractOf<Contract>;
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

  const createTransaction = createReducerEdit<DomainState, Manifest>(manifest);

  function buildContext(state: State): ActionContext<DomainState, Manifest> {
    return buildTrustedContext<Contract>(state, manifest);
  }

  function buildRuntimeArgs<Extra extends object>(
    state: State,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<DomainState, Manifest>;
      random?: import("./rng-sampler").MutableRandomHelpers;
    },
  ) {
    return buildTrustedRuntimeArgs<Contract, Extra>(
      state,
      manifest,
      createTransaction,
      toDomainState,
      extra,
      options,
    );
  }

  return {
    definition,
    manifest,
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
