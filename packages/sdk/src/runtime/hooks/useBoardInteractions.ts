import { useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { useInteractionUiStore } from "../context/InteractionDraftContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import { validationErrorFromUnknown } from "../../ui/errors/ValidationError.js";
import type {
  InteractiveTargetLayer,
  InteractiveTargetState,
} from "../components/board/target-layer.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  applyInteractionInputDefaults,
  eligibleTargetsByBoardKind,
  eligibleTargetsForInput,
  hasBoardTargetInput,
  hasCardTargetInput,
  inputByTarget,
  inputKeyForTarget,
  isTargetDomain,
  type BoardTargetKind,
} from "../utils/interaction-inputs.js";
import {
  claimInteractionSubmit,
  clearInteractionRoute,
  getInteractionDraftReadiness,
  markInteractionPending,
  routeInteractionTarget,
  shouldRouteInteractionPending,
} from "../utils/interaction-router.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import {
  createGameplayActuatorAttributes,
  type BrowserInteractionAttributeMap,
} from "../../browser-interaction/index.js";
import { interactionDraftDigestForValues } from "../utils/interaction-draft-digest.js";
import { gameplayCandidateMetadata } from "../utils/browser-interaction-effects.js";

export type BoardEligibleTargets = Readonly<
  Record<BoardTargetKind, ReadonlySet<string>>
>;

export interface BoardTargetLayerOptions {
  enabled?: boolean;
  interactionKeys?: readonly string[];
  extraInputs?:
    | Record<string, unknown>
    | ((targetId: string) => Record<string, unknown>);
  onBeforeSelect?: () => void;
  onError?: (error: unknown) => void;
}

export type BoardTargetLayerFactory = (
  options?: BoardTargetLayerOptions,
) => InteractiveTargetLayer;

export type BoardSelectionResult<I extends string = string> =
  | { status: "none" }
  | {
      status: "pending";
      interactionKey: I;
      descriptor: InteractionDescriptor<I>;
      missingInputs: readonly string[];
    }
  | {
      status: "submitted";
      interactionKey: I;
      descriptor: InteractionDescriptor<I>;
    };

export interface BoardPendingInteraction<I extends string = string> {
  interactionKey: I;
  descriptor: InteractionDescriptor<I>;
  missingInputs: readonly string[];
  clear(): void;
}

export interface BoardInteractionsOptions {
  /**
   * Target kinds the hook pulls interactions from. Defaults to every board
   * target kind. Restrict when a specific screen should only react to a subset
   * (e.g. a discard screen that only cares about tile clicks).
   */
  targetKinds?: readonly BoardTargetKind[];
}

export class BoardInteractionConflictError extends Error {
  readonly name = "BoardInteractionConflictError";
  readonly targetKind: BoardTargetKind;
  readonly targetId: string;
  readonly interactionKeys: readonly string[];

  constructor({
    targetKind,
    targetId,
    interactionKeys,
  }: {
    targetKind: BoardTargetKind;
    targetId: string;
    interactionKeys: readonly string[];
  }) {
    super(
      `Ambiguous ${targetKind} target '${targetId}' matched interactions: ${interactionKeys.join(
        ", ",
      )}. Arm one interaction explicitly or route with a narrower board primitive.`,
    );
    this.targetKind = targetKind;
    this.targetId = targetId;
    this.interactionKeys = interactionKeys;
  }
}

/**
 * Opinionated board-level dispatch context. Collapses the repeated
 * "collect every board handle, merge target domains across them,
 * route each click into the right interaction" pattern that advanced
 * board games (Catan-class) otherwise have to re-implement by hand.
 */
export interface BoardInteractionsContext<I extends string = string> {
  /**
   * All board-surface interactions projected onto the controlling seat
   * — both available and unavailable. Rendered greyed-out states can
   * key off this even when the interaction isn't dispatchable yet.
   */
  interactions: ReadonlyArray<InteractionDescriptor<I>>;
  /**
   * Per-target-kind eligibility sets merged across every currently-
   * available board interaction. `eligible.vertex` answers "which
   * vertex ids can be clicked right now?" without the caller manually
   * unioning descriptor eligibility across handles or knowing the
   * authored input key.
   */
  eligible: BoardEligibleTargets;
  /**
   * True when `targetId` is eligible for at least one available
   * interaction. Pass `kind` to scope the check to a specific
   * board target kind.
   */
  isEligible(targetId: string, kind?: BoardTargetKind): boolean;
  /**
   * Target-kind dispatch. Routes by board geometry (`edge`, `vertex`,
   * `space`, `tile`) rather than authored input-key strings.
   */
  pendingInteraction: BoardPendingInteraction<I> | null;
  select: {
    edge(
      targetId: string,
      extraInputs?: Record<string, unknown>,
    ): Promise<BoardSelectionResult<I>>;
    vertex(
      targetId: string,
      extraInputs?: Record<string, unknown>,
    ): Promise<BoardSelectionResult<I>>;
    space(
      targetId: string,
      extraInputs?: Record<string, unknown>,
    ): Promise<BoardSelectionResult<I>>;
    tile(
      targetId: string,
      extraInputs?: Record<string, unknown>,
    ): Promise<BoardSelectionResult<I>>;
  };
  /**
   * Reducer-aware target layers for board primitives. Pass these directly
   * to grids so eligibility, dispatch, and submit error handling stay in
   * one place instead of being re-wired per component.
   */
  targetLayers: {
    edge: BoardTargetLayerFactory;
    vertex: BoardTargetLayerFactory;
    space: BoardTargetLayerFactory;
    tile: BoardTargetLayerFactory;
  };
  targetState(
    targetKind: BoardTargetKind,
    targetId: string,
    options?: Pick<BoardTargetLayerOptions, "enabled" | "interactionKeys">,
  ): InteractiveTargetState;
  selectTarget(
    descriptor: InteractionDescriptor<I>,
    targetKind: BoardTargetKind,
    targetId: string,
    inputKey: string,
    extraInputs?: Record<string, unknown>,
  ): Promise<BoardSelectionResult<I>>;
}

/**
 * Board-surface orchestration helper that removes the boilerplate of
 * wiring many `useInteractionById(...)` calls, merging their
 * eligibility sets, and dispatching clicks to the right handle.
 *
 * Internal board primitive controller for games that keep multiple board
 * interactions live simultaneously and dispatch by target geometry. The
 * typical
 * Catan-class shape:
 *
 * ```tsx
 * const board = useBoardInteractions();
 *
 * return (
 *   <HexGrid
 *     interactiveVertices={board.targetLayers.vertex()}
 *     interactiveEdges={board.targetLayers.edge()}
 *     onTileClick={(id) => board.select.space(id)}
 *   />
 * );
 * ```
 *
 * Mount generated interaction routes with `<Interaction.Switch routes={...}>`
 * for interactions that need more input after a board target is selected.
 *
 * Eligibility and availability remain authoritative on reducer-projected
 * descriptors. Armed routed descriptors beat ambient board descriptors.
 * Multiple unarmed matches are ambiguous and throw
 * {@link BoardInteractionConflictError}.
 */
export function useBoardInteractions<I extends string = string>(
  options: BoardInteractionsOptions = {},
): BoardInteractionsContext<I> {
  const { targetKinds } = options;

  const runtime = useRuntimeContext();
  const { controllingPlayerId } = usePluginSession();
  const store = useInteractionUiStore();
  const subscribedArmedBySurface = useStore(store, (state) => state.arms);
  const subscribedDrafts = useStore(store, (state) => state.drafts);
  const pendingInteractionKey = useStore(
    store,
    (state) => state.pendingInteractionKey,
  );
  const armedBySurface = store.getState().arms ?? subscribedArmedBySurface;
  const drafts = store.getState().drafts ?? subscribedDrafts;
  const descriptors = usePluginGameplayFrameSelector(
    (frame) =>
      (frame.availableInteractions ?? []) as ReadonlyArray<InteractionDescriptor>,
  );

  const targetKindSet = useMemo(
    () => new Set<BoardTargetKind>(targetKinds),
    [targetKinds],
  );
  const armedIds = useMemo(
    () => new Set(Object.values(armedBySurface)),
    [armedBySurface],
  );

  const interactions = useMemo<ReadonlyArray<InteractionDescriptor<I>>>(() => {
    return descriptors.flatMap(
      (descriptor): Array<InteractionDescriptor<I>> => {
        if (armedIds.has(descriptor.interactionKey)) {
          return [
            { ...descriptor, interactionKey: descriptor.interactionKey as I },
          ];
        }
        if (hasCardTargetInput(descriptor)) return [];
        if (!hasBoardTargetInput(descriptor)) return [];
        const include =
          !targetKinds || targetKinds.length === 0
            ? true
            : (
                Object.keys(
                  eligibleTargetsByBoardKind(descriptor),
                ) as BoardTargetKind[]
              ).some((kind) => targetKindSet.has(kind));
        return include
          ? [{ ...descriptor, interactionKey: descriptor.interactionKey as I }]
          : [];
      },
    );
  }, [armedIds, descriptors, targetKindSet, targetKinds]);

  const eligible = useMemo<BoardEligibleTargets>(() => {
    const acc: Record<BoardTargetKind, Set<string>> = {
      edge: new Set<string>(),
      vertex: new Set<string>(),
      space: new Set<string>(),
      tile: new Set<string>(),
    };
    for (const descriptor of interactions) {
      if (!isInteractionAvailable(descriptor)) continue;
      const targetsByKind = eligibleTargetsByBoardKind(
        descriptor,
        drafts[descriptor.interactionKey] ?? {},
      );
      for (const [targetKind, ids] of Object.entries(targetsByKind) as Array<
        [BoardTargetKind, readonly string[] | undefined]
      >) {
        if (!ids) continue;
        const bucket = acc[targetKind];
        for (const id of ids) bucket.add(id);
      }
    }
    return acc;
  }, [drafts, interactions]);

  const isEligible = useCallback(
    (targetId: string, kind?: BoardTargetKind) => {
      if (kind !== undefined) {
        return eligible[kind].has(targetId);
      }
      for (const bucket of Object.values(eligible)) {
        if (bucket.has(targetId)) return true;
      }
      return false;
    },
    [eligible],
  );

  const clearPendingInteraction = useCallback(
    (descriptor: InteractionDescriptor) => {
      clearInteractionRoute(store, descriptor);
    },
    [store],
  );

  const resolveSelection = useCallback(
    async (
      descriptor: InteractionDescriptor<I>,
      inputKey: string,
      targetId: string,
      extraInputs?: Record<string, unknown>,
    ): Promise<BoardSelectionResult<I>> => {
      if (!controllingPlayerId) return { status: "none" };
      const { params, readiness } = routeInteractionTarget(store, descriptor, {
        inputKey,
        value: targetId,
        extraInputs,
      });
      if (shouldRouteInteractionPending(descriptor, readiness)) {
        markInteractionPending(store, descriptor);
        return {
          status: "pending",
          interactionKey: descriptor.interactionKey as I,
          descriptor,
          missingInputs: readiness.missingInputs,
        };
      }

      const submitParams = applyInteractionInputDefaults<
        Record<string, unknown>
      >(descriptor, params);
      if (!claimInteractionSubmit(store, descriptor)) {
        return {
          status: "submitted",
          interactionKey: descriptor.interactionKey as I,
          descriptor,
        };
      }
      try {
        await runtime.submitInteraction(
          descriptor.interactionId,
          submitParams as Record<string, unknown>,
        );
        clearPendingInteraction(descriptor);
        return {
          status: "submitted",
          interactionKey: descriptor.interactionKey as I,
          descriptor,
        };
      } catch (error) {
        throw validationErrorFromUnknown(error);
      } finally {
        store.setSubmitting(descriptor.interactionKey, false);
      }
    },
    [clearPendingInteraction, controllingPlayerId, runtime, store],
  );

  const resolveTargetMatches = useCallback(
    (
      targetKind: BoardTargetKind,
      targetId: string,
      interactionKeys?: readonly string[],
    ): Array<MatchingDescriptor<I>> => {
      const allowedInteractionKeys = interactionKeys
        ? new Set(interactionKeys)
        : null;
      const matches = interactions.flatMap((descriptor) => {
        if (
          allowedInteractionKeys &&
          !allowedInteractionKeys.has(descriptor.interactionKey)
        ) {
          return [];
        }
        if (!isInteractionAvailable(descriptor)) return [];
        const draft = drafts[descriptor.interactionKey] ?? {};
        const inputKey = inputKeyForTarget(
          descriptor,
          targetKind,
          targetId,
          draft,
        );
        if (!inputKey) return [];
        const input = inputByTarget(descriptor, targetKind, targetId, draft);
        if (input && !isTargetSelectable(input, draft, targetId)) {
          return [];
        }
        const targets = eligibleTargetsForInput(descriptor, inputKey, draft);
        if (!targets || !targets.includes(targetId)) return [];
        return [
          {
            descriptor,
            inputKey,
            armed: armedIds.has(descriptor.interactionKey),
          },
        ];
      });
      return matches;
    },
    [armedIds, drafts, interactions],
  );

  const selectByKind = useCallback(
    async (
      targetKind: BoardTargetKind,
      targetId: string,
      extraInputs?: Record<string, unknown>,
      interactionKeys?: readonly string[],
    ): Promise<BoardSelectionResult<I>> => {
      if (!controllingPlayerId) return { status: "none" };
      const matches = resolveTargetMatches(
        targetKind,
        targetId,
        interactionKeys,
      );
      const selected = selectDispatchCandidate(matches, targetKind, targetId);
      if (selected) {
        const { descriptor, inputKey } = selected;
        return resolveSelection(descriptor, inputKey, targetId, extraInputs);
      }
      return { status: "none" };
    },
    [controllingPlayerId, resolveSelection, resolveTargetMatches],
  );

  const select = useMemo(
    () => ({
      edge: (targetId: string, extraInputs?: Record<string, unknown>) =>
        selectByKind("edge", targetId, extraInputs),
      vertex: (targetId: string, extraInputs?: Record<string, unknown>) =>
        selectByKind("vertex", targetId, extraInputs),
      space: (targetId: string, extraInputs?: Record<string, unknown>) =>
        selectByKind("space", targetId, extraInputs),
      tile: (targetId: string, extraInputs?: Record<string, unknown>) =>
        selectByKind("tile", targetId, extraInputs),
    }),
    [selectByKind],
  );

  const targetState = useCallback(
    (
      targetKind: BoardTargetKind,
      targetId: string,
      options: Pick<
        BoardTargetLayerOptions,
        "enabled" | "interactionKeys"
      > = {},
    ): InteractiveTargetState => {
      const enabled = options.enabled !== false;
      const matches = enabled
        ? resolveTargetMatches(targetKind, targetId, options.interactionKeys)
        : [];
      const armed = matches.filter((match) => match.armed);
      const candidates = armed.length > 0 ? armed : matches;
      const selected = candidates[0] ?? null;
      const conflict = candidates.length > 1;
      const pending = selected
        ? pendingInteractionKey === selected.descriptor.interactionKey
        : false;
      const eligible = enabled && !!selected && !conflict;
      return {
        kind: targetKind,
        id: targetId,
        eligible,
        selectable: eligible && !!controllingPlayerId,
        hovered: false,
        interactionKey: selected?.descriptor.interactionKey,
        interactionId: selected?.descriptor.interactionId,
        inputKey: selected?.inputKey,
        pending,
        conflict,
        conflictInteractionKeys: conflict
          ? candidates.map((candidate) => candidate.descriptor.interactionKey)
          : undefined,
        unavailableReason: candidateUnavailableReason(selected, conflict),
        browserAttributes: selected
          ? boardTargetBrowserAttributes({
              descriptor: selected.descriptor,
              inputKey: selected.inputKey,
              targetKind,
              targetId,
              enabled: eligible && !!controllingPlayerId,
              draft: drafts[selected.descriptor.interactionKey] ?? {},
            })
          : undefined,
      };
    },
    [controllingPlayerId, drafts, pendingInteractionKey, resolveTargetMatches],
  );

  const targetLayers = useMemo(() => {
    const createLayer =
      (targetKind: BoardTargetKind): BoardTargetLayerFactory =>
      (layerOptions = {}) => {
        const {
          enabled,
          interactionKeys,
          extraInputs,
          onBeforeSelect,
          onError,
        } = layerOptions;
        const resolveExtraInputs = (targetId: string) =>
          typeof extraInputs === "function"
            ? extraInputs(targetId)
            : extraInputs;
        return {
          enabled,
          eligible: eligible[targetKind],
          targetState: (targetId: string) => ({
            ...targetState(targetKind, targetId, { enabled, interactionKeys }),
            select: async () => {
              if (enabled === false) return { status: "none" };
              onBeforeSelect?.();
              try {
                return await selectByKind(
                  targetKind,
                  targetId,
                  resolveExtraInputs(targetId),
                  interactionKeys,
                );
              } catch (error) {
                onError?.(error);
                if (!onError) throw error;
                return { status: "none" };
              }
            },
          }),
          selectTargetId: async (targetId: string) => {
            if (enabled === false) return { status: "none" };
            onBeforeSelect?.();
            try {
              return await selectByKind(
                targetKind,
                targetId,
                resolveExtraInputs(targetId),
                interactionKeys,
              );
            } catch (error) {
              onError?.(error);
              if (!onError) throw error;
              return { status: "none" };
            }
          },
        };
      };
    return {
      edge: createLayer("edge"),
      vertex: createLayer("vertex"),
      space: createLayer("space"),
      tile: createLayer("tile"),
    };
  }, [eligible, selectByKind, targetState]);

  const pendingInteraction = useMemo<BoardPendingInteraction<I> | null>(() => {
    if (!pendingInteractionKey) return null;
    const descriptor = interactions.find(
      (candidate) => candidate.interactionKey === pendingInteractionKey,
    );
    if (!descriptor) return null;
    return {
      interactionKey: descriptor.interactionKey as I,
      descriptor,
      missingInputs: missingInputsForDraft(
        descriptor,
        drafts[descriptor.interactionKey] ?? {},
      ),
      clear: () => clearPendingInteraction(descriptor),
    };
  }, [clearPendingInteraction, drafts, interactions, pendingInteractionKey]);

  const selectTarget = useCallback(
    (
      descriptor: InteractionDescriptor<I>,
      _targetKind: BoardTargetKind,
      targetId: string,
      inputKey: string,
      extraInputs?: Record<string, unknown>,
    ) => resolveSelection(descriptor, inputKey, targetId, extraInputs),
    [resolveSelection],
  );

  return useMemo(
    () => ({
      interactions,
      eligible,
      isEligible,
      pendingInteraction,
      select,
      targetLayers,
      targetState,
      selectTarget,
    }),
    [
      interactions,
      eligible,
      isEligible,
      pendingInteraction,
      select,
      targetLayers,
      targetState,
      selectTarget,
    ],
  );
}

function isTargetSelectable(
  input: NonNullable<ReturnType<typeof inputByTarget>>,
  draft: Readonly<Record<string, unknown>>,
  targetId: string,
): boolean {
  const selection = isTargetDomain(input.domain)
    ? input.domain.selection
    : undefined;
  if (selection?.mode !== "many" || !selection.distinct) return true;
  const current = draft[input.key];
  if (!Array.isArray(current)) return true;
  if (current.map((item) => String(item)).includes(targetId)) return true;
  return selection.max === undefined || current.length < selection.max;
}

function missingInputsForDraft(
  descriptor: InteractionDescriptor,
  draft: Readonly<Record<string, unknown>>,
): string[] {
  return [...getInteractionDraftReadiness(descriptor, draft).missingInputs];
}

interface MatchingDescriptor<I extends string> {
  descriptor: InteractionDescriptor<I>;
  inputKey: string;
  armed: boolean;
}

const GAMEPLAY_BROWSER_SCOPE_ID = "runtime";

function boardTargetBrowserAttributes({
  descriptor,
  inputKey,
  targetKind,
  targetId,
  enabled,
  draft,
}: {
  descriptor: InteractionDescriptor;
  inputKey: string;
  targetKind: BoardTargetKind;
  targetId: string;
  enabled: boolean;
  draft: Readonly<Record<string, unknown>>;
}): BrowserInteractionAttributeMap {
  return createGameplayActuatorAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    intent: "select",
    enabled,
    actuatorKind: "click",
    actuatorId: `board:${targetKind}:${targetId}`,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(descriptor.draftDigest !== undefined
      ? { draftDigest: interactionDraftDigestForValues(descriptor, draft) }
      : {}),
    inputKey,
    candidateValue: targetId,
    candidateState: isBoardTargetSelected(draft[inputKey], targetId)
      ? "selected"
      : "unselected",
    semanticEffects: gameplayCandidateMetadata({
      descriptor,
      draftValues: draft,
      inputKey,
      candidateValue: targetId,
      intent: "select",
    }).semanticEffects,
  });
}

function isBoardTargetSelected(value: unknown, targetId: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => String(item) === targetId);
  }
  return value !== undefined && String(value) === targetId;
}

function selectDispatchCandidate<I extends string>(
  matches: ReadonlyArray<MatchingDescriptor<I>>,
  targetKind: BoardTargetKind,
  targetId: string,
): MatchingDescriptor<I> | null {
  if (matches.length === 0) return null;
  const armed = matches.filter((match) => match.armed);
  const candidates = armed.length > 0 ? armed : matches;
  if (candidates.length > 1) {
    throw new BoardInteractionConflictError({
      targetKind,
      targetId,
      interactionKeys: candidates.map(
        (winner) => winner.descriptor.interactionKey,
      ),
    });
  }
  return candidates[0] ?? null;
}

function candidateUnavailableReason<I extends string>(
  match: MatchingDescriptor<I> | null,
  conflict: boolean,
): string | undefined {
  if (conflict) return "conflict";
  if (!match) return "unavailable";
  if (!isInteractionAvailable(match.descriptor)) return "unavailable";
  return undefined;
}
