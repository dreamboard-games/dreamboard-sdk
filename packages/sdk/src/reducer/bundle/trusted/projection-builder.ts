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
import { collectCardZoneIds } from "./collector-introspection";
import {
  isSimultaneousPhase,
  resolveSimultaneousActors,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
  simultaneousSubmitInteraction,
} from "./simultaneous-player";

type ProjectionMode = "full" | "actionsOnly";
type DescriptorRegistry = {
  add(descriptor: InteractionDescriptorShape, actorSeat: number): string;
  entries(): Record<string, InteractionDescriptorShape>;
};

type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

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
      add(descriptor, actorSeat) {
        const enriched = descriptorWithBrowserReplayDigests(
          descriptor,
          actorSeat,
        );
        const fingerprint = stableStringify(enriched);
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

  function resolveGuidanceFor(combinedState: State) {
    const phaseName = combinedState.flow.currentPhase as PhaseName;
    const phase = scope.phaseByName(phaseName) as {
      name?: unknown;
      guidance?: { summary?: unknown; objective?: unknown };
    };
    const phaseSummary = normalizeGuidanceText(phase.guidance?.summary);
    const phaseObjective = normalizeGuidanceText(phase.guidance?.objective);
    const setupProfileId = combinedState.runtime.setup?.profileId;
    const setupProfile =
      setupProfileId == null
        ? undefined
        : scope.manifestSetupProfilesById[String(setupProfileId)];
    const setupGuidance = setupProfile?.guidance;
    const setupSummary = normalizeGuidanceText(setupGuidance?.summary);
    const setup =
      setupProfileId == null || !setupProfile
        ? undefined
        : {
            profileId: String(setupProfileId),
            name: setupProfile.name,
            ...(setupSummary ? { summary: setupSummary } : {}),
            steps: (setupGuidance?.steps ?? []).map((step) => ({
              id: step.id,
              label: step.label,
              ...(step.description ? { description: step.description } : {}),
            })),
          };
    return {
      phase: {
        id: String(phaseName),
        label:
          normalizeGuidanceText(phase.name) ??
          humanizeGuidanceId(String(phaseName)),
        ...(phaseSummary ? { summary: phaseSummary } : {}),
        ...(phaseObjective ? { objective: phaseObjective } : {}),
      },
      ...(setup ? { setup } : {}),
    };
  }

  function normalizeGuidanceText(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  function humanizeGuidanceId(id: string): string {
    if (!id) return id;
    const withSpaces = id
      .replace(/[-_]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .trim();
    if (!withSpaces) return id;
    return withSpaces
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
    } as unknown as Parameters<typeof view.project>[0];
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
    for (const [actorSeat, playerId] of playerIds.entries()) {
      const availableInteractionRefs = interactions
        .resolveAvailableInteractionsFor(combinedState, playerId, {
          projection,
        })
        .map((descriptor) => registry.add(descriptor, actorSeat));
      seats[playerId as unknown as string] = {
        ...(projectionMode === "full"
          ? {
              view: resolveViewFor(combinedState, playerId, viewId, projection),
              zones: resolveZoneHandlesFor(
                combinedState,
                playerId,
                actorSeat,
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
      guidance: resolveGuidanceFor(combinedState),
      recentEvents: [],
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

function toDescriptorDigestJson(value: unknown): CanonicalJson {
  const canonical = toCanonicalJson(value);
  return normalizeOrderInsensitiveDescriptorFields(canonical);
}

function normalizeOrderInsensitiveDescriptorFields(
  value: CanonicalJson,
): CanonicalJson {
  if (Array.isArray(value)) {
    return value.map(normalizeOrderInsensitiveDescriptorFields);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const normalized = normalizeOrderInsensitiveDescriptorFields(item);
      if (
        (key === "eligibleTargets" || key === "dependentCases") &&
        Array.isArray(normalized)
      ) {
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
): Record<string, CanonicalJson> {
  return Object.fromEntries(
    descriptor.inputs.flatMap((input) =>
      input.defaultValue === undefined
        ? []
        : [[input.key, toCanonicalJson(input.defaultValue)]],
    ),
  );
}

function toCanonicalJson(value: unknown): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCanonicalJson(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toCanonicalJson(item)]),
    );
  }
  return null;
}

function hashJson(value: CanonicalJson): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}

function canonicalJson(value: CanonicalJson): string {
  return JSON.stringify(canonicalizeJson(value));
}

function canonicalizeJson(value: CanonicalJson): CanonicalJson {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonical JSON contains a non-finite number");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJson(item));
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalizeJson(item)]),
  );
}

function compareCanonicalJson(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  for (let shift = 56; shift >= 0; shift -= 8) {
    bytes.push(Math.floor(bitLength / 2 ** shift) & 0xff);
  }

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Array<number>(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const base = offset + index * 4;
      words[index] =
        ((bytes[base] << 24) |
          (bytes[base + 1] << 16) |
          (bytes[base + 2] << 8) |
          bytes[base + 3]) >>>
        0;
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rotateRight(words[index - 15], 7) ^
        rotateRight(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rotateRight(words[index - 2], 17) ^
        rotateRight(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

function rotateRight(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function utf8Bytes(input: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < input.length; index += 1) {
    let codePoint = input.charCodeAt(index);
    if (
      codePoint >= 0xd800 &&
      codePoint <= 0xdbff &&
      index + 1 < input.length
    ) {
      const low = input.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (low - 0xdc00);
        index += 1;
      }
    }
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}
