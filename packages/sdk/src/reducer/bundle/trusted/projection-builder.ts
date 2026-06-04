import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ViewMapOf,
} from "../../model";
import type {
  InteractionDescriptorShape,
  createInteractionResolver,
} from "./interaction-resolver";
import type {
  TrustedDomainState,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedSessionState,
  TrustedState,
} from "./runtime-scope";
import {
  createProjectionContext,
  type ProjectionContext,
} from "./projection-context";
import { collectCardZoneIds } from "./interaction-collectors";
import {
  isSimultaneousPhase,
  resolveSimultaneousActors,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
  simultaneousSubmitInteraction,
} from "./simultaneous-player";

type ProjectionMode = "full" | "actionsOnly";
type DescriptorRegistry = {
  add(descriptor: InteractionDescriptorShape): string;
  entries(): Record<string, InteractionDescriptorShape>;
};

type InteractionResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createInteractionResolver<Contract, Definitions, Views>>;

export function createProjectionBuilder<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  interactions: InteractionResolverFor<Contract, Definitions, Views>,
) {
  type SessionState = TrustedSessionState<Contract>;
  type DomainState = TrustedDomainState<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;

  function createDescriptorRegistry(): DescriptorRegistry {
    const byRef: Record<string, InteractionDescriptorShape> = {};
    const byHash = new Map<string, string>();
    return {
      add(descriptor) {
        const fingerprint = stableStringify(descriptor);
        const existing = byHash.get(fingerprint);
        if (existing) return existing;
        const base =
          typeof descriptor.interactionId === "string" &&
          descriptor.interactionId.length > 0
            ? descriptor.interactionId
            : "interaction";
        const ref = `${base}:${fnv1a64(fingerprint)}`;
        byHash.set(fingerprint, ref);
        byRef[ref] = descriptor;
        return ref;
      },
      entries() {
        return byRef;
      },
    };
  }

  function resolveZoneHandlesFor(
    combinedState: State,
    playerId: PlayerId,
    projection: ProjectionContext<DomainState, State>,
    registry: DescriptorRegistry,
  ) {
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const zoneIds = new Set<string>(scope.zonesForPhase(phaseName).map(String));
    for (const [, interaction] of scope.interactionEntriesForPhase(phaseName)) {
      for (const zoneId of collectCardZoneIds(interaction)) {
        zoneIds.add(String(zoneId));
      }
    }
    const zones = [...zoneIds];
    if (zones.length === 0) return {};
    const q = projection.q;
    const result: Record<
      string,
      {
        cardIds: string[];
        cardViewsById: Record<string, string>;
        playableByCardId: Record<string, string[]>;
      }
    > = {};
    for (const zoneId of zones) {
      const table = combinedState.table as {
        decks?: Record<string, unknown>;
        hands?: Record<string, unknown>;
        zones?: {
          shared?: Record<string, unknown>;
          perPlayer?: Record<string, unknown>;
        };
      };
      const isPlayerZone =
        zoneId in (table.hands ?? {}) ||
        zoneId in (table.zones?.perPlayer ?? {});
      const cardIds = Array.from(
        isPlayerZone
          ? (q.zone.playerCards(
              playerId as never,
              zoneId as never,
            ) as readonly string[])
          : (q.zone.sharedCards(zoneId as never) as readonly string[]),
      );
      const cardInteractionIds = scope
        .interactionEntriesForPhase(phaseName)
        .filter(([, interaction]) =>
          collectCardZoneIds(interaction).map(String).includes(zoneId),
        )
        .map(([interactionId]) => interactionId);
      const cardViewsById: Record<string, string> = {};
      const playableByCardId: Record<string, string[]> = {};
      for (const cardId of cardIds) {
        cardViewsById[cardId] = JSON.stringify(q.card.get(cardId as never));
        const perCard: string[] = [];
        for (const interactionId of cardInteractionIds) {
          const interaction = scope.findInteractionInPhase(
            phaseName,
            interactionId,
          );
          if (!interaction) continue;
          const cardKey = interactions.findCardInputKeyForZone(
            interaction,
            zoneId,
          );
          const params = cardKey ? { [cardKey]: cardId } : {};
          const decision = interactions.resolveInteractionDecision({
            state: combinedState,
            playerId,
            interactionId,
            params,
            mode: "card",
            projection,
          });
          if (!decision.found || !decision.visible) continue;
          const cardDomain = cardKey
            ? decision.descriptor.inputs.find((input) => input.key === cardKey)
                ?.domain
            : undefined;
          const cardTargets =
            cardDomain?.type === "cardTarget" &&
            cardDomain.projection === "resolved"
              ? cardDomain.eligibleTargets
              : undefined;
          if (cardKey && !cardTargets?.includes(cardId)) {
            continue;
          }
          perCard.push(
            registry.add({
              ...decision.descriptor,
              zoneId,
            }),
          );
        }
        playableByCardId[cardId] = perCard;
      }
      result[zoneId] = {
        cardIds,
        cardViewsById,
        playableByCardId,
      };
    }
    return result;
  }

  function resolveCurrentStageFor(
    combinedState: State,
    projection?: ProjectionContext<DomainState, State>,
  ): string {
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    return (
      interactions.resolveActiveStage(combinedState, phaseName, projection)
        ?.id ?? phaseName
    );
  }

  function resolveStageSeatsFor(state: SessionState): string[] {
    const combinedState = scope.toCombinedState(state);
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const phase = scope.phaseByName(phaseName);
    if (isSimultaneousPhase(phase)) {
      return resolveSimultaneousActors(scope, combinedState, phase).map(String);
    }
    return [...state.domain.flow.activePlayers];
  }

  function resolveSimultaneousPhaseFor(state: SessionState) {
    const combinedState = scope.toCombinedState(state);
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const phase = scope.phaseByName(phaseName);
    if (!isSimultaneousPhase(phase)) return null;
    const current = state.runtime.simultaneous?.current;
    if (!current || current.phaseName !== phaseName) return null;
    const submit = simultaneousSubmitInteraction(phase);
    if (!submit) return null;
    const actorIds = current.actors.map(String);
    const sealedPlayerIds = actorIds.filter(
      (playerId) => current.submissions[playerId as PlayerId] !== undefined,
    );
    const pendingPlayerIds = actorIds.filter(
      (playerId) => current.submissions[playerId as PlayerId] === undefined,
    );
    return {
      phaseName: String(current.phaseName),
      interactionId: SIMULTANEOUS_SUBMIT_INTERACTION_ID,
      actorIds,
      sealedPlayerIds,
      pendingPlayerIds,
    };
  }

  function resolveViewFor(
    combinedState: State,
    playerId: PlayerId,
    viewId: string,
    projection: ProjectionContext<DomainState, State>,
  ): unknown {
    const views = scope.definition.views;
    const view = views?.[viewId as keyof typeof views];
    if (!view) {
      return null;
    }
    const viewArgs = {
      ...scope.buildContext(combinedState),
      ...scope.runtimeHelpers,
      fx: projection.fx,
      q: projection.q,
      derived: projection.derived,
      state: projection.domainState,
      playerId,
    } as Parameters<typeof view.project>[0];
    return view.project(viewArgs);
  }

  function projectSeatsDynamic({
    state,
    playerIds,
    viewId = "player",
    projectionMode = "full",
  }: {
    state: SessionState;
    playerIds: PlayerId[];
    viewId?: string;
    projectionMode?: ProjectionMode;
  }) {
    const combinedState = scope.toCombinedState(state);
    const projection = createProjectionContext({
      combinedState,
      domainState: scope.toDomainState(combinedState),
    });
    const registry = createDescriptorRegistry();
    type SeatProjection = {
      view?: ReturnType<typeof resolveViewFor>;
      availableInteractionRefs: string[];
      zones?: ReturnType<typeof resolveZoneHandlesFor>;
    };
    const seats: Record<string, SeatProjection> = {};
    for (const playerId of playerIds) {
      const availableInteractionRefs = interactions
        .resolveAvailableInteractionsFor(combinedState, playerId, {
          projection,
        })
        .map((descriptor) => registry.add(descriptor));
      seats[playerId as unknown as string] = {
        ...(projectionMode === "full"
          ? {
              view: resolveViewFor(combinedState, playerId, viewId, projection),
              zones: resolveZoneHandlesFor(
                combinedState,
                playerId,
                projection,
                registry,
              ),
            }
          : {}),
        availableInteractionRefs,
      };
    }
    return {
      currentStage: resolveCurrentStageFor(combinedState, projection),
      stageSeats: resolveStageSeatsFor(state),
      simultaneousPhase: resolveSimultaneousPhaseFor(state),
      interactionsByRef: registry.entries(),
      seats,
    };
  }

  function projectSeatViewDynamic({
    state,
    playerId,
    viewId = "player",
  }: {
    state: SessionState;
    playerId: PlayerId;
    viewId?: string;
  }) {
    const combinedState = scope.toCombinedState(state);
    const projection = createProjectionContext({
      combinedState,
      domainState: scope.toDomainState(combinedState),
    });
    return resolveViewFor(combinedState, playerId, viewId, projection);
  }

  return {
    projectSeatsDynamic,
    projectSeatViewDynamic,
    resolveCurrentStageFor,
    resolveStageSeatsFor,
    resolveViewFor,
    resolveZoneHandlesFor,
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function fnv1a64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}
