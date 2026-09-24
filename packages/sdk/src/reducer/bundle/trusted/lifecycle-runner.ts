import { implicitResultOf } from "./trusted-runtime-args";
import { safeParseOrThrow } from "../../parse-utils";
import { createStateQueries } from "../../table-queries";
import type {
  GameEvent,
  GameOutcome,
  PhaseMapOf,
  ReducerGameContractLike,
  OptionsOfContract,
  ViewOfContract,
} from "../../model";
import { isPerPlayer } from "../../per-player";
import { normalizeResult } from "./runtime-scope";
import { createMutableRandomHelpers, type RngConsumption } from "./rng-sampler";
import type {
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedSessionState,
  TrustedState,
} from "./runtime-scope";

export function createLifecycleRunner<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(scope: TrustedRuntimeScope<Contract, Definitions, View>) {
  type SessionState = TrustedSessionState<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  type PlayerId = TrustedPlayerId<Contract>;

  function resolveInitialPhase(): PhaseName {
    const resolvedPhase = (scope.defaultInitialPhase ??
      scope.phaseEntries[0]?.[0]) as PhaseName | undefined;
    if (!resolvedPhase) {
      throw new Error("Reducer-native games must define at least one phase.");
    }
    if (!scope.definition.phases[resolvedPhase]) {
      throw new Error(`Unknown initial phase '${resolvedPhase}'.`);
    }
    return resolvedPhase;
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
          options: state.runtime.options,
        })
      : safeParseOrThrow(phase.state, {}, `phase:${phaseName}:initialState`);
    return {
      ...state,
      phase: safeParseOrThrow(
        phase.state,
        phaseState,
        `phase:${phaseName}`,
      ) as State["phase"],
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
    transition?: PhaseName;
    consumptions: RngConsumption[];
    terminal?: GameOutcome<PlayerId>;
    events: GameEvent[];
  } {
    const enteringState = {
      ...state,
      flow: {
        ...state.flow,
        currentPhase: phaseName as State["flow"]["currentPhase"],
      },
      runtime: {
        ...state.runtime,
        pending: {},
        simultaneous: { current: null },
        lastTransition:
          event === "initialize"
            ? null
            : {
                from: state.flow.currentPhase,
                to: phaseName as State["flow"]["currentPhase"],
              },
      },
    } as State;
    const workingState = initPhaseState(enteringState, phaseName, playerIds);
    const phase = scope.phaseByName(phaseName);
    let nextState: State = workingState;
    let transition: PhaseName | undefined;
    const consumptions: RngConsumption[] = [];
    let terminal: GameOutcome<PlayerId> | undefined;
    const events: GameEvent[] = [];
    if (phase.enter) {
      const random = createMutableRandomHelpers(workingState.runtime.rng);
      const enterArgs = scope.buildRuntimeArgs(
        workingState,
        {
          event,
          state: scope.toDomainState(workingState),
        },
        { random },
      );
      const entered = normalizeResult(phase.enter(enterArgs), () =>
        implicitResultOf(enterArgs),
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
      terminal ??= entered.terminal;
      events.push(...(entered.events ?? []));
      consumptions.push(...random.consumptions());
      transition = entered.transition as PhaseName | undefined;
    }

    return {
      state: nextState,
      transition,
      consumptions,
      ...(terminal ? { terminal } : {}),
      events,
    };
  }

  function initializePhaseResult(
    state: State,
    phaseName: PhaseName,
  ): {
    state: State;
    transition?: PhaseName;
    consumptions: RngConsumption[];
    terminal?: GameOutcome<PlayerId>;
    events: GameEvent[];
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
    options,
  }: {
    table: State["table"];
    playerIds: PlayerId[];
    rngSeed?: number | null;
    options: OptionsOfContract<Contract>;
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
    const initialPhase = resolveInitialPhase();
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
            options,
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
                options,
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
            options,
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
          options,
          pending: {},
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
      options: OptionsOfContract<Contract>;
    },
    complete: (
      result: ReturnType<typeof enterPhase>,
      entries: number,
    ) => {
      state: State;
      terminal?: GameOutcome<PlayerId>;
      events: GameEvent[];
    },
  ): {
    state: SessionState;
    terminal?: GameOutcome<PlayerId>;
    events: GameEvent[];
  } {
    const initial = createInitialState(input);
    const entered = enterPhase({
      state: initial.state,
      phaseName: initial.initialPhase,
      playerIds: input.playerIds,
      event: "initialize",
    });
    const drained = complete(entered, 1);
    const terminal = entered.terminal ?? drained.terminal;
    return {
      state: scope.toSessionState(drained.state),
      ...(terminal ? { terminal } : {}),
      events: drained.events,
    };
  }

  return {
    createInitialState,
    enterPhase,
    initializePhaseResult,
    initializeSession,
    initPhaseState,
    resolveInitialPhase,
  };
}
