import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  CardDragSurface,
  CardDropTargetView,
  HandView,
  StagingZone,
  type CardIntent,
  type CardDropTargetVisualState,
  type HandLayoutKind,
  type HandLayoutPolicy,
  type HandInteractionPolicy,
  type InteractionVisualState,
  type ViewCard,
} from "../../ui.js";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";
import { usePluginState } from "../context/PluginStateContext.js";
import { useInteractionUiStore } from "../context/InteractionDraftContext.js";
import {
  encodeRuntimeDropTargetKind,
  projectDraftCardState,
  selectedCardIdsForZone,
  type RuntimeDropTargetKind,
} from "../utils/card-intent-adapter.js";
import {
  isResolvedTargetDomain,
  isTargetDomain,
  validateInteractionInputDomains,
} from "../utils/interaction-inputs.js";
import {
  useCardIntentAdapter,
  type AuthoredCardIntent,
  type RuntimeCardIntentResult,
} from "./hand-intent-adapter.js";
import type {
  InteractionDescriptor,
  PluginRuntimeProjection,
} from "../types/plugin-state.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import { createZoneCardRenderItem, type ZoneCardRenderItem } from "./zone.js";

export interface RuntimeDropTarget {
  /** Stable opaque id; runtime adapter encodes the inputKey + value here. */
  targetId: string;
  /** Plain text label used by the SDK live-region announcements. */
  label: string;
  /** Optional `CardDropTargetVisualState` overrides. */
  visualState?: CardDropTargetVisualState;
  /** Visible content inside the drop target. */
  render: (state: CardDropTargetVisualState) => ReactNode;
  /** ARIA role override. Defaults to "button". */
  role?: string;
  /** Extra container className. */
  className?: string;
  /** Order hint for keyboard traversal. */
  order?: number;
}

/**
 * Per-hand summary projected alongside the card list. Authors can render
 * counts ("3 of 5 selected") without re-deriving selection state.
 */
export interface HandSelectionSummary {
  /** How many cards in this hand are part of the active many-select draft. */
  selectedCount: number;
  /** Card ids currently in the many-select draft, in iteration order. */
  selectedIds: readonly string[];
  /**
   * Whether at least one descriptor in this zone has form-side validation
   * errors against the current draft. Authors can use this to render an
   * inline hint without inspecting individual fields.
   */
  hasInvalidSelection: boolean;
}

export interface HandSurfaceViewProps<Card extends ZoneCardRenderItem> {
  zone: string;
  cards: readonly Card[];
  /** Visual surface for a single card. */
  renderCard: (
    card: Card,
    state: InteractionVisualState,
    index: number,
  ) => ReactNode;
  /**
   * Render-safe slot for selection summary content. Fires during render
   * with the latest projected summary so authors can compose count chrome
   * (e.g. "3 of 5 selected") inline. The returned node is hoisted above
   * the hand region. Use this for visible UI; use `onSelectionSummary`
   * only for analytics or external state mirrors that need an effect.
   */
  renderSummary?: (summary: HandSelectionSummary) => ReactNode;
  /**
   * Optional selection summary observer. Invoked from a layout effect so
   * consumers may safely call `setState` in response. Use `renderSummary`
   * for inline rendering instead — that path avoids effect-timing
   * surprises.
   */
  onSelectionSummary?: (summary: HandSelectionSummary) => void;
  /**
   * Render-safe slot for the hand's commit/action chrome (e.g. a submit
   * button for a many-select interaction). Receives the same live summary as
   * `renderSummary`. Rendered below the hand inline on desktop and pinned as a
   * sticky footer inside the mobile dock, so the action stays reachable while
   * the hand is docked. Use this instead of anchoring the action elsewhere on
   * the board, where the dock would otherwise hide it.
   */
  renderActions?: (summary: HandSelectionSummary) => ReactNode;
  /** Layout policy forwarded to the SDK HandView. */
  layout?: HandLayoutKind | HandLayoutPolicy;
  /** Mobile interaction policy. Defaults to `direct-activate`. */
  mobileInteraction?: HandInteractionPolicy;
  /**
   * Drop targets to render around the hand. When provided, the hand renders
   * inside a `CardDragSurface` so SDK `drop` intents arrive with an opaque
   * target id that the runtime adapter can decode.
   */
  dropTargets?: readonly RuntimeDropTarget[];
  /**
   * Optional outer chrome around the drop targets, when `dropTargets` is
   * provided. Defaults to a flex row above the hand.
   */
  renderDropTargets?: (children: ReactNode) => ReactNode;
  /** Card width hint forwarded to the SDK HandView. */
  cardSize?: "sm" | "md" | "lg";
  /** Extra empty-state slot. */
  renderEmpty?: () => ReactNode;
  /** ARIA label for the hand region. */
  ariaLabel?: string;
  /**
   * Optional analytics hook. Receives the decoded authored intent (so
   * `targetId` is the manifest value, not the SDK opaque encoding) plus
   * the runtime classification.
   */
  onIntentRouted?: (
    intent: AuthoredCardIntent,
    result: RuntimeCardIntentResult,
  ) => void;
  className?: string;
}

/**
 * Generated hand presentation entry point.
 *
 * Lives in `ui-runtime` because it owns:
 *
 * - mapping descriptor/draft state into SDK `InteractionVisualState`
 * - hiding selected cards from the visible hand layout while the runtime keeps
 *   the actual zone snapshot intact
 * - forwarding SDK `CardIntent` through the canonical collector adapter
 *
 * The component is intentionally Dreamboard-aware. The presentational
 * pieces (`HandView`, `CardDragSurface`, `CardDropTargetView`) come from
 * `@dreamboard-games/sdk/ui` and stay descriptor/draft unaware.
 */
export function HandSurfaceView<Card extends ZoneCardRenderItem>({
  zone,
  cards,
  renderCard,
  layout,
  mobileInteraction = "direct-activate",
  dropTargets,
  renderDropTargets,
  cardSize = "sm",
  renderEmpty,
  ariaLabel,
  onIntentRouted,
  onSelectionSummary,
  renderSummary,
  renderActions,
  className,
}: HandSurfaceViewProps<Card>) {
  const route = useCardIntentAdapter({ zone, onResult: onIntentRouted });
  const interactionStore = useInteractionUiStore();
  // Subscribe to the entire drafts slice so selected/invalid state recomputes
  // on every input mutation across all interactions for this zone.
  const drafts = useStore(
    interactionStore,
    useShallow((state) => state.drafts),
  );
  const availableInteractions = usePluginState(
    (state) => state.gameplay.availableInteractions,
  );
  const selectedIds = usePluginState(
    useCallback(
      (state: PluginRuntimeProjection) =>
        selectedCardIdsForZone(interactionStore, zone, state),
      // drafts is part of the store snapshot — useStore handles re-render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [interactionStore, zone, drafts],
    ),
  );

  const visibleCards = useMemo(
    () => cards.filter((card) => !selectedIds.includes(card.id as string)),
    [cards, selectedIds],
  );

  // SDK HandView renders ViewCard. Hidden zone items expose only an id;
  // surface them as a face-down ViewCard so the lifted overlay/staging math
  // still has stable card geometry.
  const viewCards = useMemo<readonly ViewCard[]>(
    () =>
      visibleCards.map((card) =>
        card.hidden
          ? {
              id: card.id as string,
              cardType: "hidden",
              name: "Hidden card",
              properties: {},
            }
          : (card as ViewCard),
      ),
    [visibleCards],
  );

  const cardByViewId = useMemo(() => {
    const index = new Map<string, Card>();
    for (const card of visibleCards) {
      index.set(card.id as string, card);
    }
    return index;
  }, [visibleCards]);

  const cardDescriptorIndex = usePluginState((state) => {
    const snapshot = state.gameplay.zones[zone];
    return snapshot?.playableByCardId ?? {};
  });

  /**
   * Pre-compute, for each candidate descriptor in this zone, the set of
   * card-target input keys plus their current draft values and validation
   * field errors. This lets `stateForCard` answer selected/invalid in O(1)
   * per card without re-running validation per render.
   */
  const draftCardProjection = useMemo(
    () =>
      projectDraftCardState(
        availableInteractions,
        drafts,
        validateInteractionInputDomains,
      ),
    [availableInteractions, drafts],
  );

  // Eligibility is descriptor-derived, so compute it once across the visible
  // cards. `allVisibleEligible` lets us drop the per-card highlight when every
  // card is a legal target (the highlight would carry no information then).
  const eligibleCardIds = useMemo(() => {
    const set = new Set<string>();
    for (const card of visibleCards) {
      const cardId = card.id as string;
      const candidates = cardDescriptorIndex[cardId] ?? [];
      const eligible = candidates.some(
        (descriptor: InteractionDescriptor) =>
          isInteractionAvailable(descriptor) &&
          descriptor.inputs.some(
            (input) =>
              isResolvedTargetDomain(input.domain) &&
              input.domain.eligibleTargets.includes(cardId),
          ),
      );
      if (eligible) set.add(cardId);
    }
    return set;
  }, [visibleCards, cardDescriptorIndex]);
  const allVisibleEligible =
    visibleCards.length > 1 && eligibleCardIds.size === visibleCards.length;

  const stateForCard = useCallback(
    (viewCard: ViewCard): InteractionVisualState => {
      const cardId = viewCard.id as string;
      const sourceCard = cardByViewId.get(cardId);
      const eligible = eligibleCardIds.has(cardId);
      const selected = draftCardProjection.some((entry) =>
        entry.draftCardIds.has(cardId),
      );
      const invalid = draftCardProjection.some((entry) =>
        entry.invalidCardIds.has(cardId),
      );
      const disabled =
        !eligible &&
        !selected &&
        sourceCard !== undefined &&
        !sourceCard.hidden &&
        !sourceCard.playable;
      return {
        eligible,
        // Suppressed when the whole hand is eligible — see InteractionVisualState.
        distinctlyEligible: eligible && !allVisibleEligible,
        selected,
        invalid,
        disabled,
      };
    },
    [allVisibleEligible, cardByViewId, draftCardProjection, eligibleCardIds],
  );

  const selectionSummary = useMemo<HandSelectionSummary>(() => {
    const ids = new Set<string>();
    let hasInvalidSelection = false;
    for (const entry of draftCardProjection) {
      for (const cardId of entry.draftCardIds) ids.add(cardId);
      if (entry.invalidCardIds.size > 0) hasInvalidSelection = true;
    }
    return {
      selectedCount: ids.size,
      selectedIds: [...ids],
      hasInvalidSelection,
    };
  }, [draftCardProjection]);

  // Fire the summary observer from an effect so consumers can safely call
  // setState in response. Rendering visible summary chrome should go
  // through `renderSummary` instead.
  const onSelectionSummaryRef = useRef(onSelectionSummary);
  onSelectionSummaryRef.current = onSelectionSummary;
  useEffect(() => {
    onSelectionSummaryRef.current?.(selectionSummary);
  }, [selectionSummary]);

  const summaryContent = renderSummary ? renderSummary(selectionSummary) : null;
  const actionsNode = renderActions ? renderActions(selectionSummary) : null;
  // Pinned as a sticky footer so the action stays reachable while the hand is
  // docked on mobile (cards scroll behind it); inline on desktop `sticky` is
  // inert and it simply sits below the hand. The opaque surface background
  // occludes any cards scrolled underneath it in the dock.
  const actionsContent =
    actionsNode !== null && actionsNode !== undefined ? (
      <div
        data-dreamboard-hand-actions=""
        data-zone={zone}
        className="sticky bottom-0 z-10 flex w-full flex-col items-center gap-2 px-3 pb-1 pt-2"
        style={{
          background: "var(--background, #fdfbf7)",
          borderTop: "1px solid var(--border, rgba(45,45,45,0.12))",
        }}
      >
        {actionsNode}
      </div>
    ) : null;

  const handleIntent = useCallback(
    (intent: CardIntent) => {
      void route(intent);
    },
    [route],
  );

  const handView = (
    <HandView
      cards={viewCards}
      layout={layout}
      mobileInteraction={mobileInteraction}
      stateForCard={stateForCard}
      renderCard={(viewCard, state, index) => {
        const source = cardByViewId.get(viewCard.id as string);
        if (!source) return null;
        return renderCard(source, state, index);
      }}
      onCardIntent={handleIntent}
      cardSize={cardSize}
      renderEmpty={renderEmpty}
      aria-label={ariaLabel}
      className={className}
    />
  );

  if (!dropTargets || dropTargets.length === 0) {
    if (summaryContent === null && actionsContent === null) {
      return handView;
    }
    return (
      <Fragment>
        {summaryContent !== null ? (
          <div
            data-dreamboard-runtime-hand-summary=""
            data-zone={zone}
            data-selection-count={selectionSummary.selectedCount}
            data-has-invalid-selection={
              selectionSummary.hasInvalidSelection ? "true" : "false"
            }
          >
            {summaryContent}
          </div>
        ) : null}
        {handView}
        {actionsContent}
      </Fragment>
    );
  }

  const targets = dropTargets.map((target) => (
    <CardDropTargetView
      key={target.targetId}
      targetId={target.targetId}
      state={target.visualState}
      label={target.label}
      role={target.role}
      order={target.order}
      className={target.className}
      renderTarget={target.render}
    />
  ));

  return (
    <CardDragSurface onCardIntent={handleIntent}>
      {summaryContent !== null ? (
        <div
          data-dreamboard-runtime-hand-summary=""
          data-zone={zone}
          data-selection-count={selectionSummary.selectedCount}
          data-has-invalid-selection={
            selectionSummary.hasInvalidSelection ? "true" : "false"
          }
        >
          {summaryContent}
        </div>
      ) : null}
      {renderDropTargets ? (
        renderDropTargets(<Fragment>{targets}</Fragment>)
      ) : (
        <div data-dreamboard-runtime-drop-row="" className="flex gap-2 mb-2">
          {targets}
        </div>
      )}
      {handView}
      {actionsContent}
    </CardDragSurface>
  );
}

export interface HandStagingViewProps {
  /** Zone whose many-select collection this stages. */
  zone: string;
  /** Visual for a staged card. */
  renderCard: (card: ZoneCardRenderItem) => ReactNode;
  /** Custom empty-slot content. */
  renderEmptySlot?: (index: number) => ReactNode;
  /** Heading above the slots. */
  label?: ReactNode;
  cardSize?: "sm" | "md" | "lg";
  ariaLabel?: string;
  className?: string;
}

/** First available many-select card-target selection scoped to `zone`. */
function manyCardSelectionForZone(
  availableInteractions: readonly InteractionDescriptor[],
  zone: string,
): { max?: number } | null {
  for (const descriptor of availableInteractions) {
    if (!isInteractionAvailable(descriptor)) continue;
    for (const input of descriptor.inputs) {
      if (!isTargetDomain(input.domain)) continue;
      if (input.domain.type !== "cardTarget") continue;
      const declaredZones =
        input.domain.zoneId !== undefined
          ? [input.domain.zoneId]
          : (input.domain.zoneIds ?? []);
      if (declaredZones.length !== 0 && !declaredZones.includes(zone)) continue;
      if (input.domain.selection?.mode === "many")
        return input.domain.selection;
    }
  }
  return null;
}

/**
 * Dreamboard-aware staging surface for a many-select card collection (e.g. the
 * cards you've chosen to pass). Projects the live draft into a fixed,
 * always-visible row of slots (empty placeholders until something is staged);
 * tapping a staged card routes an `activate` intent, which toggles it back out
 * of the collection so it returns to the hand. Adds no draft logic — the
 * presentational layout/theming lives in the SDK `StagingZone`.
 *
 * Renders nothing when the zone has no active many-select collection and
 * nothing staged, so authors can mount it unconditionally.
 */
export function HandStagingView({
  zone,
  renderCard,
  renderEmptySlot,
  label,
  cardSize = "sm",
  ariaLabel,
  className,
}: HandStagingViewProps) {
  const interactionStore = useInteractionUiStore();
  const drafts = useStore(
    interactionStore,
    useShallow((state) => state.drafts),
  );
  const stagedIds = usePluginState(
    useCallback(
      (state: PluginRuntimeProjection) =>
        selectedCardIdsForZone(interactionStore, zone, state),
      // drafts is part of the store snapshot — useStore handles re-render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [interactionStore, zone, drafts],
    ),
  );
  const zoneSnapshot = usePluginState(
    (state) => state.gameplay.zones[zone] ?? null,
  );
  const availableInteractions = usePluginState(
    (state) => state.gameplay.availableInteractions,
  );

  const cards = useMemo(
    () =>
      stagedIds
        .map((cardId, index) =>
          createZoneCardRenderItem(zone, zoneSnapshot, cardId, index),
        )
        .filter((card) => !card.hidden),
    [stagedIds, zone, zoneSnapshot],
  );

  const selection = useMemo(
    () => manyCardSelectionForZone(availableInteractions, zone),
    [availableInteractions, zone],
  );
  const slotCount =
    selection?.max ?? (selection ? Math.max(cards.length, 1) : cards.length);

  const route = useCardIntentAdapter({ zone });
  const onRemove = useCallback(
    (cardId: string) => {
      void route({ type: "activate", cardId, source: "tap" });
    },
    [route],
  );

  if (slotCount <= 0 && cards.length === 0) return null;

  return (
    <StagingZone
      cards={cards as readonly ViewCard[]}
      slotCount={slotCount}
      size={cardSize}
      renderCard={(card) => renderCard(card as ZoneCardRenderItem)}
      onRemove={onRemove}
      renderEmptySlot={renderEmptySlot}
      label={label}
      aria-label={ariaLabel}
      className={className}
    />
  );
}

/**
 * Convenience helper for builders of generated hand surfaces. Encodes a
 * typed target kind plus value into the opaque `targetId` that the SDK
 * presents to its drop pipeline. The runtime adapter resolves the kind to
 * the matching descriptor input at drop time, so authors never need to
 * know collector input names. Generated typed targets call this internally.
 */
export function dropTargetIdFor(
  kind: RuntimeDropTargetKind,
  value: string,
): string {
  return encodeRuntimeDropTargetKind(kind, value);
}

/**
 * Determine whether any descriptor in the available list expects a board or
 * card destination input alongside a card target. Used by generated facades
 * to decide whether to mount a drag surface even before the author wires
 * dropTargets.
 */
export function descriptorsHaveDestinationInput(
  state: PluginRuntimeProjection,
): boolean {
  for (const descriptor of state.gameplay.availableInteractions) {
    const cardInputs = descriptor.inputs.filter(
      (input) =>
        isTargetDomain(input.domain) && input.domain.type === "cardTarget",
    );
    const destinationInputs = descriptor.inputs.filter(
      (input) =>
        isTargetDomain(input.domain) && input.domain.type !== "cardTarget",
    );
    if (cardInputs.length > 0 && destinationInputs.length > 0) return true;
  }
  return false;
}
