import type { RuntimeJson } from "../../../shared/runtime-json";
import {
  canonicalizePluginRuntimeJson as toCanonicalJson,
  encodeCanonicalPluginRuntimeJson as canonicalJson,
  digestPluginRuntimeJson as hashJson,
} from "../../../shared/protocol/json";
import type * as Wire from "../../../shared/runtime-types";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ViewOfContract,
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
import { collectCardZoneIds } from "./collector-introspection";
import {
  isSimultaneousPhase,
  resolveSimultaneousActors,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
  simultaneousSubmitInteraction,
} from "./simultaneous-player";

type ProjectionMode = "full" | "actionsOnly";
type ProjectionTimingMetadata = {
  resolveAvailableInteractionsMs: number;
  resolveViewMs: number;
  resolveZoneHandlesMs: number;
  descriptorHashMs: number;
};
type DescriptorRegistry = {
  add(descriptor: InteractionDescriptorShape, actorSeat: number): string;
  entries(): Record<string, InteractionDescriptorShape>;
};

type InteractionResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
> = ReturnType<typeof createInteractionResolver<Contract, Definitions, View>>;

export function createProjectionBuilder<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  interactions: InteractionResolverFor<Contract, Definitions, View>,
) {
  type SessionState = TrustedSessionState<Contract>;
  type DomainState = TrustedDomainState<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  type PlayerId = TrustedPlayerId<Contract>;

  function createDescriptorRegistry(
    timing: ProjectionTimingMetadata,
  ): DescriptorRegistry {
    const byRef: Record<string, InteractionDescriptorShape> = {};
    const byHash = new Map<string, string>();
    return {
      add(descriptor, actorSeat) {
        return measureProjectionTiming(timing, "descriptorHashMs", () => {
          const enriched = descriptorWithBrowserReplayDigests(
            descriptor,
            actorSeat,
          );
          const fingerprint = canonicalJson(enriched);
          const existing = byHash.get(fingerprint);
          if (existing) return existing;
          const base =
            typeof enriched.interactionId === "string" &&
            enriched.interactionId.length > 0
              ? enriched.interactionId
              : "interaction";
          const ref = `${base}:${fnv1a64(fingerprint)}`;
          byHash.set(fingerprint, ref);
          byRef[ref] = enriched;
          return ref;
        });
      },
      entries() {
        return byRef;
      },
    };
  }

  function resolveZoneHandlesFor(
    combinedState: State,
    playerId: PlayerId,
    actorSeat: number,
    projection: ProjectionContext<DomainState>,
    registry: DescriptorRegistry,
  ) {
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const zoneIds = new Set<string>(
      scope.definition.contract.manifest.literals.playerZoneIds.map(String),
    );
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
      const visibility =
        combinedState.table.zones.visibility[zoneId] ??
        combinedState.table.handVisibility[zoneId];
      if (visibility === "hidden") continue;
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
      ).filter((cardId) => {
        const visibility = q.card.visibility(cardId as never);
        return (
          !visibility ||
          visibility.faceUp ||
          visibility.visibleTo?.includes(playerId)
        );
      });
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
            registry.add(
              {
                ...decision.descriptor,
                zoneId,
              },
              actorSeat,
            ),
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

  function resolveSchedulerFlowFor(
    state: SessionState,
    projection?: ProjectionContext<DomainState>,
  ): Wire.SchedulerFlowAuthorityProjection {
    const combinedState = scope.toCombinedState(state);
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const phase = scope.phaseByName(phaseName);
    if (phase.kind === "auto") {
      return emptySchedulerFlow();
    }

    if (isSimultaneousPhase(phase)) {
      const current = state.runtime.simultaneous?.current;
      const actors = orderKnownPlayerIds(
        combinedState,
        current?.phaseName === phaseName
          ? current.actors.map(String)
          : resolveSimultaneousActors(
              scope,
              combinedState,
              phase,
              projection,
            ).map(String),
      );
      const submissions =
        current?.phaseName === phaseName ? current.submissions : {};
      const sealedPlayerIds = actors.filter(
        (playerId) =>
          submissions[playerId as keyof typeof submissions] !== undefined,
      );
      const pendingPlayerIds = actors.filter(
        (playerId) =>
          submissions[playerId as keyof typeof submissions] === undefined,
      );
      const activePlayerIds =
        (phase as { canResubmit?: boolean }).canResubmit === true
          ? actors
          : pendingPlayerIds;
      return {
        version: 1,
        activePlayerIds,
        pendingPlayerIds,
        continuationDependencies: sealedPlayerIds.flatMap((waiterPlayerId) => {
          const blockerPlayerIds = pendingPlayerIds.filter(
            (playerId) => playerId !== waiterPlayerId,
          );
          return blockerPlayerIds.length > 0
            ? [{ waiterPlayerId, blockerPlayerIds }]
            : [];
        }),
      };
    }

    const activePlayerIds = new Set<string>();
    const pendingPlayerIds = new Set<string>();
    let sawScheduledInteraction = false;
    for (const [, interaction] of scope.interactionEntriesForPhase(phaseName)) {
      sawScheduledInteraction = true;
      const actorAuthorization =
        interactions.resolveInteractionActorAuthorization(
          combinedState,
          interaction,
          projection,
        );
      if (actorAuthorization.mode === "actors") {
        for (const playerId of actorAuthorization.actors) {
          activePlayerIds.add(String(playerId));
          if (interaction.actor) {
            pendingPlayerIds.add(String(playerId));
          }
        }
        continue;
      }
      const active = combinedState.flow.activePlayers as readonly string[];
      for (const playerId of active.length > 0
        ? active
        : (combinedState.table.playerOrder as readonly string[])) {
        activePlayerIds.add(String(playerId));
      }
    }

    if (!sawScheduledInteraction) {
      for (const playerId of combinedState.flow
        .activePlayers as readonly string[]) {
        activePlayerIds.add(String(playerId));
      }
    }

    const orderedActivePlayerIds = orderKnownPlayerIds(
      combinedState,
      activePlayerIds,
    );
    const orderedPendingPlayerIds = orderKnownPlayerIds(
      combinedState,
      pendingPlayerIds,
    );
    const continuationDependencies = orderKnownPlayerIds(
      combinedState,
      combinedState.flow.activePlayers as readonly string[],
    ).flatMap((waiterPlayerId) => {
      const blockerPlayerIds = orderedPendingPlayerIds.filter(
        (playerId) => playerId !== waiterPlayerId,
      );
      return blockerPlayerIds.length > 0
        ? [{ waiterPlayerId, blockerPlayerIds }]
        : [];
    });
    return {
      version: 1,
      activePlayerIds: orderedActivePlayerIds,
      pendingPlayerIds: orderedPendingPlayerIds,
      continuationDependencies,
    };
  }

  function emptySchedulerFlow(): Wire.SchedulerFlowAuthorityProjection {
    return {
      version: 1,
      activePlayerIds: [],
      pendingPlayerIds: [],
      continuationDependencies: [],
    };
  }

  function orderKnownPlayerIds(
    state: State,
    playerIds: Iterable<string>,
  ): string[] {
    const selected = new Set([...playerIds].map(String));
    return (state.table.playerOrder as readonly string[])
      .map(String)
      .filter((playerId) => selected.has(playerId));
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

  /** Every player's public balances plus the seat's own owner-only ones. */
  function resolveResourcesFor(
    combinedState: State,
    playerId: PlayerId,
  ): Record<string, Record<string, number>> {
    const ownerOnly = new Set<string>(
      scope.definition.contract.manifest.literals.ownerResourceIds ?? [],
    );
    const balances = combinedState.table.resources as Record<
      string,
      Record<string, number>
    >;
    return Object.fromEntries(
      Object.entries(balances).map(([holder, resources]) => [
        holder,
        holder === playerId
          ? { ...resources }
          : Object.fromEntries(
              Object.entries(resources).filter(([id]) => !ownerOnly.has(id)),
            ),
      ]),
    );
  }

  function resolvePlayerViewFor(
    combinedState: State,
    playerId: PlayerId,
    projection: ProjectionContext<DomainState>,
  ): unknown {
    const view = scope.definition.view;
    const viewArgs = {
      ...scope.buildContext(combinedState),
      q: projection.q,
      state: projection.domainState,
      playerId,
    } as unknown as Parameters<typeof view>[0];
    return view(viewArgs);
  }

  function project({
    state,
    playerIds,
    projectionMode = "full",
  }: {
    state: SessionState;
    playerIds: PlayerId[];
    projectionMode?: ProjectionMode;
  }) {
    const combinedState = scope.toCombinedState(state);
    const projection = createProjectionContext({
      domainState: scope.toDomainState(combinedState),
    });
    const timing = createProjectionTimingMetadata();
    const registry = createDescriptorRegistry(timing);
    type SeatProjection = {
      view?: ReturnType<typeof resolvePlayerViewFor>;
      availableInteractionRefs: string[];
      zones?: ReturnType<typeof resolveZoneHandlesFor>;
      resources?: ReturnType<typeof resolveResourcesFor>;
    };
    const seats: Record<string, SeatProjection> = {};
    for (const [actorSeat, playerId] of playerIds.entries()) {
      const availableInteractions = measureProjectionTiming(
        timing,
        "resolveAvailableInteractionsMs",
        () =>
          interactions.resolveAvailableInteractionsFor(
            combinedState,
            playerId,
            {
              projection,
            },
          ),
      );
      const availableInteractionRefs = availableInteractions.map((descriptor) =>
        registry.add(descriptor, actorSeat),
      );
      const fullProjection =
        projectionMode === "full"
          ? {
              view: measureProjectionTiming(timing, "resolveViewMs", () =>
                resolvePlayerViewFor(combinedState, playerId, projection),
              ),
              zones: measureProjectionTiming(
                timing,
                "resolveZoneHandlesMs",
                () =>
                  resolveZoneHandlesFor(
                    combinedState,
                    playerId,
                    actorSeat,
                    projection,
                    registry,
                  ),
              ),
              resources: resolveResourcesFor(combinedState, playerId),
            }
          : {};
      seats[playerId as unknown as string] = {
        ...fullProjection,
        availableInteractionRefs,
      };
    }
    return withProjectionTiming(
      {
        events: state.runtime.events,
        simultaneousPhase: resolveSimultaneousPhaseFor(state),
        schedulerFlow: resolveSchedulerFlowFor(state, projection),
        interactionsByRef: registry.entries(),
        seats,
      },
      timing,
    );
  }

  return {
    project,
    resolveSchedulerFlowFor,
    resolvePlayerViewFor,
    resolveZoneHandlesFor,
  };
}

function createProjectionTimingMetadata(): ProjectionTimingMetadata {
  return {
    resolveAvailableInteractionsMs: 0,
    resolveViewMs: 0,
    resolveZoneHandlesMs: 0,
    descriptorHashMs: 0,
  };
}

function measureProjectionTiming<T>(
  timing: ProjectionTimingMetadata,
  field: keyof ProjectionTimingMetadata,
  block: () => T,
): T {
  const startedAt = performance.now();
  try {
    return block();
  } finally {
    timing[field] += performance.now() - startedAt;
  }
}

function withProjectionTiming<T extends object>(
  projection: T,
  timing: ProjectionTimingMetadata,
): T & { timing: ProjectionTimingMetadata } {
  Object.defineProperty(projection, "timing", {
    value: timing,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return projection as T & { timing: ProjectionTimingMetadata };
}

function descriptorWithBrowserReplayDigests(
  descriptor: InteractionDescriptorShape,
  actorSeat: number,
): InteractionDescriptorShape {
  const descriptorDigestValue =
    descriptor.descriptorDigest ?? interactionDescriptorDigest(descriptor);
  return {
    ...descriptor,
    descriptorDigest: descriptorDigestValue,
    actorSeat,
    draftDigest:
      descriptor.draftDigest ??
      interactionDraftDigest({
        actorSeat,
        descriptor,
        descriptorDigest: descriptorDigestValue,
      }),
  };
}

function interactionDescriptorDigest(
  descriptor: InteractionDescriptorShape,
): string {
  return hashJson({
    commitMode: descriptor.commit.mode,
    defaults: toDescriptorDigestJson(defaultsForDescriptor(descriptor)),
    inputKeys: descriptor.inputs.map((input) => input.key),
    inputs: descriptor.inputs.map((input) => ({
      key: input.key,
      kind: input.kind,
      domain: toDescriptorDigestJson(input.domain),
      defaultValue:
        input.defaultValue === undefined
          ? null
          : toDescriptorDigestJson(input.defaultValue),
    })),
    interactionId: descriptor.interactionId,
    interactionKey: descriptor.interactionKey,
    stableIdentity: `${descriptor.interactionKey}:${descriptor.interactionId}`,
  });
}

function interactionDraftDigest({
  actorSeat,
  descriptor,
  descriptorDigest,
}: {
  actorSeat: number;
  descriptor: InteractionDescriptorShape;
  descriptorDigest: string;
}): string {
  return hashJson({
    digestVersion: "interaction-draft@2",
    actorSeat,
    descriptorDigest,
    emitted: false,
    interactionId: descriptor.interactionId,
    interactionKey: descriptor.interactionKey,
    values: defaultsForDescriptor(descriptor),
  });
}

function toDescriptorDigestJson(value: unknown): RuntimeJson {
  const canonical = toCanonicalJson(value);
  return normalizeOrderInsensitiveDescriptorFields(canonical);
}

function normalizeOrderInsensitiveDescriptorFields(
  value: RuntimeJson,
): RuntimeJson {
  if (Array.isArray(value)) {
    return value.map(normalizeOrderInsensitiveDescriptorFields);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const normalized = normalizeOrderInsensitiveDescriptorFields(item);
      if (key === "eligibleTargets" && Array.isArray(normalized)) {
        return [
          key,
          [...normalized].sort((left, right) =>
            compareCanonicalJson(canonicalJson(left), canonicalJson(right)),
          ),
        ];
      }
      return [key, normalized];
    }),
  );
}

function defaultsForDescriptor(
  descriptor: InteractionDescriptorShape,
): Record<string, RuntimeJson> {
  return Object.fromEntries(
    descriptor.inputs.flatMap((input) =>
      input.defaultValue === undefined
        ? []
        : [[input.key, toCanonicalJson(input.defaultValue)]],
    ),
  );
}

function compareCanonicalJson(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
