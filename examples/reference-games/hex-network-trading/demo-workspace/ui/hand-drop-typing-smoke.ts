import { Zone } from "#dreamboard/ui-contract";

// Frontier-trails has board spaces, so the generated typed hand surface
// constrains drop targets to the manifest's BoardTargetId union. These
// cases assert that:
//
// 1. A valid space drop target compiles.
// 2. An unknown space target id fails to typecheck.
// 3. The `onCardIntent` `targetId` is constrained, not widened to string.

const charterHand = Zone.useHand("charterHand", {
  zone: "charter-hand",
  role: "auxiliary",
  label: "Charter cards",
});

// children receives the projected InteractionVisualState so authors can
// wire SDK CardFace directly without recomputing draft state.
const validHandWithChildrenState = charterHand.Hand({
  children: charterHand.Cards({
    children: (card, state) => {
      const _eligible: boolean | undefined = state.eligible;
      const _selected: boolean | undefined = state.selected;
      const _invalid: boolean | undefined = state.invalid;
      const _disabled: boolean | undefined = state.disabled;
      void [_eligible, _selected, _invalid, _disabled, card];
      return null;
    },
  }),
});

const validHandWithDropTarget = charterHand.Hand({
  children: null,
  layout: { desktop: "fan", mobile: "tray" },
  mobileInteraction: "drag-to-target",
  dropTargets: [
    {
      target: { kind: "space", target: "h-0-0" },
      label: "Place at hex 0,0",
      render: () => null,
    },
  ],
  onCardIntent: (intent) => {
    if (intent.type === "drop") {
      // intent.targetId should narrow to a manifest BoardTargetId.
      const _targetId: typeof intent.targetId = intent.targetId;
      void _targetId;
    }
  },
});

const invalidHandDropTargetId = charterHand.Hand({
  children: null,
  dropTargets: [
    {
      // @ts-expect-error board target ids are constrained by the manifest.
      target: { kind: "space", target: "not-a-real-hex" },
      label: "Bogus",
      render: () => null,
    },
  ],
});

const invalidSpaceIdAsEdgeKind = charterHand.Hand({
  children: null,
  dropTargets: [
    {
      // @ts-expect-error a SpaceId is not assignable to an edge target.
      target: { kind: "edge", target: "h-0-0" },
      label: "Wrong kind",
      render: () => null,
    },
  ],
});

const invalidSpaceIdAsVertexKind = charterHand.Hand({
  children: null,
  dropTargets: [
    {
      // @ts-expect-error a SpaceId is not assignable to a vertex target.
      target: { kind: "vertex", target: "h-0-0" },
      label: "Wrong kind",
      render: () => null,
    },
  ],
});

const invalidHandIntentTargetWidening = charterHand.Hand({
  children: null,
  onCardIntent: (intent) => {
    if (intent.type === "drop") {
      // @ts-expect-error widened target ids must not be assignable.
      const _bogus: "freeform-anything" = intent.targetId;
      void _bogus;
    }
  },
});

// Selection summary observer must be typed against the manifest CardId family.
const validHandWithSummary = charterHand.Hand({
  children: null,
  onSelectionSummary: (summary) => {
    const _count: number = summary.selectedCount;
    const _ids: readonly string[] = summary.selectedIds;
    const _invalid: boolean = summary.hasInvalidSelection;
    void [_count, _ids, _invalid];
  },
});

void validHandWithChildrenState;
void validHandWithDropTarget;
void validHandWithSummary;
void invalidHandDropTargetId;
void invalidSpaceIdAsEdgeKind;
void invalidSpaceIdAsVertexKind;
void invalidHandIntentTargetWidening;
