import type { InteractionUiStore } from "../context/InteractionDraftContext.js";
import type {
  InteractionDescriptor,
  ZoneHandlesSnapshot,
} from "../types/plugin-state.js";
import {
  inputByKey,
  inputByTarget,
  isResolvedTargetDomain,
  isTargetDomain,
} from "./interaction-inputs.js";
import {
  claimInteractionSubmit,
  clearInteractionRoute,
  markInteractionPending,
  routeCardInputIntent,
  shouldRouteInteractionPending,
  type InteractionDraftReadiness,
  type RoutedInteractionTargetResult,
} from "./interaction-router.js";
import { isInteractionAvailable } from "./interaction-status.js";

/**
 * Opaque drop-target identifier emitted by SDK presentation. The runtime
 * adapter resolves it back into a typed `(inputKey, value)` pair against the
 * descriptor of the card the drop is for.
 *
 * Two encodings are supported, both opaque to SDK presentation:
 *
 * - `dreamboard:drop:input:<inputKey>:<value>` — explicit collector input
 *   key. Used by callers (CLI/scaffold tests, lower-level adapters) that
 *   already know the descriptor input shape.
 * - `dreamboard:drop:kind:<targetKind>:<value>` — typed kind reference.
 *   Used by the generated hand surface, where authors describe a target by
 *   its domain kind (`card` for staging, `space`/`edge`/`vertex`/`tile`
 *   for board destinations). The runtime adapter resolves it to the
 *   matching collector input on the live descriptor at drop time.
 */
export type RuntimeDropTargetId = string;

const DROP_TARGET_PREFIX = "dreamboard:drop";

export type RuntimeDropTargetKind =
  | "card"
  | "space"
  | "edge"
  | "vertex"
  | "tile";

/**
 * Build an opaque drop-target id keyed by the descriptor input name. Used
 * when the caller already knows the collector input shape.
 */
export function encodeRuntimeDropTargetId(
  inputKey: string,
  value: string,
): RuntimeDropTargetId {
  return `${DROP_TARGET_PREFIX}:input:${inputKey}:${value}`;
}

/**
 * Build an opaque drop-target id keyed by typed target kind. Used by the
 * generated hand surface, where authors do not (and should not) know the
 * collector input names.
 */
export function encodeRuntimeDropTargetKind(
  kind: RuntimeDropTargetKind,
  value: string,
): RuntimeDropTargetId {
  return `${DROP_TARGET_PREFIX}:kind:${kind}:${value}`;
}

export type DecodedRuntimeDropTarget =
  | { mode: "input"; inputKey: string; value: string }
  | { mode: "kind"; kind: RuntimeDropTargetKind; value: string };

export function decodeRuntimeDropTargetId(
  targetId: RuntimeDropTargetId,
): DecodedRuntimeDropTarget | null {
  if (!targetId.startsWith(`${DROP_TARGET_PREFIX}:`)) return null;
  const rest = targetId.slice(DROP_TARGET_PREFIX.length + 1);
  if (rest.startsWith("input:")) {
    const body = rest.slice("input:".length);
    const sep = body.indexOf(":");
    if (sep === -1) return null;
    return {
      mode: "input",
      inputKey: body.slice(0, sep),
      value: body.slice(sep + 1),
    };
  }
  if (rest.startsWith("kind:")) {
    const body = rest.slice("kind:".length);
    const sep = body.indexOf(":");
    if (sep === -1) return null;
    const kind = body.slice(0, sep) as RuntimeDropTargetKind;
    const value = body.slice(sep + 1);
    if (
      kind === "card" ||
      kind === "space" ||
      kind === "edge" ||
      kind === "vertex" ||
      kind === "tile"
    ) {
      return { mode: "kind", kind, value };
    }
    return null;
  }
  // Legacy format, kept for any external callers still using
  // `dreamboard:drop:<inputKey>:<value>`. New writers should use one of the
  // namespaced encoders above.
  const sep = rest.indexOf(":");
  if (sep === -1) return null;
  return {
    mode: "input",
    inputKey: rest.slice(0, sep),
    value: rest.slice(sep + 1),
  };
}

export interface CardIntentAdapterContext {
  store: InteractionUiStore;
  /** Project-side snapshot of all available interactions (gameplay slice). */
  availableInteractions: readonly InteractionDescriptor[];
  /** Zone snapshot for the originating hand. */
  zoneSnapshot: ZoneHandlesSnapshot | null;
  /** Submit through the canonical runtime path. */
  submit: (
    descriptor: InteractionDescriptor,
    params: Record<string, unknown>,
  ) => Promise<void>;
  /**
   * Optional explicit interaction key. When provided, the adapter only routes
   * intents through this interaction; otherwise it picks the first interaction
   * eligible for the card.
   */
  interactionKey?: string;
}

export type CardIntentInput =
  | { type: "activate"; cardId: string }
  | { type: "drop"; cardId: string; targetId: string };

export type CardIntentResult =
  | { status: "ignored"; reason: CardIntentIgnoredReason }
  | {
      status: "pending";
      descriptor: InteractionDescriptor;
      readiness: InteractionDraftReadiness;
      params: Record<string, unknown>;
    }
  | {
      status: "submitted";
      descriptor: InteractionDescriptor;
      readiness: InteractionDraftReadiness;
      params: Record<string, unknown>;
    }
  | {
      status: "submitting";
      descriptor: InteractionDescriptor;
      readiness: InteractionDraftReadiness;
      params: Record<string, unknown>;
    }
  | {
      status: "error";
      descriptor: InteractionDescriptor;
      error: unknown;
    };

export type CardIntentIgnoredReason =
  | "no-descriptor"
  | "interaction-unavailable"
  | "no-card-input"
  | "card-not-eligible"
  | "drop-target-not-decodable"
  | "drop-target-input-unknown"
  | "drop-target-not-eligible"
  | "ambiguous-drop"
  | "already-submitting";

interface CardRouteCandidate {
  descriptor: InteractionDescriptor;
  cardInputKey: string;
}

/**
 * Enumerate descriptors that can accept this card. Used both to pick a
 * single-action route for `activate` intents and to filter joint
 * `(card, destination)` matches for `drop` intents.
 */
function listCardRouteCandidates(
  ctx: CardIntentAdapterContext,
  cardId: string,
): CardRouteCandidate[] {
  const explicitKey = ctx.interactionKey;
  const candidates = ctx.zoneSnapshot
    ? (ctx.zoneSnapshot.playableByCardId[cardId] ?? [])
    : ctx.availableInteractions.filter(
        (descriptor) =>
          !explicitKey ||
          descriptor.interactionKey === explicitKey ||
          descriptor.interactionId === explicitKey,
      );
  const result: CardRouteCandidate[] = [];
  for (const descriptor of candidates) {
    if (explicitKey && descriptor.interactionKey !== explicitKey) continue;
    if (!isInteractionAvailable(descriptor)) continue;
    const targetInput = inputByTarget(descriptor, "card", cardId);
    if (targetInput) {
      result.push({ descriptor, cardInputKey: targetInput.key });
      continue;
    }
    const fallback = descriptor.inputs.find((input) => input.key === "cardId");
    if (fallback && isTargetDomain(fallback.domain)) {
      result.push({ descriptor, cardInputKey: fallback.key });
    }
  }
  return result;
}

/**
 * Apply an SDK `CardIntent` (generic activate/drop) to canonical Dreamboard
 * collector state. Returns the runtime classification for the call site to
 * react to (pending vs submitted vs ignored).
 *
 * Behavior:
 * - `activate` is mapped onto `routeCardInputIntent` with no destination.
 * - `drop` decodes the opaque target id; when it points at a typed input on
 *   the same descriptor, both the card and the destination are written
 *   atomically before readiness/`autoWhenReady` is evaluated.
 * - Disabled, unavailable or ineligible intents return `ignored` even if the
 *   caller emits them.
 */
export async function applyCardIntent(
  ctx: CardIntentAdapterContext,
  intent: CardIntentInput,
): Promise<CardIntentResult> {
  const candidates = listCardRouteCandidates(ctx, intent.cardId);
  if (candidates.length === 0) {
    return { status: "ignored", reason: "no-descriptor" };
  }
  // Filter out candidates whose card input rejects this card. The card
  // domain may be unresolved (lazy) — those still pass since their
  // eligibility is computed from the draft itself.
  const cardEligible = candidates.filter(({ descriptor, cardInputKey }) => {
    const cardInput = inputByKey(descriptor, cardInputKey);
    if (!cardInput) return false;
    if (!isResolvedTargetDomain(cardInput.domain)) return true;
    return cardInput.domain.eligibleTargets.includes(intent.cardId);
  });
  if (cardEligible.length === 0) {
    return { status: "ignored", reason: "card-not-eligible" };
  }

  let descriptor: InteractionDescriptor;
  let cardInputKey: string;
  let dropTarget: { inputKey: string; value: string } | undefined;

  if (intent.type === "drop") {
    const decoded = decodeRuntimeDropTargetId(intent.targetId);
    if (!decoded) {
      return { status: "ignored", reason: "drop-target-not-decodable" };
    }
    // Score every card-eligible candidate against the decoded destination.
    // A descriptor is a "match" only when it accepts both the card and the
    // dropped target; ambiguity is reported explicitly so authors can fix
    // the underlying descriptor projection rather than getting silent
    // submissions of the wrong action.
    const matches = cardEligible.flatMap((candidate) => {
      const resolvedInputKey =
        decoded.mode === "input"
          ? decoded.inputKey
          : resolveDropTargetInputKey(
              candidate.descriptor,
              decoded.kind,
              decoded.value,
            );
      if (!resolvedInputKey) return [];
      const dropInput = inputByKey(candidate.descriptor, resolvedInputKey);
      if (!dropInput) return [];
      if (
        isResolvedTargetDomain(dropInput.domain) &&
        !dropInput.domain.eligibleTargets.includes(decoded.value)
      ) {
        return [];
      }
      return [
        {
          ...candidate,
          dropTarget: { inputKey: resolvedInputKey, value: decoded.value },
        },
      ];
    });
    if (matches.length === 0) {
      // Distinguish "no descriptor declares this input/kind at all" from
      // "the dropped value is not eligible for any descriptor that does".
      const anyKnowsKey = cardEligible.some((candidate) => {
        if (decoded.mode === "input") {
          return (
            inputByKey(candidate.descriptor, decoded.inputKey) !== undefined
          );
        }
        return (
          resolveDropTargetInputKey(
            candidate.descriptor,
            decoded.kind,
            decoded.value,
          ) !== null
        );
      });
      return {
        status: "ignored",
        reason: anyKnowsKey
          ? "drop-target-not-eligible"
          : "drop-target-input-unknown",
      };
    }
    if (matches.length > 1) {
      // Ambiguity: more than one descriptor accepts both this card and this
      // destination. Signal so callers/tests catch the descriptor design
      // bug rather than the runtime silently picking one.
      return { status: "ignored", reason: "ambiguous-drop" };
    }
    descriptor = matches[0]!.descriptor;
    cardInputKey = matches[0]!.cardInputKey;
    dropTarget = matches[0]!.dropTarget;
  } else {
    descriptor = cardEligible[0]!.descriptor;
    cardInputKey = cardEligible[0]!.cardInputKey;
  }

  if (!isInteractionAvailable(descriptor)) {
    return { status: "ignored", reason: "interaction-unavailable" };
  }
  if (!inputByKey(descriptor, cardInputKey)) {
    return { status: "ignored", reason: "no-card-input" };
  }

  const routed: RoutedInteractionTargetResult = routeCardInputIntent(
    ctx.store,
    descriptor,
    {
      cardInputKey,
      cardId: intent.cardId,
      dropTarget,
    },
  );

  if (shouldRouteInteractionPending(descriptor, routed.readiness)) {
    markInteractionPending(ctx.store, descriptor);
    return {
      status: "pending",
      descriptor,
      readiness: routed.readiness,
      params: routed.params,
    };
  }

  if (!claimInteractionSubmit(ctx.store, descriptor)) {
    return {
      status: "submitting",
      descriptor,
      readiness: routed.readiness,
      params: routed.params,
    };
  }

  try {
    await ctx.submit(descriptor, routed.params);
    clearInteractionRoute(ctx.store, descriptor);
    return {
      status: "submitted",
      descriptor,
      readiness: routed.readiness,
      params: routed.params,
    };
  } catch (error) {
    return { status: "error", descriptor, error };
  } finally {
    ctx.store.setSubmitting(descriptor.interactionKey, false);
  }
}

/**
 * Resolve a typed drop-target kind/value pair to the descriptor's collector
 * input key. Authors describe targets at the type level (e.g. board space
 * `hex-a`) but the descriptor names that input by its authored collector
 * key (e.g. `spaceId`). This bridges the two without surfacing collector
 * names in the authoring API.
 */
function resolveDropTargetInputKey(
  descriptor: InteractionDescriptor,
  kind: RuntimeDropTargetKind,
  value: string,
): string | null {
  // Prefer an input whose authoritative resolved domain advertises this
  // value as eligible. Falls back to a kind-only match for lazy domains.
  let kindOnlyMatch: string | null = null;
  for (const input of descriptor.inputs) {
    if (!matchesDropTargetKind(input.domain, kind)) continue;
    if (
      isResolvedTargetDomain(input.domain) &&
      input.domain.eligibleTargets.includes(value)
    ) {
      return input.key;
    }
    if (kindOnlyMatch === null) {
      kindOnlyMatch = input.key;
    }
  }
  return kindOnlyMatch;
}

function matchesDropTargetKind(
  domain: InteractionDescriptor["inputs"][number]["domain"],
  kind: RuntimeDropTargetKind,
): boolean {
  if (kind === "card") {
    return isTargetDomain(domain) && domain.type === "cardTarget";
  }
  return (
    isTargetDomain(domain) &&
    domain.type === "boardTarget" &&
    domain.targetKind === kind
  );
}

/**
 * Project descriptor + draft state into per-card visual flags used by the
 * runtime hand surface. Each entry tracks which card ids are currently part
 * of any card-target draft, and which of those have field validation errors.
 */
export interface DraftCardProjectionEntry {
  descriptor: InteractionDescriptor;
  cardInputKeys: readonly string[];
  draftCardIds: ReadonlySet<string>;
  invalidCardIds: ReadonlySet<string>;
}

export function projectDraftCardState(
  availableInteractions: readonly InteractionDescriptor[],
  drafts: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  validate: (
    descriptor: InteractionDescriptor,
    draft: Readonly<Record<string, unknown>>,
  ) => Partial<Record<string, readonly string[]>>,
): DraftCardProjectionEntry[] {
  const entries: DraftCardProjectionEntry[] = [];
  for (const descriptor of availableInteractions) {
    const cardInputs = descriptor.inputs.filter(
      (input) =>
        isTargetDomain(input.domain) && input.domain.type === "cardTarget",
    );
    if (cardInputs.length === 0) continue;
    const draft = drafts[descriptor.interactionKey] ?? {};
    const draftCardIds = new Set<string>();
    for (const input of cardInputs) {
      const value = draft[input.key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") draftCardIds.add(item);
        }
      } else if (typeof value === "string") {
        draftCardIds.add(value);
      }
    }
    const fieldErrors = validate(descriptor, draft);
    const invalidCardIds = new Set<string>();
    for (const input of cardInputs) {
      if ((fieldErrors[input.key]?.length ?? 0) === 0) continue;
      const value = draft[input.key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") invalidCardIds.add(item);
        }
      } else if (typeof value === "string") {
        invalidCardIds.add(value);
      }
    }
    entries.push({
      descriptor,
      cardInputKeys: cardInputs.map((input) => input.key),
      draftCardIds,
      invalidCardIds,
    });
  }
  return entries;
}

export interface ProjectedCardVisualState {
  selected: boolean;
  invalid: boolean;
}

/**
 * Combine the per-descriptor projection into a single per-card flag tuple.
 */
export function visualStateForCard(
  cardId: string,
  projection: readonly DraftCardProjectionEntry[],
): ProjectedCardVisualState {
  let selected = false;
  let invalid = false;
  for (const entry of projection) {
    if (entry.draftCardIds.has(cardId)) selected = true;
    if (entry.invalidCardIds.has(cardId)) invalid = true;
  }
  return { selected, invalid };
}

/**
 * Return the set of card ids that are currently part of a many-selection
 * draft for any descriptor in the zone. Used by the hand view to drop
 * selected cards out of the visible hand layout while keeping the runtime
 * source of truth in the zone snapshot.
 */
export function selectedCardIdsForZone(
  store: Pick<InteractionUiStore, "getDraft">,
  zone: string,
  availableInteractions: readonly InteractionDescriptor[],
): readonly string[] {
  const result = new Set<string>();
  for (const descriptor of availableInteractions) {
    const cardInput = descriptor.inputs.find((input) => {
      if (!isTargetDomain(input.domain)) return false;
      if (input.domain.type !== "cardTarget") return false;
      const declaredZones =
        input.domain.zoneId !== undefined
          ? [input.domain.zoneId]
          : (input.domain.zoneIds ?? []);
      return declaredZones.length === 0 || declaredZones.includes(zone);
    });
    if (!cardInput) continue;
    if (!isTargetDomain(cardInput.domain)) continue;
    if (cardInput.domain.type !== "cardTarget") continue;
    const draft = store.getDraft(descriptor.interactionKey);
    const value = draft[cardInput.key];
    if (cardInput.domain.selection?.mode === "many" && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") result.add(item);
      }
    }
  }
  return [...result];
}
