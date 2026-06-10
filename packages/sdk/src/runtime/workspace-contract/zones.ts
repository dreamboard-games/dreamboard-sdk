import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Fragment as ReactFragment, createElement } from "react";
import { clsx } from "clsx";
import { usePluginState } from "../context/PluginStateContext.js";
import { CardFace, type ViewCard } from "../../ui.js";
import type { InteractionCardInputRenderState } from "../primitives/index.js";
import type { ZoneListProps } from "../primitives/zone.js";
import type { PluginStateSnapshot } from "../types/plugin-state.js";
import { createHandPieces } from "./hand.js";
import { createCardInputSlot } from "./slots.js";
import type {
  WorkspaceCardCollectionSurfaceDescriptor,
  WorkspaceContractContext,
  WorkspaceHandOptions,
  WorkspaceHandSurfaceDescriptor,
  WorkspacePileSurfaceDescriptor,
  WorkspacePilesSurfaceDescriptor,
} from "./types.js";

const DEFAULT_ZONE_CARD_CLASS =
  "group relative border-0 bg-transparent p-0 transition-transform enabled:cursor-pointer enabled:hover:-translate-y-2 data-[selected=true]:-translate-y-3 disabled:cursor-not-allowed data-[eligible=false]:opacity-45 data-[eligible=false]:grayscale data-[eligible=false]:hover:translate-y-0 data-[card-available=false]:opacity-45 data-[card-available=false]:grayscale";

function cardRenderItemToViewCard(card: unknown, cardId: string): ViewCard {
  if (
    card &&
    typeof card === "object" &&
    "hidden" in card &&
    (card as { hidden?: unknown }).hidden === false
  ) {
    return card as unknown as ViewCard;
  }
  return {
    id: cardId,
    cardType: "hidden",
    name: "Hidden card",
    properties: {},
  };
}

export function createZoneCardsComponent<Card>(
  ctx: WorkspaceContractContext<Card>,
  zones: readonly string[],
) {
  const { baseUI, runtimeZone } = ctx;
  return ({
    empty,
    children,
    ...props
  }: {
    empty?: ReactNode;
    children: (card: Card) => ReactNode;
  } & Omit<ZoneListProps, "children" | "empty">) =>
    createElement(
      ReactFragment,
      null,
      ...zones.map((zone) =>
        createElement(baseUI.Zone.Root, {
          key: zone,
          zone: zone as never,
          children: createElement(runtimeZone.List, {
            ...props,
            empty,
            children,
          }),
        }),
      ),
    );
}

export function createZoneCardComponent<Card>(
  ctx: WorkspaceContractContext<Card>,
) {
  const { options, baseUI, runtimeInteraction } = ctx;
  return ({
    card,
    children,
    className,
    ...props
  }: {
    card: Card;
    children?: ReactNode;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value">) => {
    const cardId = options.cardIdFromZoneCard(card);
    const zone = options.zoneIdFromZoneCard(card);
    const viewCard = cardRenderItemToViewCard(card, cardId);
    const faceDown =
      !!card &&
      typeof card === "object" &&
      "hidden" in card &&
      (card as { hidden?: unknown }).hidden === true;
    const renderCardFace = (state: InteractionCardInputRenderState) =>
      createElement(CardFace, {
        card: viewCard,
        selected: state.selected,
        disabled: state.disabled || !state.eligible,
        faceDown,
        size: "sm",
        children,
      });
    const match = usePluginState((state: PluginStateSnapshot) => {
      const candidates =
        state.gameplay.zones[zone]?.playableByCardId[cardId] ?? [];
      for (const descriptor of candidates) {
        const input = descriptor.inputs.find(
          (candidateInput) =>
            candidateInput.domain.type === "cardTarget" &&
            candidateInput.domain.projection === "resolved" &&
            candidateInput.domain.eligibleTargets.includes(cardId),
        );
        if (input) return { descriptor, input };
      }
      return null;
    });
    if (!match) {
      return createElement(
        "div",
        {
          ...props,
          className: clsx("relative inline-flex", className),
          "data-dreamboard-zone-card": "",
          "data-card-id": cardId,
          "data-zone": zone,
          "data-interactive": false,
        },
        createElement(CardFace, {
          card: viewCard,
          faceDown,
          size: "sm",
          children,
        }),
      );
    }
    return createElement(baseUI.Zone.Root, {
      zone: zone as never,
      children: createElement(runtimeInteraction.Root, {
        interaction: match.descriptor.interactionKey,
        children: createElement(runtimeInteraction.CardInput, {
          ...props,
          className: clsx(DEFAULT_ZONE_CARD_CLASS, className),
          input: match.input.key,
          unsafeCardId: cardId,
          children: renderCardFace,
        }),
      }),
    });
  };
}

/**
 * Assembles the `Zone` namespace for one workspace contract. Called once per
 * `createWorkspaceUIContract` invocation.
 */
export function createZoneNamespace<Card>(ctx: WorkspaceContractContext<Card>) {
  const { createHandCardsComponent, createStagingComponent } =
    createHandPieces(ctx);

  return {
    hand<Zone extends string>(
      zone: Zone,
      options: Omit<WorkspaceHandSurfaceDescriptor<Zone>, "kind" | "zone">,
    ): WorkspaceHandSurfaceDescriptor<Zone> {
      return { kind: "hand", zone, ...options };
    },
    pile<Zone extends string>(
      zone: Zone,
    ): WorkspacePileSurfaceDescriptor<Zone> {
      return { kind: "pile", zone };
    },
    piles<const Zones extends readonly string[]>(
      zones: Zones,
    ): WorkspacePilesSurfaceDescriptor<Zones> {
      return { kind: "piles", zones };
    },
    collection<const Zones extends readonly string[]>(
      zones: Zones,
      options: { mode?: "all" | "top-card" } = {},
    ): WorkspaceCardCollectionSurfaceDescriptor<Zones> {
      return { kind: "cardCollection", zones, mode: options.mode };
    },
    useHand(_name: string, zoneOptions: WorkspaceHandOptions) {
      const handComponentOptions = {
        name: _name,
        zone: zoneOptions.zone,
        role: zoneOptions.role,
        label: zoneOptions.label,
        order: zoneOptions.order,
      };
      return {
        Hand: createHandCardsComponent(handComponentOptions),
        Card: createZoneCardComponent(ctx),
        Staging: createStagingComponent(handComponentOptions),
        slot: { card: createCardInputSlot(ctx) },
      };
    },
    usePile(_name: string, zoneOptions: { zone: string }) {
      return {
        Pile: createZoneCardsComponent(ctx, [zoneOptions.zone]),
        Card: createZoneCardComponent(ctx),
      };
    },
    useCardCollection(
      _name: string,
      zoneOptions: { zones: readonly string[]; mode?: "all" | "top-card" },
    ) {
      void zoneOptions.mode;
      return {
        Collection: createZoneCardsComponent(ctx, zoneOptions.zones),
        Card: createZoneCardComponent(ctx),
        slot: { card: createCardInputSlot(ctx) },
      };
    },
  };
}
