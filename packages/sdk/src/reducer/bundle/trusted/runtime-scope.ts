import { createDerivedResolver } from "../../derived";
import type { DerivedResolver } from "../../derived";
import { createReducerFx } from "../../effects";
import { createReducerOps } from "../../ops";
import { createReducerEdit } from "../../transaction";
import { createStateQueries } from "../../table-queries";
import type { TrustedRuntimeInput } from "../../core/types";
import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import { createReducerDiagnosticsEmitter } from "../../diagnostics";
import type {
  ReducerDiagnosticsEmitter,
  ReducerDiagnosticsSink,
} from "../../diagnostics";
import type {
  ActionContext,
  AnyContinuationCallable,
  AnyInteractionSpec,
  BaseGameSessionOfContract,
  BaseGameStateOfContract,
  ManifestContractOf,
  PhaseMapOf,
  PhaseNamesOfDefinition,
  PlayerIdOfState,
  PlayerZoneIdOfManifest,
  RandomHelpers,
  ReducerGameContractLike,
  ReducerGameDefinition,
  StageSpec,
  TableQueriesOfState,
  TerminalOutcome,
  ViewMapOf,
} from "../../model";
import {
  collectTrustedRuntimeRegistry,
  type TrustedErasedPhase,
  type TrustedCardActionEntry,
  type TrustedInteractionEntry,
  type TrustedPhaseRegistry,
  type TrustedRuntimeRegistry,
} from "./runtime-registry";
import {
  buildContext as buildTrustedContext,
  buildRuntimeArgs as buildTrustedRuntimeArgs,
  fxForState as trustedFxForState,
} from "./trusted-runtime-args";
import { rejectResult, runtimeResultHelpers } from "./trusted-runtime-result";
import {
  toCombinedState as codecToCombinedState,
  toDomainState as codecToDomainState,
  toSessionState as codecToSessionState,
} from "./trusted-state-codec";
import {
  resolveDefaultInitialPhase,
  resolveTrustedSetupProfiles,
} from "./trusted-setup-profiles";

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
    instructions?: Array<
      RuntimeInstructionForState<TrustedDomainState<Contract>>
    >,
  ) => {
    type: "accept";
    state: TrustedDomainState<Contract>;
    instructions: Array<
      RuntimeInstructionForState<TrustedDomainState<Contract>>
    >;
  };
  endGame: (
    state: TrustedDomainState<Contract>,
    outcome: TerminalOutcome<TrustedPlayerId<Contract>>,
    instructions?: Array<
      RuntimeInstructionForState<TrustedDomainState<Contract>>
    >,
  ) => {
    type: "accept";
    state: TrustedDomainState<Contract>;
    instructions: Array<
      RuntimeInstructionForState<TrustedDomainState<Contract>>
    >;
    terminal: TerminalOutcome<TrustedPlayerId<Contract>>;
  };
  reject: typeof rejectResult;
  ops: ReturnType<typeof createReducerOps<TrustedDomainState<Contract>>>;
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
  manifestSetupProfilesById: TrustedManifest<Contract>["setupProfilesById"];
  reducerSetupProfiles: NonNullable<
    TrustedDefinition<Contract, Definitions, Views>["setupProfiles"]
  >;
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
  stagesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): ReadonlyArray<
    readonly [
      string,
      StageSpec<TrustedDomainState<Contract>, TrustedManifest<Contract>>,
    ]
  >;
  zonesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): ReadonlyArray<PlayerZoneIdOfManifest<TrustedManifest<Contract>>>;
  cardActionEntriesForPhase(
    phaseName: TrustedPhaseName<Contract, Definitions, Views>,
  ): ReadonlyArray<TrustedCardActionEntry<Contract>>;
  continuationById(
    id: string,
  ): AnyContinuationCallable<TrustedDomainState<Contract>> | undefined;
  fxForState(): ReturnType<typeof createReducerFx<TrustedState<Contract>>>;
  buildContext(
    state: TrustedState<Contract>,
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>>;
  buildRuntimeArgs<Extra extends object>(
    state: TrustedState<Contract>,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<TrustedDomainState<Contract>>;
      derived?: DerivedResolver;
      fx?: ReturnType<typeof createReducerFx<TrustedState<Contract>>>;
      random?: RandomHelpers;
    },
  ): ActionContext<TrustedDomainState<Contract>, TrustedManifest<Contract>> &
    TrustedRuntimeHelpers<Contract> & {
      fx: ReturnType<typeof createReducerFx<TrustedState<Contract>>>;
      q: ReturnType<typeof createStateQueries<TrustedDomainState<Contract>>>;
      derived: ReturnType<
        typeof createDerivedResolver<TrustedDomainState<Contract>>
      >;
      runtime: Omit<TrustedState<Contract>["runtime"], "rng">;
      random: RandomHelpers;
    } & Extra;
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
  const defaultInitialPhase = resolveDefaultInitialPhase(
    definition.initialPhase as PhaseName | undefined,
    phaseEntries,
  );
  const { manifestSetupProfilesById, reducerSetupProfiles } =
    resolveTrustedSetupProfiles(definition);

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

  function stagesForPhase(phaseName: PhaseName) {
    return phaseRegistryByName(phaseName)?.stages ?? [];
  }

  function zonesForPhase(phaseName: PhaseName) {
    return phaseRegistryByName(phaseName)?.zones ?? [];
  }

  function cardActionEntriesForPhase(phaseName: PhaseName) {
    return phaseRegistryByName(phaseName)?.cardActions ?? [];
  }

  function continuationById(id: string) {
    return registry.continuationsById.get(id);
  }

  const helpers: TrustedRuntimeHelpers<Contract> = {
    ...runtimeResultHelpers,
    ops: createReducerOps<DomainState>(),
    edit: createReducerEdit<DomainState>(),
  };

  function fxForState() {
    return trustedFxForState<Contract>();
  }

  function buildContext(state: State): ActionContext<DomainState, Manifest> {
    return buildTrustedContext<Contract>(state, definition.contract.manifest);
  }

  function buildRuntimeArgs<Extra extends object>(
    state: State,
    extra: Extra,
    options?: {
      q?: TableQueriesOfState<DomainState>;
      derived?: DerivedResolver;
      fx?: ReturnType<typeof createReducerFx<State>>;
      random?: RandomHelpers;
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
    manifestSetupProfilesById,
    reducerSetupProfiles: reducerSetupProfiles as NonNullable<
      TrustedDefinition<Contract, Definitions, Views>["setupProfiles"]
    >,
    runtimeHelpers: helpers,
    toDomainState,
    toCombinedState,
    toSessionState,
    phaseRegistryByName,
    phaseByName,
    findInteractionInPhase,
    interactionEntriesForPhase,
    stagesForPhase,
    zonesForPhase,
    cardActionEntriesForPhase,
    continuationById,
    fxForState,
    buildContext,
    buildRuntimeArgs,
  };
}
