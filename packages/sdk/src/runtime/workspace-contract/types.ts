import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import type { ClientParamSchemaMap } from "../context/ClientParamSchemaContext.js";
import type { HandRole } from "../../ui/components.js";
import type { DreamboardUI, UIContract } from "../ui-contract.js";
import type { InteractionCardInputRenderState } from "../primitives/index.js";
import type { BoardSpaceTargetProps } from "../primitives/board.js";
import type { ZoneListProps } from "../primitives/zone.js";

export type WorkspaceInteractionSlotComponent<Props = object> = (
  props: Props extends { children: unknown }
    ? Props
    : Props & { children?: ReactNode },
) => ReactElement | null;

export interface WorkspaceFormInputSlot<Input extends string = string> {
  readonly Field: WorkspaceInteractionSlotComponent;
  readonly Options: WorkspaceInteractionSlotComponent<{
    children?: (option: { value: unknown; label: string }) => ReactNode;
  }>;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
  readonly __input?: Input;
}

export interface WorkspaceCardInputSlot<Card extends string = string> {
  readonly Card: WorkspaceInteractionSlotComponent<
    { value: Card } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "type"
      | "value"
    >
  >;
  readonly Cards: WorkspaceInteractionSlotComponent<{
    children: (card: { id: Card }) => ReactNode;
  }>;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
}

export interface WorkspaceBoardTargetInputSlot<
  Kind extends "space" | "edge" | "vertex" | "tile",
  Target extends string = string,
> {
  readonly Target: WorkspaceInteractionSlotComponent<
    { value: Target } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "type"
      | "value"
    >
  >;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
  readonly __kind?: Kind;
}

export interface WorkspaceBoardSurface<
  Space extends string = string,
  Edge extends string = string,
  Vertex extends string = string,
  Tile extends string = string,
> {
  readonly Root: WorkspaceInteractionSlotComponent;
  readonly Space: <Target extends Space>(
    props: BoardSpaceTargetProps<Target>,
  ) => ReactElement | null;
  readonly slot: {
    readonly space: WorkspaceBoardTargetInputSlot<"space", Space>;
    readonly playerSpace: WorkspaceBoardTargetInputSlot<"space", Space>;
    readonly edge: WorkspaceBoardTargetInputSlot<"edge", Edge>;
    readonly vertex: WorkspaceBoardTargetInputSlot<"vertex", Vertex>;
    readonly tile: WorkspaceBoardTargetInputSlot<"tile", Tile>;
  };
}

export type WorkspaceZoneCardsComponent<Card> =
  WorkspaceInteractionSlotComponent<
    Omit<ZoneListProps, "children" | "empty"> & {
      empty?: ReactNode;
      children: (card: Card) => ReactNode;
    }
  >;

export type WorkspaceZoneCardComponent<Card> =
  WorkspaceInteractionSlotComponent<
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value"> & {
      card: Card;
    }
  >;

export type WorkspaceZoneStagingComponent<Card> =
  WorkspaceInteractionSlotComponent<{
    children: (card: Card) => ReactNode;
    label?: ReactNode;
    renderEmptySlot?: (index: number) => ReactNode;
    cardSize?: "sm" | "md" | "lg";
    ariaLabel?: string;
    className?: string;
  }>;

export type WorkspaceHandCardsComponent<Card> =
  WorkspaceInteractionSlotComponent<{
    children: (card: Card, state: unknown) => ReactNode;
  }>;

export type WorkspaceHandSummaryComponent = WorkspaceInteractionSlotComponent<{
  children?: ReactNode | ((summary: unknown) => ReactNode);
}>;

export interface WorkspaceHandSurface<Zone extends string, Card> {
  readonly Hand: WorkspaceInteractionSlotComponent<{
    children: ReactNode;
  }>;
  readonly Cards: WorkspaceHandCardsComponent<Card>;
  readonly Summary: WorkspaceHandSummaryComponent;
  readonly Actions: WorkspaceHandSummaryComponent;
  readonly Card: WorkspaceZoneCardComponent<Card>;
  readonly Staging: WorkspaceZoneStagingComponent<Card>;
  readonly slot: {
    readonly card: WorkspaceCardInputSlot<Zone>;
  };
}

export interface WorkspaceHandOptions<Zone extends string = string> {
  zone: Zone;
  role: HandRole;
  label: string;
  order?: number;
}

export interface WorkspaceHandComponentOptions {
  name: string;
  zone: string;
  role: HandRole;
  label: string;
  order?: number;
}

export interface WorkspacePileSurface<Card> {
  readonly Pile: WorkspaceZoneCardsComponent<Card>;
  readonly Card: WorkspaceZoneCardComponent<Card>;
}

export interface WorkspaceCardCollectionSurface<Zone extends string, Card> {
  readonly Collection: WorkspaceZoneCardsComponent<Card>;
  readonly Card: WorkspaceZoneCardComponent<Card>;
  readonly slot: {
    readonly card: WorkspaceCardInputSlot<Zone>;
  };
}

export interface WorkspaceBoardSurfaceDescriptor<
  Board extends string = string,
> {
  readonly kind: "board";
  readonly board: Board;
}

export interface WorkspaceHandSurfaceDescriptor<Zone extends string = string> {
  readonly kind: "hand";
  readonly zone: Zone;
  readonly role: HandRole;
  readonly label: string;
  readonly order?: number;
}

export interface WorkspacePileSurfaceDescriptor<Zone extends string = string> {
  readonly kind: "pile";
  readonly zone: Zone;
}

export interface WorkspacePilesSurfaceDescriptor<
  Zones extends readonly string[] = readonly string[],
> {
  readonly kind: "piles";
  readonly zones: Zones;
}

export interface WorkspaceCardCollectionSurfaceDescriptor<
  Zones extends readonly string[] = readonly string[],
> {
  readonly kind: "cardCollection";
  readonly zones: Zones;
  readonly mode?: "all" | "top-card";
}

export interface WorkspaceInteractionFormsDescriptor<
  Interactions extends Readonly<Record<string, string>> = Readonly<
    Record<string, string>
  >,
> {
  readonly kind: "forms";
  readonly interactions: Interactions;
}

export interface WorkspaceInteractionFormDescriptor<
  Interaction extends string = string,
> {
  readonly kind: "form";
  readonly interaction: Interaction;
}

export type WorkspaceSurfaceDescriptor =
  | WorkspaceBoardSurfaceDescriptor
  | WorkspaceHandSurfaceDescriptor
  | WorkspacePileSurfaceDescriptor
  | WorkspacePilesSurfaceDescriptor
  | WorkspaceCardCollectionSurfaceDescriptor
  | WorkspaceInteractionFormDescriptor
  | WorkspaceInteractionFormsDescriptor;

export interface WorkspaceSurfaceSpec {
  readonly [key: string]: WorkspaceSurfaceDescriptor | WorkspaceSurfaceSpec;
}

export type RuntimeInteraction = DreamboardUI["Interaction"] & {
  Root(props: {
    interaction: string;
    children?: ReactNode;
    unavailable?: "render" | "hide";
  }): ReactElement | null;
  CardInput(
    props: Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "type" | "value" | "children"
    > & {
      input: string;
      unsafeCardId?: string;
      children?:
        | ReactNode
        | ((state: InteractionCardInputRenderState) => ReactNode);
    },
  ): ReactElement | null;
  Routes(props: {
    routes: Record<string, { collect: Record<string, unknown> }>;
    fallback?: ReactNode;
    includeUnavailable?: boolean | null;
  }): ReactElement;
};

export type RuntimeBoard = DreamboardUI["Board"] & {
  SpaceTarget(props: BoardSpaceTargetProps<string>): ReactElement | null;
  EdgeTarget(
    props: { value: string; children?: ReactNode } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "type"
      | "value"
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "onSelect"
      | "onSelectError"
    >,
  ): ReactElement | null;
  VertexTarget(
    props: { value: string; children?: ReactNode } & Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      | "type"
      | "value"
      | "children"
      | "disabled"
      | "aria-disabled"
      | "aria-pressed"
      | "onClick"
      | "onSelect"
      | "onSelectError"
    >,
  ): ReactElement | null;
};

export type RuntimeZone<Card> = DreamboardUI["Zone"] & {
  List(
    props: Omit<ZoneListProps, "children" | "empty"> & {
      empty?: ReactNode;
      children: (card: Card) => ReactNode;
    },
  ): ReactElement | null;
};

export interface WorkspaceContractOptions<
  Contract extends UIContract,
  Resource extends string,
  Card,
  HexBoards extends Record<string, unknown>,
> {
  readonly uiContract: Contract;
  readonly clientParamSchemasByPhase?: ClientParamSchemaMap;
  readonly formInputKeysForInteraction: (
    interaction: string,
  ) => ReadonlySet<string>;
  readonly resourceIds: readonly Resource[];
  readonly resourcePresentationById?: Partial<
    Record<string, { label?: string; icon?: string }>
  >;
  readonly hexStaticBoards: HexBoards;
  readonly cardIdFromZoneCard: (card: Card) => string;
  readonly zoneIdFromZoneCard: (card: Card) => string;
}

/**
 * Internal shared context threaded through the workspace-contract modules.
 * Built once per `createWorkspaceUIContract` call; every value here is what
 * the original single-file factory closed over.
 */
export interface WorkspaceContractContext<Card> {
  readonly options: WorkspaceContractOptions<
    UIContract,
    string,
    Card,
    Record<string, unknown>
  >;
  readonly baseUI: DreamboardUI;
  readonly runtimeInteraction: RuntimeInteraction;
  readonly runtimeBoard: RuntimeBoard;
  readonly runtimeZone: RuntimeZone<Card>;
  readonly withInteractionRoot: (
    interaction: string,
    children: ReactNode,
  ) => ReactElement;
}
