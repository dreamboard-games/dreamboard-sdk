import {
  createContext,
  useContext,
  useMemo,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import { useInteractionUiStore } from "../context/InteractionDraftContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import type {
  InteractionDescriptor,
  ZoneHandlesSnapshot,
} from "../types/plugin-state.js";
import type { ZoneKey } from "../ui-contract.js";
import {
  inputByTarget,
  interactionInputKeys,
  isResolvedTargetDomain,
} from "../utils/interaction-inputs.js";
import {
  claimInteractionSubmit,
  clearInteractionRoute,
  markInteractionPending,
  routeInteractionTarget,
  shouldRouteInteractionPending,
} from "../utils/interaction-router.js";
import { useGameActionError } from "./game.js";
import { runInteractionAction } from "./interaction-submit.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "../../ui/primitives/primitive-props.js";

interface ZoneContextValue {
  zone: string;
  snapshot: ZoneHandlesSnapshot | null;
}

interface ZoneCardContextValue {
  zone: string;
  cardId: string;
}

/**
 * An item rendered by a zone primitive. Discriminated by `hidden`:
 *
 * - `hidden: false` — fully hydrated from the zone projection. Carries the
 *   authored card type, properties, and reducer-projected interaction state.
 * - `hidden: true` — the zone snapshot exposes the card id but withholds its
 *   contents (e.g. opponent zones, or a zone that is projected count-only).
 *   The render contract is honest about not knowing the type; authors must
 *   narrow on `hidden` before reading `cardType` / `properties`.
 *
 * Replaces the previous silent fallback that widened `cardType` to the
 * untyped string `"unknown"` — see SDK Design Principles §2 (strong contracts
 * over comments).
 */
export type ZoneCardRenderItem<
  CardIdValue extends string = string,
  CardTypeValue extends string = string,
  Properties extends Record<string, unknown> = Record<string, unknown>,
> =
  | HydratedZoneCardRenderItem<CardIdValue, CardTypeValue, Properties>
  | HiddenZoneCardRenderItem<CardIdValue>;

export interface HydratedZoneCardRenderItem<
  CardIdValue extends string = string,
  CardTypeValue extends string = string,
  Properties extends Record<string, unknown> = Record<string, unknown>,
> extends ViewCard<CardIdValue, CardTypeValue, Properties> {
  zone: string;
  index: number;
  hidden: false;
  playable: boolean;
  interactions: readonly InteractionDescriptor[];
}

export interface HiddenZoneCardRenderItem<CardIdValue extends string = string> {
  id: CardIdValue;
  zone: string;
  index: number;
  hidden: true;
}

export interface ZonePileContextValue {
  zone: string;
  label: string;
  count: number;
  cards: readonly string[];
  items: readonly ZoneCardRenderItem[];
  hasVisibleCards: boolean;
  isHidden: boolean;
  description: string | null;
}

const ZoneContext = createContext<ZoneContextValue | null>(null);
const ZoneCardContext = createContext<ZoneCardContextValue | null>(null);
const ZonePileContext = createContext<ZonePileContextValue | null>(null);

export function useZonePrimitiveContext(): ZoneContextValue {
  const value = useContext(ZoneContext);
  if (!value) {
    throw new Error("Zone primitives must be rendered inside <Zone.Root>.");
  }
  return value;
}

export function useOptionalZonePrimitiveContext(): ZoneContextValue | null {
  return useContext(ZoneContext);
}

export function useZoneCardContext(): ZoneCardContextValue | null {
  return useContext(ZoneCardContext);
}

export function useZonePileContext(): ZonePileContextValue {
  const value = useContext(ZonePileContext);
  if (!value) {
    throw new Error(
      "Zone pile primitives must be rendered inside <Zone.PileRoot>.",
    );
  }
  return value;
}

export interface ZoneRootProps<Zone extends string = ZoneKey>
  extends PrimitiveCommonProps, HTMLAttributes<HTMLElement> {
  zone: Zone;
}

export function ZoneRoot<Zone extends string = ZoneKey>({
  zone,
  children,
  ...props
}: ZoneRootProps<Zone>) {
  const snapshot =
    usePluginState((state) => state.gameplay.zones[zone]) ?? null;
  const value = useMemo<ZoneContextValue>(
    () => ({ zone, snapshot }),
    [snapshot, zone],
  );
  return (
    <ZoneContext.Provider value={value}>
      {renderPrimitive("div", {
        ...props,
        "data-dreamboard-zone-root": "",
        "data-zone": zone,
        "data-card-count": snapshot?.cardIds.length ?? 0,
        children,
      })}
    </ZoneContext.Provider>
  );
}

export interface ZoneListProps
  extends
    Omit<PrimitiveCommonProps, "children">,
    Omit<HTMLAttributes<HTMLElement>, "children"> {
  children?: ReactNode | ((card: ZoneCardRenderItem) => ReactNode);
  empty?: ReactNode;
  sort?: (a: ZoneCardRenderItem, b: ZoneCardRenderItem) => number;
}

export function ZoneList({ children, empty, sort, ...props }: ZoneListProps) {
  const { zone, items, isEmpty } = useZoneCards({ sort });
  const renderedChildren =
    typeof children === "function"
      ? isEmpty
        ? empty
        : items.map((item) => (
            <ZoneItem key={item.id} card={item}>
              {children(item)}
            </ZoneItem>
          ))
      : isEmpty && empty !== undefined
        ? empty
        : children;
  return renderPrimitive("div", {
    ...props,
    role: props.role ?? "list",
    "data-dreamboard-zone-list": "",
    "data-zone": zone,
    "data-empty": isEmpty || undefined,
    children: renderedChildren,
  });
}

export interface UseZoneCardsOptions {
  sort?: (a: ZoneCardRenderItem, b: ZoneCardRenderItem) => number;
}

export interface UseZoneCardsResult {
  zone: string;
  items: readonly ZoneCardRenderItem[];
  count: number;
  isEmpty: boolean;
}

export function useZoneCards({
  sort,
}: UseZoneCardsOptions = {}): UseZoneCardsResult {
  const { zone, snapshot } = useZonePrimitiveContext();
  return useMemo(() => {
    const cards = (snapshot?.cardIds ?? []).map((cardId, index) =>
      createZoneCardRenderItem(zone, snapshot, cardId, index),
    );
    const items = sort ? [...cards].sort(sort) : cards;
    const count = snapshot?.cardIds.length ?? 0;
    return {
      zone,
      items,
      count,
      isEmpty: count === 0,
    };
  }, [snapshot, sort, zone]);
}

export interface ZoneItemProps
  extends PrimitiveCommonProps, HTMLAttributes<HTMLElement> {
  card: string | ZoneCardRenderItem;
}

export function ZoneItem({ card, children, ...props }: ZoneItemProps) {
  const { zone, snapshot } = useZonePrimitiveContext();
  const item =
    typeof card === "string"
      ? createZoneCardRenderItem(
          zone,
          snapshot,
          card,
          indexOfCard(snapshot, card),
        )
      : card;
  const cardContext = useMemo<ZoneCardContextValue>(
    () => ({ zone, cardId: item.id }),
    [item.id, zone],
  );
  return (
    <ZoneCardContext.Provider value={cardContext}>
      {renderPrimitive("div", {
        ...props,
        role: props.role ?? "listitem",
        "data-dreamboard-zone-item": "",
        "data-zone": zone,
        "data-card-id": item.id,
        "data-card-type": item.hidden ? undefined : item.cardType,
        "data-card-index": item.index,
        "data-card-hidden": item.hidden || undefined,
        "data-playable": item.hidden ? undefined : item.playable || undefined,
        children,
      })}
    </ZoneCardContext.Provider>
  );
}

export interface ZoneCardAtProps<Zone extends string = ZoneKey> extends Omit<
  ZoneItemProps,
  "card" | "children"
> {
  zone?: Zone;
  index: number;
  children?: ReactNode | ((card: ZoneCardRenderItem) => ReactNode);
  empty?: ReactNode;
}

function ZoneCardAtContent<Zone extends string = ZoneKey>({
  index,
  children,
  empty = null,
  ...props
}: Omit<ZoneCardAtProps<Zone>, "zone">) {
  const { zone, snapshot } = useZonePrimitiveContext();
  const cardIndex = resolveZoneCardIndex(snapshot, index);
  if (cardIndex === null) return <>{empty}</>;

  const cardId = snapshot?.cardIds[cardIndex];
  if (!cardId) return <>{empty}</>;

  const card = createZoneCardRenderItem(zone, snapshot, cardId, cardIndex);
  return (
    <ZoneItem card={card} {...props}>
      {typeof children === "function" ? children(card) : children}
    </ZoneItem>
  );
}

export function ZoneCardAt<Zone extends string = ZoneKey>({
  zone,
  ...props
}: ZoneCardAtProps<Zone>) {
  if (zone) {
    return (
      <ZoneRoot zone={zone}>
        <ZoneCardAtContent {...props} />
      </ZoneRoot>
    );
  }
  return <ZoneCardAtContent {...props} />;
}

export type ZoneTopCardProps<Zone extends string = ZoneKey> = Omit<
  ZoneCardAtProps<Zone>,
  "index"
>;

export function ZoneTopCard<Zone extends string = ZoneKey>(
  props: ZoneTopCardProps<Zone>,
) {
  return <ZoneCardAt {...props} index={0} />;
}

export type ZoneCardActionExtraInputs =
  | Record<string, unknown>
  | ((cardId: string) => Record<string, unknown>);

export interface ZoneCardActionProps<Card extends string = string>
  extends
    PrimitiveCommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  card?: Card;
  interaction?: string;
  input?: string;
  extraInputs?: ZoneCardActionExtraInputs;
  onSelect?: (result: ZoneCardActionResult) => void;
  onSelectError?: (error: unknown) => void;
}

export type ZoneCardActionResult =
  | { status: "none" }
  | {
      status: "pending";
      interactionKey: string;
      descriptor: InteractionDescriptor;
      missingInputs: readonly string[];
    }
  | {
      status: "submitted";
      interactionKey: string;
      descriptor: InteractionDescriptor;
    };

export function ZoneCardAction<Card extends string = string>({
  card,
  interaction,
  input,
  extraInputs,
  onSelect,
  onSelectError,
  disabled,
  onClick,
  children,
  ...props
}: ZoneCardActionProps<Card>) {
  const { controllingPlayerId } = usePluginSession();
  const runtime = useRuntimeContext();
  const store = useInteractionUiStore();
  const contextCard = useZoneCardContext();
  const { snapshot } = useZonePrimitiveContext();
  const gameActionError = useGameActionError();
  const cardId = card ?? (contextCard?.cardId as Card | undefined);
  const route = useZoneCardActionRoute(cardId, snapshot, interaction, input);
  const isDisabled =
    disabled ??
    (!cardId ||
      !route.descriptor ||
      !route.inputKey ||
      route.ambiguous ||
      !isInteractionAvailable(route.descriptor));

  return renderPrimitive("button", {
    type: "button",
    ...props,
    children,
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-zone-card-action": "",
    "data-card-id": cardId,
    "data-interaction-id": route.descriptor?.interactionId,
    "data-interaction-key": route.descriptor?.interactionKey ?? interaction,
    "data-input-name": route.inputKey ?? input,
    "data-eligible": Boolean(route.descriptor && route.inputKey),
    "data-ambiguous": route.ambiguous || undefined,
    "data-disabled": isDisabled || undefined,
    onClick: composeEventHandlers(onClick, () => {
      if (
        isDisabled ||
        !cardId ||
        !route.descriptor ||
        !route.inputKey ||
        !controllingPlayerId
      ) {
        return;
      }
      const descriptor = route.descriptor;
      const inputKey = route.inputKey;
      void runInteractionAction(
        async (): Promise<ZoneCardActionResult> => {
          const { params, readiness } = routeInteractionTarget(
            store,
            descriptor,
            {
              inputKey,
              value: cardId,
              extraInputs: resolveCardActionExtraInputs(extraInputs, cardId),
            },
          );
          if (shouldRouteInteractionPending(descriptor, readiness)) {
            markInteractionPending(store, descriptor);
            return {
              status: "pending",
              interactionKey: descriptor.interactionKey,
              descriptor,
              missingInputs: readiness.missingInputs,
            };
          }
          if (!claimInteractionSubmit(store, descriptor)) {
            return {
              status: "submitted",
              interactionKey: descriptor.interactionKey,
              descriptor,
            };
          }
          try {
            await runtime.submitInteraction(
              controllingPlayerId,
              descriptor.interactionId,
              params,
            );
            clearInteractionRoute(store, descriptor);
            return {
              status: "submitted",
              interactionKey: descriptor.interactionKey,
              descriptor,
            };
          } finally {
            store.setSubmitting(descriptor.interactionKey, false);
          }
        },
        {
          onSuccess: onSelect,
          onError: onSelectError ?? gameActionError ?? undefined,
        },
      );
    }),
  });
}

export interface ZonePileRootProps<Zone extends string = ZoneKey> extends Omit<
  ZoneRootProps<Zone>,
  "children"
> {
  label: string;
  children?: ReactNode;
  hiddenDescription?: string | null;
  emptyDescription?: string | null;
  visibleDescription?: ((count: number) => string) | null;
}

export function ZonePileRoot<Zone extends string = ZoneKey>({
  zone,
  label,
  hiddenDescription = null,
  emptyDescription = null,
  visibleDescription = null,
  children,
  ...props
}: ZonePileRootProps<Zone>) {
  return (
    <ZoneRoot zone={zone} {...props}>
      <ZonePileProvider
        emptyDescription={emptyDescription}
        hiddenDescription={hiddenDescription}
        label={label}
        visibleDescription={visibleDescription}
      >
        {children}
      </ZonePileProvider>
    </ZoneRoot>
  );
}

interface ZonePileProviderProps {
  label: string;
  children?: ReactNode;
  hiddenDescription: string | null;
  emptyDescription: string | null;
  visibleDescription: ((count: number) => string) | null;
}

function ZonePileProvider({
  label,
  hiddenDescription,
  emptyDescription,
  visibleDescription,
  children,
}: ZonePileProviderProps) {
  const { zone, snapshot } = useZonePrimitiveContext();
  // Snapshot is the single source of truth for what's in a pile. A zone that
  // isn't in the current phase's projection scope (snapshot === null) is
  // treated as hidden — author should change the reducer projection rather
  // than inject ids in the UI.
  const cards = snapshot?.cardIds ?? [];
  const items = cards.map((cardId, index) =>
    createZoneCardRenderItem(zone, snapshot, cardId, index),
  );
  const count = cards.length;
  const isHidden = snapshot === null;
  // PileCards iterates whatever the snapshot exposes. Items are tagged
  // `hidden: true | false` so the author's `renderCard` discriminates on
  // honest data — including the "id without contents" case — rather than
  // receiving a lying ViewCard with `cardType: "unknown"`.
  const hasVisibleCards = items.length > 0;
  const description = isHidden
    ? hiddenDescription
    : hasVisibleCards
      ? (visibleDescription?.(count) ?? null)
      : emptyDescription;
  const value = useMemo<ZonePileContextValue>(
    () => ({
      zone,
      label,
      count,
      cards,
      items,
      hasVisibleCards,
      isHidden,
      description,
    }),
    [cards, count, description, hasVisibleCards, isHidden, items, label, zone],
  );

  return (
    <ZonePileContext.Provider value={value}>
      {children}
    </ZonePileContext.Provider>
  );
}

export interface ZonePileTriggerProps
  extends PrimitiveCommonProps, ButtonHTMLAttributes<HTMLButtonElement> {}

export function ZonePileTrigger({ children, ...props }: ZonePileTriggerProps) {
  const pile = useZonePileContext();
  return renderPrimitive("button", {
    type: "button",
    ...props,
    "aria-label": props["aria-label"] ?? `Show ${pile.label} pile`,
    "data-dreamboard-zone-pile-trigger": "",
    "data-zone": pile.zone,
    "data-card-count": pile.count,
    "data-hidden": pile.isHidden || undefined,
    children,
  });
}

export type ZonePileLabelProps = PrimitiveCommonProps &
  HTMLAttributes<HTMLElement>;

export function ZonePileLabel({ children, ...props }: ZonePileLabelProps) {
  const pile = useZonePileContext();
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-zone-pile-label": "",
    "data-zone": pile.zone,
    children: children ?? pile.label,
  });
}

export type ZonePileCountProps = PrimitiveCommonProps &
  HTMLAttributes<HTMLElement>;

export function ZonePileCount({ children, ...props }: ZonePileCountProps) {
  const pile = useZonePileContext();
  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-zone-pile-count": "",
    "data-zone": pile.zone,
    "data-card-count": pile.count,
    children: children ?? `${pile.count} cards`,
  });
}

export type ZonePileDescriptionProps = PrimitiveCommonProps &
  HTMLAttributes<HTMLElement>;

export function ZonePileDescription({
  children,
  ...props
}: ZonePileDescriptionProps) {
  const pile = useZonePileContext();
  const description = children ?? pile.description;
  if (description === null || description === undefined) return null;

  return renderPrimitive("span", {
    ...props,
    "data-dreamboard-zone-pile-description": "",
    "data-zone": pile.zone,
    children: description,
  });
}

export interface ZonePileCardsProps extends Omit<ZoneListProps, "children"> {
  renderCard: (card: ZoneCardRenderItem) => ReactNode;
}

export function ZonePileCards({ renderCard, ...props }: ZonePileCardsProps) {
  const pile = useZonePileContext();
  if (!pile.hasVisibleCards) return null;

  return (
    <ZoneList {...props}>
      {pile.items.map((card) => (
        <ZoneItem key={card.id} card={card}>
          {renderCard(card)}
        </ZoneItem>
      ))}
    </ZoneList>
  );
}

function indexOfCard(
  snapshot: ZoneHandlesSnapshot | null,
  cardId: string,
): number {
  return snapshot?.cardIds.indexOf(cardId) ?? -1;
}

function resolveZoneCardIndex(
  snapshot: ZoneHandlesSnapshot | null,
  index: number,
): number | null {
  const count = snapshot?.cardIds.length ?? 0;
  const resolved = index < 0 ? count + index : index;
  return resolved >= 0 && resolved < count ? resolved : null;
}

export function createZoneCardRenderItem(
  zone: string,
  snapshot: ZoneHandlesSnapshot | null,
  cardId: string,
  index: number,
): ZoneCardRenderItem {
  const card = parseViewCard(snapshot?.cardViewsById[cardId]);
  if (card === null) {
    // The snapshot exposes this card id but not its contents. Surface that
    // honestly via the `hidden: true` variant instead of fabricating a
    // ViewCard with a fake `cardType: "unknown"`.
    return { id: cardId, zone, index, hidden: true };
  }
  const interactions = snapshot?.playableByCardId[cardId] ?? [];
  return {
    ...card,
    id: cardId,
    zone,
    index,
    hidden: false,
    playable: interactions.some(isInteractionAvailable),
    interactions,
  };
}

function useZoneCardActionRoute(
  cardId: string | undefined,
  snapshot: ZoneHandlesSnapshot | null,
  interaction: string | undefined,
  input: string | undefined,
): {
  descriptor: InteractionDescriptor | null;
  inputKey: string | null;
  ambiguous: boolean;
} {
  return useMemo(() => {
    if (!cardId || !snapshot) {
      return { descriptor: null, inputKey: null, ambiguous: false };
    }
    const interactions = snapshot.playableByCardId[cardId] ?? [];
    if (interaction) {
      const descriptor =
        interactions.find(
          (candidate) =>
            candidate.interactionKey === interaction ||
            candidate.interactionId === interaction,
        ) ?? null;
      return {
        descriptor,
        inputKey: descriptor
          ? inputKeyForCardAction(descriptor, cardId, input)
          : null,
        ambiguous: false,
      };
    }
    const matches = interactions.flatMap((descriptor) => {
      if (!isInteractionAvailable(descriptor)) return [];
      const inputKey = inputKeyForCardAction(descriptor, cardId, input);
      return inputKey ? [{ descriptor, inputKey }] : [];
    });
    if (matches.length !== 1) {
      return {
        descriptor: matches[0]?.descriptor ?? null,
        inputKey: matches[0]?.inputKey ?? null,
        ambiguous: matches.length > 1,
      };
    }
    const match = matches[0];
    if (!match) {
      return { descriptor: null, inputKey: null, ambiguous: false };
    }
    return {
      descriptor: match.descriptor,
      inputKey: match.inputKey,
      ambiguous: false,
    };
  }, [cardId, input, interaction, snapshot]);
}

function inputKeyForCardAction(
  descriptor: InteractionDescriptor,
  cardId: string,
  explicitInput?: string,
): string | null {
  if (explicitInput) {
    const input = descriptor.inputs.find(
      (candidate) => candidate.key === explicitInput,
    );
    return input?.domain.type === "cardTarget" &&
      isResolvedTargetDomain(input.domain) &&
      input.domain.eligibleTargets.includes(cardId)
      ? input.key
      : null;
  }
  const targetInput = inputByTarget(descriptor, "card", cardId);
  if (targetInput) return targetInput.key;
  if (interactionInputKeys(descriptor).includes("cardId")) {
    return descriptor.inputs.find((candidate) => candidate.key === "cardId")
      ? "cardId"
      : null;
  }
  return null;
}

function resolveCardActionExtraInputs(
  extraInputs: ZoneCardActionExtraInputs | undefined,
  cardId: string,
): Record<string, unknown> {
  return typeof extraInputs === "function"
    ? extraInputs(cardId)
    : (extraInputs ?? {});
}

function parseViewCard(serialized: string | undefined): ViewCard | null {
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as Partial<ViewCard>;
    if (typeof parsed.id !== "string" || typeof parsed.cardType !== "string") {
      return null;
    }
    return {
      ...parsed,
      id: parsed.id,
      cardType: parsed.cardType,
      properties:
        parsed.properties && typeof parsed.properties === "object"
          ? parsed.properties
          : {},
    };
  } catch {
    return null;
  }
}

export const Zone = {
  Root: ZoneRoot,
  List: ZoneList,
  Item: ZoneItem,
  CardAt: ZoneCardAt,
  TopCard: ZoneTopCard,
  CardAction: ZoneCardAction,
  PileRoot: ZonePileRoot,
  PileTrigger: ZonePileTrigger,
  PileLabel: ZonePileLabel,
  PileCount: ZonePileCount,
  PileDescription: ZonePileDescription,
  PileCards: ZonePileCards,
  useZoneCards,
};
