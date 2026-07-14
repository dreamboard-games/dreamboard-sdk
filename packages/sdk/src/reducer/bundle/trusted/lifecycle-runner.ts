import { safeParseOrThrow } from "../../parse-utils";
import { applySetupBootstrap } from "../../setup-bootstrap";
import { createStateQueries } from "../../table-queries";
import type {
  ExactManifestContractOf,
  PhaseMapOf,
  ReducerGameContractLike,
  RuntimeSetupSelection,
  RuntimeSetupSelectionInput,
  ViewMapOf,
} from "../../model";
import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import { isPerPlayer } from "../../per-player";
import { normalizeResult } from "./runtime-scope";
import { createMutableRandomHelpers, type RngConsumption } from "./rng-sampler";
import type { createInteractionResolver } from "./interaction-resolver";
import type {
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedSessionState,
  TrustedState,
} from "./runtime-scope";

type InteractionResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createInteractionResolver<Contract, Definitions, Views>>;

export function createLifecycleRunner<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  interactions: InteractionResolverFor<Contract, Definitions, Views>,
) {
  type SessionState = TrustedSessionState<Contract>;
  type State = TrustedState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type ExactManifest = ExactManifestContractOf<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;

  function resolveSelectedSetup(
    setup: RuntimeSetupSelectionInput<Manifest> | null | undefined,
  ): State["runtime"]["setup"] {
    if (!setup) {
      return null;
    }
    const manifestProfile = scope.manifestSetupProfilesById[setup.profileId];
    if (!manifestProfile) {
      throw new Error(`Unknown setup profile '${setup.profileId}'.`);
    }
    const resolvedOptionValues: Record<string, string | null> =
      Object.fromEntries(
        scope.definition.contract.manifest.literals.setupOptionIds.map(
          (optionId: string) => [optionId, null] as const,
        ),
      );

    for (const [optionId, choiceId] of Object.entries(
      manifestProfile.optionValues ?? {},
    ) as Array<[string, string]>) {
      resolvedOptionValues[optionId] = choiceId;
    }
    for (const [optionId, choiceId] of Object.entries(
      setup.optionValues ?? {},
    ) as Array<[string, string]>) {
      resolvedOptionValues[optionId] = choiceId ?? null;
    }

    return {
      profileId: setup.profileId,
      optionValues:
        resolvedOptionValues as RuntimeSetupSelection<Manifest>["optionValues"],
    };
  }

  function resolveInitialPhase(setup: State["runtime"]["setup"]): PhaseName {
    const setupProfile = setup
      ? scope.reducerSetupProfiles[setup.profileId]
      : null;
    const resolvedPhase = (setupProfile?.initialPhase ??
      scope.defaultInitialPhase ??
      scope.phaseEntries[0]?.[0]) as PhaseName | undefined;
    if (!resolvedPhase) {
      throw new Error("Reducer-native games must define at least one phase.");
    }
    if (!scope.definition.phases[resolvedPhase]) {
      throw new Error(`Unknown initial phase '${resolvedPhase}'.`);
    }
    return resolvedPhase;
  }

  function applySelectedSetupBootstrap(state: State): State {
    const setup = state.runtime.setup;
    if (!setup) {
      return state;
    }

    const bootstrap = scope.reducerSetupProfiles[setup.profileId]?.bootstrap;
    if (!bootstrap || bootstrap.length === 0) {
      return state;
    }

    return applySetupBootstrap(state, bootstrap) as State;
  }

  function initPhaseState(
    state: State,
    phaseName: PhaseName,
    playerIds: PlayerId[],
  ): State {
    const phase = scope.phaseByName(phaseName);
    const phaseState = phase.initialState
      ? phase.initialState({
          manifest: scope.definition.contract.manifest,
          state,
          playerIds,
          setup: state.runtime.setup,
        })
      : safeParseOrThrow(phase.state, {}, `phase:${phaseName}:initialState`);
    return {
      ...state,
      phase: safeParseOrThrow(
        phase.state,
        phaseState,
        `phase:${phaseName}`,
      ) as State["phase"],
      flow: {
        ...state.flow,
        currentPhase: phaseName as State["flow"]["currentPhase"],
      },
    };
  }

  function enterPhase({
    state,
    phaseName,
    playerIds,
    event,
  }: {
    state: State;
    phaseName: PhaseName;
    playerIds: PlayerId[];
    event: "initialize" | "transition";
  }): {
    state: State;
    instructions: RuntimeInstructionForState<State>[];
    consumptions: RngConsumption[];
  } {
    const workingState = initPhaseState(state, phaseName, playerIds);
    const phase = scope.phaseByName(phaseName);
    let nextState: State = workingState;
    const instructions: RuntimeInstructionForState<State>[] = [];
    const consumptions: RngConsumption[] = [];
    if (phase.enter) {
      const random = createMutableRandomHelpers(workingState.runtime.rng);
      const entered = normalizeResult(
        phase.enter(
          scope.buildRuntimeArgs(
            workingState,
            {
              event,
              state: scope.toDomainState(workingState),
            },
            { random: random.random },
          ),
        ),
        scope.toDomainState(workingState),
      );
      if (entered.type === "reject") {
        throw new Error(
          entered.message ??
            (event === "initialize"
              ? `Reducer phase '${phaseName}' rejected during initialization.`
              : `Reducer phase '${phaseName}' rejected during phase initialization.`),
        );
      }
      nextState = {
        ...entered.state,
        runtime: { ...workingState.runtime, rng: random.currentRng() },
      } as State;
      consumptions.push(...random.consumptions());
      if (entered.instructions) instructions.push(...entered.instructions);
    }

    const activeStage = interactions.resolveActiveStage(nextState, phaseName);
    if (activeStage?.stage.onEnter) {
      const random = createMutableRandomHelpers(nextState.runtime.rng);
      const stageEntered = normalizeResult(
        activeStage.stage.onEnter(
          scope.buildRuntimeArgs(
            nextState,
            {
              event,
              state: scope.toDomainState(nextState),
            },
            { random: random.random },
          ),
        ),
        scope.toDomainState(nextState),
      );
      if (stageEntered.type === "reject") {
        throw new Error(
          stageEntered.message ??
            (event === "initialize"
              ? `Reducer stage '${phaseName}.${activeStage.id}' rejected during initialization.`
              : `Reducer stage '${phaseName}.${activeStage.id}' rejected during stage initialization.`),
        );
      }
      nextState = {
        ...stageEntered.state,
        runtime: { ...nextState.runtime, rng: random.currentRng() },
      } as State;
      consumptions.push(...random.consumptions());
      if (stageEntered.instructions) {
        instructions.push(...stageEntered.instructions);
      }
    }
    return { state: nextState, instructions, consumptions };
  }

  function initializePhaseResult(
    state: State,
    phaseName: PhaseName,
  ): {
    state: State;
    instructions: RuntimeInstructionForState<State>[];
    consumptions: RngConsumption[];
  } {
    return enterPhase({
      state,
      phaseName,
      playerIds: scope.buildContext(state).playerOrder as PlayerId[],
      event: "transition",
    });
  }

  function createInitialState({
    table,
    playerIds,
    rngSeed,
    setup,
  }: {
    table: State["table"];
    playerIds: PlayerId[];
    rngSeed?: number | null;
    setup?: RuntimeSetupSelectionInput<Manifest> | null;
  }): { state: State; initialPhase: PhaseName } {
    const tableWithManifestDefaults = applyManifestTableDefaults(
      table,
      playerIds,
    );
    const parsedTable = safeParseOrThrow(
      scope.definition.contract.manifest.tableSchema,
      tableWithManifestDefaults,
      "table",
    ) as State["table"];
    const selectedSetup = resolveSelectedSetup(setup);
    const initialSetup =
      selectedSetup as RuntimeSetupSelection<ExactManifest> | null;
    const initialPhase = resolveInitialPhase(selectedSetup);
    const initialQueries = createStateQueries({ table: parsedTable });
    return {
      initialPhase,
      state: {
        table: parsedTable,
        publicState: safeParseOrThrow(
          scope.definition.contract.state.public,
          scope.definition.initial?.public?.({
            manifest: scope.definition.contract.manifest,
            table: parsedTable,
            playerIds,
            rngSeed,
            setup: initialSetup,
            q: initialQueries,
          }) ?? {},
          "publicState",
        ) as State["publicState"],
        privateState: Object.fromEntries(
          playerIds.map((playerId) => [
            playerId,
            safeParseOrThrow(
              scope.definition.contract.state.private,
              scope.definition.initial?.private?.({
                manifest: scope.definition.contract.manifest,
                table: parsedTable,
                playerIds,
                playerId,
                rngSeed,
                setup: initialSetup,
                q: initialQueries,
              }) ?? {},
              `privateState:${playerId}`,
            ),
          ]),
        ) as State["privateState"],
        hiddenState: safeParseOrThrow(
          scope.definition.contract.state.hidden,
          scope.definition.initial?.hidden?.({
            manifest: scope.definition.contract.manifest,
            table: parsedTable,
            playerIds,
            rngSeed,
            setup: initialSetup,
            q: initialQueries,
          }) ?? {},
          "hiddenState",
        ) as State["hiddenState"],
        flow: {
          currentPhase: initialPhase as State["flow"]["currentPhase"],
          turn: 0,
          round: 0,
          activePlayers: [],
        },
        phase: {} as State["phase"],
        runtime: {
          rng: {
            seed: rngSeed ?? null,
            cursor: 0,
            trace: [],
            draws: [],
          },
          setup: selectedSetup,
          simultaneous: { current: null },
          lastTransition: null,
        } as State["runtime"],
      },
    };
  }

  function applyManifestTableDefaults(
    table: State["table"],
    playerIds: PlayerId[],
  ): State["table"] {
    const manifest = scope.definition.contract.manifest;
    const defaultZones = manifest.defaults.zones(playerIds);
    const tableZones = table.zones ?? {};
    const tableResources = table.resources;
    return {
      ...table,
      playerOrder:
        table.playerOrder && table.playerOrder.length > 0
          ? table.playerOrder
          : playerIds,
      zones: {
        ...defaultZones,
        ...tableZones,
        shared: {
          ...(defaultZones.shared ?? {}),
          ...(tableZones.shared ?? {}),
        },
        perPlayer: {
          ...(defaultZones.perPlayer ?? {}),
          ...(tableZones.perPlayer ?? {}),
        },
        visibility: {
          ...(defaultZones.visibility ?? {}),
          ...(tableZones.visibility ?? {}),
        },
        cardSetIdsByZoneId: {
          ...(defaultZones.cardSetIdsByZoneId ?? {}),
          ...(tableZones.cardSetIdsByZoneId ?? {}),
        },
      },
      decks: {
        ...manifest.defaults.decks(playerIds),
        ...table.decks,
      },
      hands: {
        ...manifest.defaults.hands(playerIds),
        ...table.hands,
      },
      handVisibility: {
        ...manifest.defaults.handVisibility(playerIds),
        ...table.handVisibility,
      },
      ownerOfCard: {
        ...manifest.defaults.ownerOfCard(playerIds),
        ...table.ownerOfCard,
      },
      visibility: {
        ...manifest.defaults.visibility(playerIds),
        ...table.visibility,
      },
      resources:
        isPerPlayer(tableResources) && tableResources.entries.length > 0
          ? tableResources
          : manifest.defaults.resources(playerIds),
    } as State["table"];
  }

  function initializeSession(
    input: {
      table: State["table"];
      playerIds: PlayerId[];
      rngSeed?: number | null;
      setup?: RuntimeSetupSelectionInput<Manifest> | null;
    },
    drainInstructions: (
      state: State,
      instructions: RuntimeInstructionForState<State>[],
    ) => State,
  ): SessionState {
    const initial = createInitialState(input);
    const bootstrappedState = applySelectedSetupBootstrap(initial.state);
    const entered = enterPhase({
      state: bootstrappedState,
      phaseName: initial.initialPhase,
      playerIds: input.playerIds,
      event: "initialize",
    });
    return scope.toSessionState(
      drainInstructions(entered.state, entered.instructions),
    );
  }

  return {
    createInitialState,
    enterPhase,
    initializePhaseResult,
    initializeSession,
    initPhaseState,
    resolveInitialPhase,
    resolveSelectedSetup,
  };
}
