/**
 * Generated file.
 * Do not edit directly.
 */

import game from "../../app/game";
import { createClientParamSchemasByPhase } from "@dreamboard-games/sdk/reducer/advanced";
import type {
  CardInputZoneIdsOfDefinition,
  ClientParamsOfInteractionOfDefinition,
  DefaultedClientParamKeysOfInteractionOfDefinition,
  InputKeysWithCollectorKindOfDefinition,
  InteractionIdOfDefinition,
  InteractionIdOfDefinitionPhase,
  PhaseNamesOfDefinition,
  StageNamesOfDefinitionPhase,
  ViewNamesOfDefinition,
  ViewOfDefinition,
} from "@dreamboard-games/sdk/reducer/advanced";
import {
  type BoardSpaceIdOf,
  type InteractionVisualState,
} from "@dreamboard-games/sdk/ui";
import { type InteractionDescriptor } from "@dreamboard-games/sdk/runtime";
import {
  createWorkspaceUIContract,
  type BoardHexGridProps as BoardHexGridPropsGeneric,
  type BoardHexViewProps as BoardHexViewPropsGeneric,
  type BoardSpaceTargetProps as BoardSpaceTargetPropsGeneric,
  type ClientParamSchemaMap,
  type DefineGameUIConfig,
  type DreamboardUI,
  type GameMeState,
  type GamePlayersState,
  type GameRenderState,
  type GameTurnState,
  type ResourceCounterComponents,
  type TypedGame,
  type UIContract,
  type UIRootProps,
  type WorkspaceBoardSurfaceDescriptor,
  type WorkspaceBoardSurface,
  type WorkspaceBoardTargetInputSlot,
  type WorkspaceCardCollectionSurface,
  type WorkspaceCardCollectionSurfaceDescriptor,
  type WorkspaceCardInputSlot,
  type WorkspaceFormInputSlot,
  type WorkspaceHandSurfaceDescriptor,
  type WorkspaceHandSurface,
  type WorkspaceInteractionFormDescriptor,
  type WorkspaceInteractionFormDialogProps,
  type WorkspaceInteractionSlotComponent,
  type WorkspaceInteractionFormsDescriptor,
  type WorkspacePileSurface,
  type WorkspacePileSurfaceDescriptor,
  type WorkspacePilesSurfaceDescriptor,
  type WorkspaceSurfaceSpec,
  type ZoneCardRenderItem,
  type ZoneListProps,
} from "@dreamboard-games/sdk/runtime/workspace-contract";
import {
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  boardHelpers,
  literals,
  staticBoards,
  type BoardBaseId,
  type CardId,
  type CardProperties,
  type CardType,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type TiledBoardId,
  type TiledEdgeState,
  type TiledVertexState,
  type VertexId,
  type ZoneId as ManifestZoneId,
} from "../manifest-contract";

/**
 * Boundary tripwire (do not remove).
 *
 * The authored UI boundary depends on `@dreamboard-games/sdk/runtime` resolving to
 * real types in every typecheck path (local `tsc` and the remote compiler
 * service). If a future change to module resolution or type loading silently
 * degrades `@dreamboard-games/sdk/runtime` to `any`, the assertions below stop
 * compiling, turning invisible type erosion into a hard typecheck error in
 * every generated workspace. `InteractionDescriptor` comes from the package
 * root and `ZoneCardRenderItem` from the `/workspace-contract` subpath, so
 * both entry points are covered.
 */
type IsAny<T> = 0 extends 1 & T ? true : false;
type AssertNotAny<T> =
  IsAny<T> extends true
    ? "sdk runtime types resolved to any — boundary degraded"
    : true;
const _uiRuntimeBoundaryResolved: [
  AssertNotAny<InteractionDescriptor>,
  AssertNotAny<ZoneCardRenderItem>,
] = [true, true];
void _uiRuntimeBoundaryResolved;

type GameDefinition = typeof game;

export type ViewName = ViewNamesOfDefinition<GameDefinition>;
export type InferView<Name extends ViewName> = ViewOfDefinition<
  GameDefinition,
  Name
>;
export type GameView =
  Extract<"player", ViewName> extends never
    ? never
    : InferView<Extract<"player", ViewName>>;

export type PhaseName = PhaseNamesOfDefinition<GameDefinition>;
export type GameRootState = GameRenderState<GameView, PlayerId, PhaseName>;
export type GamePlayers = GamePlayersState<PlayerId>;
export type GameMe = GameMeState<PlayerId>;
export type GameTurn = GameTurnState<PlayerId, PhaseName>;

// -------------------------------------------------------------------------
// Interaction / Stage / Zone types (authored via defineInteraction/Stage/zones)
// -------------------------------------------------------------------------

/** Union of all interaction ids across phases. */
export type InteractionId = InteractionIdOfDefinition<GameDefinition>;

/** Interactions declared in a specific phase. */
export type InteractionIdForPhase<Phase extends PhaseName> =
  InteractionIdOfDefinitionPhase<GameDefinition, Phase>;

/**
 * Client-facing params type for an interaction, inferred from its input
 * collectors. Engine-sampled collectors are omitted
 * — the trusted reducer bundle fills those fields during submit, so the
 * client never supplies them.
 */
export type InteractionParams<
  Phase extends PhaseName,
  Id extends InteractionIdForPhase<Phase>,
> = ClientParamsOfInteractionOfDefinition<GameDefinition, Phase, Id>;

/** Client-facing params with authored input defaults. */
export type InteractionDefaultedKeys<
  Phase extends PhaseName,
  Id extends InteractionIdForPhase<Phase>,
> = DefaultedClientParamKeysOfInteractionOfDefinition<
  GameDefinition,
  Phase,
  Id
>;

/** Phase-qualified interaction key for a specific phase. */
export type InteractionKeyForPhase<Phase extends PhaseName> =
  `${Phase}.${InteractionIdForPhase<Phase>}`;

/** Phase-qualified union of every client/UI interaction key. */
export type InteractionKey = {
  [P in PhaseName]: InteractionKeyForPhase<P>;
}[PhaseName];

type PhaseOfInteractionKey<Key extends InteractionKey> =
  Key extends `${infer P}.${string}` ? Extract<P, PhaseName> : never;

type IdOfInteractionKey<Key extends InteractionKey> =
  Key extends `${infer P}.${infer I}`
    ? P extends PhaseName
      ? Extract<I, InteractionIdForPhase<P>>
      : never
    : never;

export type BoardInteractions = InteractionKey;

/** Stage names declared in a phase. */
export type StageName<Phase extends PhaseName> = StageNamesOfDefinitionPhase<
  GameDefinition,
  Phase
>;

/** Union of zone ids authored in the workspace manifest. */
export type ZoneId = ManifestZoneId;

type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

/** JS-friendly keys for authored zones, e.g. "dev-hand" -> "devHand". */
export type WorkspaceZoneKey = CamelCase<ZoneId>;

type PlayerCardZoneId = {
  [Z in (typeof literals.playerZoneIds)[number]]: (typeof literals.cardSetIdsByPlayerZoneId)[Z] extends readonly []
    ? never
    : Z;
}[(typeof literals.playerZoneIds)[number]];

type SharedCardZoneId = {
  [Z in (typeof literals.sharedZoneIds)[number]]: (typeof literals.cardSetIdsBySharedZoneId)[Z] extends readonly []
    ? never
    : Z;
}[(typeof literals.sharedZoneIds)[number]];

type CardZoneId = PlayerCardZoneId | SharedCardZoneId;

/** JS-friendly keys for per-player zones that can contain cards. */
export type WorkspacePlayerCardZoneKey = CamelCase<PlayerCardZoneId>;

/** Interaction descriptor specialised to a concrete phase-qualified key. */
export type InteractionDescriptorFor<Key extends InteractionKey> =
  InteractionDescriptor<Key>;

export type InteractionItem<Key extends InteractionKey> = {
  readonly interaction: Key;
  readonly descriptor: InteractionDescriptorFor<Key>;
};

/**
 * Params shape for a phase-qualified interaction key. Drives strong typing
 * for component-first interaction state, forms, and submits.
 */
export type InteractionParamsOf<Key extends InteractionKey> = InteractionParams<
  PhaseOfInteractionKey<Key>,
  IdOfInteractionKey<Key>
>;

export type InteractionDefaultedKeysOf<Key extends InteractionKey> =
  InteractionDefaultedKeys<PhaseOfInteractionKey<Key>, IdOfInteractionKey<Key>>;

type InteractionParamsShape<Key extends InteractionKey> =
  InteractionParamsOf<Key> extends Record<string, unknown>
    ? InteractionParamsOf<Key>
    : Record<string, unknown>;

type InteractionCollectorKind =
  | "form"
  | "board-vertex"
  | "board-edge"
  | "board-tile"
  | "board-space"
  | "card"
  | "prompt";

type AuthoredInteractionInputKeysOf<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    InteractionCollectorKind
  > extends infer Input
    ? string extends Input
      ? never
      : Input & string
    : never;

type InteractionInputKeysOf<Key extends InteractionKey> =
  | (string extends keyof InteractionParamsOf<Key>
      ? never
      : keyof InteractionParamsOf<Key> & string)
  | AuthoredInteractionInputKeysOf<Key>
  | (InteractionDefaultedKeysOf<Key> & string);

type InteractionHandleDefaultedKeys<Key extends InteractionKey> = Extract<
  InteractionDefaultedKeysOf<Key>,
  keyof InteractionParamsShape<Key> & string
>;

type RequiredInteractionInputKeysOf<Key extends InteractionKey> =
  InteractionInputKeysOf<Key>;

export type RequiredInteractionInputKey<Key extends InteractionKey> =
  RequiredInteractionInputKeysOf<Key>;

type InteractionSlotComponent<Props = object> = (
  props: Props extends { children?: unknown }
    ? Props
    : Props & { children?: ReactNode },
) => ReactElement | null;

type InteractionDefaultInputSlot = {
  readonly Default: InteractionSlotComponent;
};

type InteractionValueInputSlot<Value = unknown> = {
  readonly Value: InteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
};

type InteractionFormInputSlot<Value = unknown> = {
  readonly Field: InteractionSlotComponent;
  readonly Options: InteractionSlotComponent<{
    children: (option: { value: Value; label: string }) => ReactNode;
  }>;
};

type DreamboardSlotBrand<Meta> = {
  readonly __dreamboardSlot: Meta;
};

type InteractionCardTargetInputSlot<Card extends string = string> = {
  readonly Card: InteractionSlotComponent<
    { value: string } & Omit<
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
  readonly Cards: InteractionSlotComponent<{
    children: (card: { id: Card }) => ReactNode;
  }>;
};

type InteractionBoardTargetInputSlot<Target extends string = string> = {
  readonly Target: InteractionSlotComponent<
    { value: string } & Omit<
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
};

type InteractionBoardSpaceTargetInputSlot<Space extends string = string> =
  InteractionBoardTargetInputSlot<Space>;

type InteractionBoardEdgeTargetInputSlot<Edge extends string = string> =
  InteractionBoardTargetInputSlot<Edge>;

type InteractionBoardVertexTargetInputSlot<Vertex extends string = string> =
  InteractionBoardTargetInputSlot<Vertex>;

type InteractionBoardTileTargetInputSlot<Tile extends string = string> =
  InteractionBoardTargetInputSlot<Tile>;

type InteractionSubmitSlot = {
  readonly Button: InteractionSlotComponent<
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "disabled" | "type" | "value"
    >
  >;
};

type InteractionInputValue<
  Key extends InteractionKey,
  Input extends InteractionInputKeysOf<Key>,
> = InteractionParamsShape<Key>[Input & keyof InteractionParamsShape<Key>];

type InteractionSlotValue<Value> = Value extends readonly (infer Item)[]
  ? InteractionSlotValue<Item>
  : Value extends { spaceId: infer Space extends string }
    ? Space
    : Value extends { edgeId: infer Edge extends string }
      ? Edge
      : Value extends { vertexId: infer Vertex extends string }
        ? Vertex
        : Value extends { tileId: infer Tile extends string }
          ? Tile
          : Value extends { cardId: infer Card extends string }
            ? Card
            : Value;

type InteractionSlotStringValue<Value> = Extract<
  InteractionSlotValue<Value>,
  string
>;

type FormInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "form" | "prompt"
  > &
    InteractionInputKeysOf<Key>;

type CardTargetInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "card"
  > &
    InteractionInputKeysOf<Key>;

type CardTargetZoneIds<
  Key extends InteractionKey,
  Input extends InteractionInputKeysOf<Key>,
> =
  CardInputZoneIdsOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    Input & string
  > extends infer Zone extends string
    ? Extract<Zone, WorkspaceZoneId>
    : never;

type BoardSpaceTargetInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "board-space"
  > &
    InteractionInputKeysOf<Key>;

type BoardEdgeTargetInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "board-edge"
  > &
    InteractionInputKeysOf<Key>;

type BoardVertexTargetInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "board-vertex"
  > &
    InteractionInputKeysOf<Key>;

type BoardTileTargetInteractionInputKey<Key extends InteractionKey> =
  InputKeysWithCollectorKindOfDefinition<
    GameDefinition,
    PhaseOfInteractionKey<Key>,
    IdOfInteractionKey<Key>,
    "board-tile"
  > &
    InteractionInputKeysOf<Key>;

type InteractionDefaultSlotFor<
  Key extends InteractionKey,
  Input extends InteractionInputKeysOf<Key>,
> =
  Input extends InteractionHandleDefaultedKeys<Key>
    ? InteractionDefaultInputSlot
    : object;

export type InteractionInputSlot<
  Key extends InteractionKey,
  Input extends InteractionInputKeysOf<Key>,
> = InteractionValueInputSlot<InteractionInputValue<Key, Input>> &
  InteractionDefaultSlotFor<Key, Input> &
  (Input extends CardTargetInteractionInputKey<Key>
    ? InteractionCardTargetInputSlot<
        InteractionSlotStringValue<InteractionInputValue<Key, Input>>
      >
    : Input extends BoardSpaceTargetInteractionInputKey<Key>
      ? InteractionBoardSpaceTargetInputSlot<
          InteractionSlotStringValue<InteractionInputValue<Key, Input>>
        >
      : Input extends BoardEdgeTargetInteractionInputKey<Key>
        ? InteractionBoardEdgeTargetInputSlot<
            InteractionSlotStringValue<InteractionInputValue<Key, Input>>
          >
        : Input extends BoardVertexTargetInteractionInputKey<Key>
          ? InteractionBoardVertexTargetInputSlot<
              InteractionSlotStringValue<InteractionInputValue<Key, Input>>
            >
          : Input extends BoardTileTargetInteractionInputKey<Key>
            ? InteractionBoardTileTargetInputSlot<
                InteractionSlotStringValue<InteractionInputValue<Key, Input>>
              >
            : Input extends FormInteractionInputKey<Key>
              ? InteractionFormInputSlot<InteractionInputValue<Key, Input>>
              : never);

type FormSurfaceInputSlot<
  Key extends InteractionKey,
  Input extends FormInteractionInputKey<Key>,
> = InteractionValueInputSlot<InteractionInputValue<Key, Input>> &
  InteractionDefaultSlotFor<Key, Input> &
  InteractionFormInputSlot<InteractionInputValue<Key, Input>> &
  DreamboardSlotBrand<{
    readonly kind: "form";
    readonly interaction: Key;
    readonly input: Input;
  }>;

type CardSurfaceInputSlot<Zones extends string> =
  InteractionValueInputSlot<unknown> &
    InteractionCardTargetInputSlot<WorkspaceCardId & string> &
    DreamboardSlotBrand<{
      readonly kind: "card";
      readonly zones: Zones;
      readonly selection: "one" | "many";
    }>;

type BoardSurfaceInputSlot<
  Kind extends "space" | "edge" | "vertex" | "tile",
  Target extends string = string,
> = InteractionValueInputSlot<unknown> &
  InteractionBoardTargetInputSlot<Target> &
  DreamboardSlotBrand<{
    readonly kind: "board";
    readonly targetKind: Kind;
  }>;

type InteractionCollectorSlot<
  Key extends InteractionKey,
  Input extends InteractionInputKeysOf<Key>,
> =
  Input extends CardTargetInteractionInputKey<Key>
    ? CardSurfaceInputSlot<CardTargetZoneIds<Key, Input>>
    : Input extends BoardSpaceTargetInteractionInputKey<Key>
      ? BoardSurfaceInputSlot<"space", string>
      : Input extends BoardEdgeTargetInteractionInputKey<Key>
        ? BoardSurfaceInputSlot<"edge", string>
        : Input extends BoardVertexTargetInteractionInputKey<Key>
          ? BoardSurfaceInputSlot<"vertex", string>
          : Input extends BoardTileTargetInteractionInputKey<Key>
            ? BoardSurfaceInputSlot<"tile", string>
            : Input extends FormInteractionInputKey<Key>
              ? FormSurfaceInputSlot<Key, Input>
              : never;

type InteractionKeysWithInput<Input extends InteractionInputKey> = {
  [Key in InteractionKey]: Input extends InteractionInputKeysOf<Key>
    ? Key
    : never;
}[InteractionKey];

type InteractionInputSlotByName<Input extends InteractionInputKey> =
  InteractionInputSlot<
    InteractionKeysWithInput<Input>,
    Input & InteractionInputKeysOf<InteractionKeysWithInput<Input>>
  >;

type InteractionFormInputSlotByName<Input extends InteractionInputKey> =
  InteractionInputSlot<
    {
      [Key in InteractionKey]: Input extends FormInteractionInputKey<Key>
        ? Key
        : never;
    }[InteractionKey],
    Input &
      InteractionInputKeysOf<
        {
          [Key in InteractionKey]: Input extends FormInteractionInputKey<Key>
            ? Key
            : never;
        }[InteractionKey]
      >
  >;

type InteractionInputsForCollectorKind<
  Key extends InteractionKey,
  CollectorKind extends InteractionCollectorKind,
> = {
  [Input in InteractionInputKeysOf<Key>]: CollectorKind extends "form"
    ? Input extends FormInteractionInputKey<Key>
      ? Input
      : never
    : CollectorKind extends "card"
      ? Input extends CardTargetInteractionInputKey<Key>
        ? Input
        : never
      : CollectorKind extends "board-space"
        ? Input extends BoardSpaceTargetInteractionInputKey<Key>
          ? Input
          : never
        : CollectorKind extends "board-edge"
          ? Input extends BoardEdgeTargetInteractionInputKey<Key>
            ? Input
            : never
          : CollectorKind extends "board-vertex"
            ? Input extends BoardVertexTargetInteractionInputKey<Key>
              ? Input
              : never
            : CollectorKind extends "board-tile"
              ? Input extends BoardTileTargetInteractionInputKey<Key>
                ? Input
                : never
              : never;
}[InteractionInputKeysOf<Key>];

type InteractionKeysForCollectorKind<
  CollectorKind extends InteractionCollectorKind,
> = {
  [Key in InteractionKey]: InteractionInputsForCollectorKind<
    Key,
    CollectorKind
  > extends never
    ? never
    : Key;
}[InteractionKey];

type InteractionInputSlotByCollectorKind<
  CollectorKind extends InteractionCollectorKind,
> = InteractionInputSlot<
  InteractionKeysForCollectorKind<CollectorKind>,
  InteractionInputsForCollectorKind<
    InteractionKeysForCollectorKind<CollectorKind>,
    CollectorKind
  >
>;

export type InteractionFormSurface<Key extends InteractionKey> = {
  readonly Root: InteractionSlotComponent;
  readonly Form: DreamboardUI<typeof uiContract>["Interaction"]["Form"];
  readonly Dialog: (
    props: WorkspaceInteractionFormDialogProps,
  ) => ReactElement | null;
  readonly State: DreamboardUI<typeof uiContract>["Interaction"]["State"];
  readonly Arm: DreamboardUI<typeof uiContract>["Interaction"]["Trigger"];
  readonly Submit: DreamboardUI<typeof uiContract>["Interaction"]["Submit"];
  readonly Field: <Input extends FormInteractionInputKey<Key>>(props: {
    input: Input;
    children?: ReactNode;
  }) => ReactElement | null;
  readonly slot: {
    readonly [Input in FormInteractionInputKey<Key>]: FormSurfaceInputSlot<
      Key,
      Input
    >;
  };
};

type BoardSurfaceSpaceProps<Target extends string> = {
  value: Target;
  children?: ReactNode;
} & Omit<BoardSpaceTargetPropsGeneric<Target>, "value" | "children">;

export type BoardSurfaceBoardId = BoardBaseId & string;

type BoardSurfaceRuntimeBoardId<Board extends BoardSurfaceBoardId> = ReturnType<
  typeof boardHelpers.boardIdsForBase<Board>
>[number] &
  string;

type BoardSurfaceSpaceId<Board extends BoardSurfaceBoardId> = ReturnType<
  typeof boardHelpers.spaceIds<BoardSurfaceRuntimeBoardId<Board>>
>[number] &
  string;

type BoardSurfaceTiledBoardId<Board extends BoardSurfaceBoardId> = Extract<
  BoardSurfaceRuntimeBoardId<Board>,
  TiledBoardId
>;

type BoardSurfaceEdgeId<Board extends BoardSurfaceBoardId> =
  TiledEdgeState<BoardSurfaceTiledBoardId<Board>> extends { id: infer Id }
    ? Id & string
    : EdgeId & string;

type BoardSurfaceVertexId<Board extends BoardSurfaceBoardId> =
  TiledVertexState<BoardSurfaceTiledBoardId<Board>> extends { id: infer Id }
    ? Id & string
    : VertexId & string;

export type BoardSurface<
  Board extends BoardSurfaceBoardId = BoardSurfaceBoardId,
> = {
  readonly Root: InteractionSlotComponent;
  readonly Space: <Target extends BoardSurfaceSpaceId<Board>>(
    props: BoardSurfaceSpaceProps<Target>,
  ) => ReactElement;
  readonly slot: {
    readonly space: BoardSurfaceInputSlot<"space", BoardSurfaceSpaceId<Board>>;
    readonly playerSpace: BoardSurfaceInputSlot<
      "space",
      BoardSurfaceSpaceId<Board>
    >;
    readonly edge: BoardSurfaceInputSlot<"edge", BoardSurfaceEdgeId<Board>>;
    readonly vertex: BoardSurfaceInputSlot<
      "vertex",
      BoardSurfaceVertexId<Board>
    >;
    readonly tile: BoardSurfaceInputSlot<"tile", BoardSurfaceSpaceId<Board>>;
  };
};

type ZoneCardsComponent = InteractionSlotComponent<
  Omit<ZoneListProps, "children" | "empty"> & {
    empty?: ReactNode;
    children: (card: WorkspaceZoneCard) => ReactNode;
  }
>;

type ZoneCardComponent = InteractionSlotComponent<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value"> & {
    card: WorkspaceZoneCard;
  }
>;

/**
 * Generic SDK card-intent shape for typed hand emission. Authors do not
 * import the runtime; the typed `targetId` is constrained by the
 * authored interaction domain on the generated hand surface.
 */
export type HandCardIntent<Card extends string, Target extends string> =
  | { type: "activate"; cardId: Card; source: "tap" | "keyboard" }
  | { type: "previewStart"; cardId: Card }
  | { type: "previewEnd"; cardId: Card }
  | {
      type: "drop";
      cardId: Card;
      targetId: Target;
      source: "pointer" | "keyboard";
    };

export type HandLayoutKindGen =
  | "fan"
  | "compressed-fan"
  | "tray"
  | "strip"
  | "stack";
export type HandLayoutPolicyGen = {
  desktop?: HandLayoutKindGen;
  mobile?: HandLayoutKindGen;
};
export type HandMobileInteractionPolicy = "direct-activate" | "drag-to-target";

export type HandStagingTarget<Card extends string> = {
  readonly kind: "card";
  readonly card: Card;
};

export type HandBoardDropTargetKind = "space" | "edge" | "vertex" | "tile";

/**
 * Discriminated union that ties each board target kind to its manifest id
 * family. `tile` shares the space-id family because tiles are addressed
 * by their underlying space.
 */
export type HandBoardDropTarget<
  Space extends string,
  Edge extends string,
  Vertex extends string,
> =
  | { readonly kind: "space"; readonly target: Space }
  | { readonly kind: "edge"; readonly target: Edge }
  | { readonly kind: "vertex"; readonly target: Vertex }
  | { readonly kind: "tile"; readonly target: Space };

export type HandDropTargetSpec<
  Card extends string,
  Space extends string,
  Edge extends string,
  Vertex extends string,
> = HandStagingTarget<Card> | HandBoardDropTarget<Space, Edge, Vertex>;

/** Union of all manifest target ids the typed hand can carry. */
export type HandAuthoredTarget<
  Card extends string,
  Space extends string,
  Edge extends string,
  Vertex extends string,
> = Card | Space | Edge | Vertex;

/**
 * Summary projected from the live draft for a single hand. Authors render
 * counts and validity hints through the compound `hand.Summary` and
 * `hand.Actions` slots, or mirror them to outside state via
 * `onSelectionSummary`.
 */
export type HandSelectionSummary<Card extends string> = {
  readonly selectedCount: number;
  readonly selectedIds: readonly Card[];
  readonly hasInvalidSelection: boolean;
};

export type HandSurfaceProps<
  Card extends string,
  Space extends string,
  Edge extends string,
  Vertex extends string,
> = Omit<ZoneListProps, "children" | "empty"> & {
  empty?: ReactNode;
  /**
   * Per-card render callback. Receives the projected
   * `InteractionVisualState` (`eligible`, `selected`, `invalid`,
   * `disabled`) so authors can wire SDK `CardFace` directly without
   * recomputing draft state.
   */
  children: (
    card: WorkspaceZoneCard,
    state: InteractionVisualState,
  ) => ReactNode;
  layout?: HandLayoutKindGen | HandLayoutPolicyGen;
  mobileInteraction?: HandMobileInteractionPolicy;
  cardSize?: "sm" | "md" | "lg";
  ariaLabel?: string;
  /**
   * Typed drop targets that participate in `drag-to-target` interaction.
   * Each target's `kind` constrains the allowed `target` id family, so
   * a `SpaceId` cannot be authored as an edge or vertex target.
   */
  dropTargets?: ReadonlyArray<{
    target: HandDropTargetSpec<Card, Space, Edge, Vertex>;
    label: string;
    render: (state: unknown) => ReactNode;
    className?: string;
    role?: string;
    order?: number;
  }>;
  renderDropTargets?: (children: ReactNode) => ReactNode;
  onCardIntent?: (
    intent: HandCardIntent<Card, HandAuthoredTarget<Card, Space, Edge, Vertex>>,
  ) => void;
  /**
   * Optional selection summary observer. Invoked from a layout effect so
   * consumers may safely call `setState` in response.
   */
  onSelectionSummary?: (summary: HandSelectionSummary<Card>) => void;
};

type HandComponent<
  Card extends string,
  Space extends string,
  Edge extends string,
  Vertex extends string,
> = InteractionSlotComponent<
  Omit<HandSurfaceProps<Card, Space, Edge, Vertex>, "children"> & {
    children: ReactNode;
  }
>;

type HandCardsComponent = InteractionSlotComponent<{
  children: (
    card: WorkspaceZoneCard,
    state: InteractionVisualState,
  ) => ReactNode;
}>;

type HandSummaryComponent<Card extends string> = InteractionSlotComponent<{
  children?: ReactNode | ((summary: HandSelectionSummary<Card>) => ReactNode);
}>;

/**
 * Always-visible staging surface for a many-select card collection (e.g. the
 * cards you've chosen to pass): a fixed row of slots showing the staged cards,
 * with empty placeholders otherwise. Tapping a staged card removes it from the
 * collection (it returns to the hand). Renders nothing when the zone has no
 * active many-select collection, so it can be mounted unconditionally.
 */
export type HandStagingProps = {
  // Staged cards are always visible (you can only stage a card you can see), so
  // the slot renderer receives the hydrated card variant — no hidden-card guard.
  children: (card: Extract<WorkspaceZoneCard, { hidden: false }>) => ReactNode;
  label?: ReactNode;
  renderEmptySlot?: (index: number) => ReactNode;
  cardSize?: "sm" | "md" | "lg";
  ariaLabel?: string;
  className?: string;
};

type HandStagingComponent = InteractionSlotComponent<HandStagingProps>;

export type HandSurface<
  Zones extends readonly WorkspaceZoneId[] = readonly WorkspaceZoneId[],
> = {
  readonly Hand: HandComponent<
    CardId & string,
    SpaceId & string,
    EdgeId & string,
    VertexId & string
  >;
  readonly Cards: HandCardsComponent;
  readonly Summary: HandSummaryComponent<CardId & string>;
  readonly Actions: HandSummaryComponent<CardId & string>;
  readonly Card: ZoneCardComponent;
  readonly Staging: HandStagingComponent;
  readonly slot: {
    readonly card: CardSurfaceInputSlot<Zones[number] & string>;
  };
};

export type PileSurface<
  Zones extends readonly WorkspaceZoneId[] = readonly WorkspaceZoneId[],
> = {
  readonly Pile: ZoneCardsComponent;
  readonly Card: ZoneCardComponent;
};

export type CardCollectionSurface<
  Zones extends readonly WorkspaceZoneId[] = readonly WorkspaceZoneId[],
> = {
  readonly Collection: ZoneCardsComponent;
  readonly Card: ZoneCardComponent;
  readonly slot: {
    readonly card: CardSurfaceInputSlot<Zones[number] & string>;
  };
};

export type InteractionFormInputs<Key extends InteractionKey> = {
  [Input in InteractionInputKeysOf<Key>]: (
    slot: InteractionInputSlot<Key, Input>,
  ) => ReactNode;
};

export type InteractionCollectSlots<Key extends InteractionKey> = {
  [Input in RequiredInteractionInputKeysOf<Key>]: InteractionCollectorSlot<
    Key,
    Input
  >;
};

export type InteractionRoute<Key extends InteractionKey> = {
  readonly collect: InteractionCollectSlots<Key>;
};

export type InteractionRoutes = {
  [Key in InteractionKey]: InteractionRoute<Key>;
};

export type InteractionRoutesProps = {
  routes: InteractionRoutes;
  fallback?: ReactNode;
  includeUnavailable?: boolean | null;
};

export type ZeroInputInteractionKey = {
  [K in InteractionKey]: InteractionInputKeysOf<K> extends never ? K : never;
}[InteractionKey];

export type InputInteractionKey = Exclude<
  InteractionKey,
  ZeroInputInteractionKey
>;

type InteractionInputKeyOf<Key extends InteractionKey> =
  Key extends InteractionKey ? InteractionInputKeysOf<Key> : never;

export type InteractionInputKey = InteractionInputKeyOf<InteractionKey>;

export type PromptKey = InteractionKey;

export type PromptOptionValue = string;

export type BoardTargetId = SpaceId | EdgeId | VertexId;

type UIInteractionRegistry = {
  [K in InteractionKey]: {
    interaction: K;
    phase: PhaseOfInteractionKey<K>;
    id: IdOfInteractionKey<K>;
  };
};

type UIInputRegistry = {
  [K in InteractionInputKey]: { input: K };
};

type UIPromptRegistry = {
  [K in PromptKey]: { interaction: K };
};

type UIPromptOptionRegistry = {
  [K in PromptOptionValue]: { value: K };
};

type UIPlayerRegistry = {
  [K in PlayerId & string]: { player: K };
};

type UIZoneRegistry = {
  [K in ZoneId & string]: { zone: K };
};

type UICardRegistry = {
  [K in CardId & string]: { card: K };
};

type UIPhaseRegistry = {
  [K in PhaseName & string]: { phase: K };
};

type UIBoardTargetRegistry = {
  [K in BoardTargetId & string]: { target: K };
};

export const uiContract = {
  interactions: {} as UIInteractionRegistry,
  inputs: {} as UIInputRegistry,
  prompts: {} as UIPromptRegistry,
  promptOptions: {} as UIPromptOptionRegistry,
  players: {} as UIPlayerRegistry,
  zones: {} as UIZoneRegistry,
  cards: {} as UICardRegistry,
  phases: {} as UIPhaseRegistry,
  boardTargets: {} as UIBoardTargetRegistry,
} satisfies UIContract;

declare module "@dreamboard-games/sdk/runtime" {
  interface DreamboardUIRegister {
    contract: GameDefinition;
    ui: typeof uiContract;
  }
}

// -------------------------------------------------------------------------
// Typed hex-board view adapter
// -------------------------------------------------------------------------

/** Generated hex-board topology source, keyed by hex-board id. */
const hexStaticBoards = staticBoards.hex;

/** Union of authored hex-board ids in this workspace's manifest. */
export type HexBoardId = keyof typeof hexStaticBoards & string;

/** Topology object for the named hex board, drawn from `staticBoards.hex`. */
export type HexBoardTopology<Id extends HexBoardId> =
  (typeof hexStaticBoards)[Id];

/** Space id type for the named hex board. */
export type HexBoardSpaceId<Id extends HexBoardId> = BoardSpaceIdOf<
  HexBoardTopology<Id>
>;

export type HexBoardViewProps<
  Id extends HexBoardId,
  TSpaceView extends { id: HexBoardSpaceId<Id> },
> = Omit<
  BoardHexViewPropsGeneric<HexBoardTopology<Id>, TSpaceView>,
  "board"
> & {
  board: Id;
};

export type HexBoardGridProps<
  Id extends HexBoardId,
  TSpaceView extends { id: HexBoardSpaceId<Id> },
> = Omit<
  BoardHexGridPropsGeneric<HexBoardTopology<Id>, TSpaceView>,
  "board" | "interactions"
> & {
  board: Id;
};

type WorkspaceBoard = {
  surface<const Board extends BoardSurfaceBoardId>(
    board: Board,
  ): WorkspaceBoardSurfaceDescriptor<Board>;
  useSurface(name: string): BoardSurface;
  useSurface<const Board extends BoardSurfaceBoardId>(
    name: string,
    options: { board: Board },
  ): BoardSurface<Board>;
  HexView<
    const Id extends HexBoardId,
    const TSpaceView extends { id: HexBoardSpaceId<Id> },
  >(
    props: HexBoardViewProps<Id, TSpaceView>,
  ): ReactElement;
  HexGrid<
    const Id extends HexBoardId,
    const TSpaceView extends { id: HexBoardSpaceId<Id> },
  >(
    props: HexBoardGridProps<Id, TSpaceView>,
  ): ReactElement;
};

type WorkspaceCardProperties =
  CardProperties extends Record<string, unknown>
    ? CardProperties
    : Record<string, unknown>;
type WorkspaceZoneId = [ZoneId] extends [never] ? string : ZoneId;
type WorkspaceCardId = [CardId] extends [never] ? string : CardId;
type WorkspaceCardType = [CardType] extends [never] ? string : CardType;

// ZoneCardRenderItem is a discriminated union (hidden: true | false).
// A bare Omit<..., "zone"> would collapse the union to its common keys and
// strip cardType / properties from the hydrated branch, defeating the
// discriminated-union narrowing the SDK contract promises. Distribute Omit
// across the union so each branch keeps its own shape.
type WorkspaceZoneCard =
  ZoneCardRenderItem<
    WorkspaceCardId & string,
    WorkspaceCardType & string,
    WorkspaceCardProperties
  > extends infer Item
    ? Item extends { zone: string }
      ? Omit<Item, "zone"> & { zone: WorkspaceZoneId }
      : never
    : never;

type HandRole = "primary" | "auxiliary" | "task";

type PilesSurfaceValue<Zones extends readonly CardZoneId[]> = {
  readonly [Zone in Zones[number]]: PileSurface<readonly [Zone]>;
};

type InteractionFormsSurfaceValue<
  Forms extends Readonly<Record<string, InteractionKey>>,
> = {
  readonly [Key in keyof Forms]: Forms[Key] extends InteractionKey
    ? InteractionFormSurface<Forms[Key]>
    : never;
};

type WorkspaceSurfaceValue<Spec> =
  Spec extends WorkspaceBoardSurfaceDescriptor<
    infer Board extends BoardSurfaceBoardId
  >
    ? BoardSurface<Board>
    : Spec extends WorkspaceHandSurfaceDescriptor<
          infer Zone extends PlayerCardZoneId
        >
      ? HandSurface<readonly [Zone]>
      : Spec extends WorkspacePileSurfaceDescriptor<
            infer Zone extends CardZoneId
          >
        ? PileSurface<readonly [Zone]>
        : Spec extends WorkspacePilesSurfaceDescriptor<
              infer Zones extends readonly CardZoneId[]
            >
          ? PilesSurfaceValue<Zones>
          : Spec extends WorkspaceCardCollectionSurfaceDescriptor<
                infer Zones extends readonly CardZoneId[]
              >
            ? CardCollectionSurface<Zones>
            : Spec extends WorkspaceInteractionFormDescriptor<
                  infer Interaction extends InteractionKey
                >
              ? InteractionFormSurface<Interaction>
              : Spec extends WorkspaceInteractionFormsDescriptor<
                    infer Forms extends Readonly<Record<string, InteractionKey>>
                  >
                ? InteractionFormsSurfaceValue<Forms>
                : Spec extends WorkspaceSurfaceSpec
                  ? {
                      readonly [Key in keyof Spec]: WorkspaceSurfaceValue<
                        Spec[Key]
                      >;
                    }
                  : never;

type WorkspaceZone = {
  hand<const Zone extends PlayerCardZoneId>(
    zone: Zone,
    options: { role: HandRole; label: string; order?: number },
  ): WorkspaceHandSurfaceDescriptor<Zone>;
  pile<const Zone extends CardZoneId>(
    zone: Zone,
  ): WorkspacePileSurfaceDescriptor<Zone>;
  piles<const Zones extends readonly CardZoneId[]>(
    zones: Zones,
  ): WorkspacePilesSurfaceDescriptor<Zones>;
  collection<const Zones extends readonly CardZoneId[]>(
    zones: Zones,
    options?: { mode?: "all" | "top-card" },
  ): WorkspaceCardCollectionSurfaceDescriptor<Zones>;
  useHand<const Zone extends PlayerCardZoneId>(
    name: string,
    options: { zone: Zone; role: HandRole; label: string; order?: number },
  ): HandSurface<readonly [Zone]>;
  usePile<const Zone extends CardZoneId>(
    name: string,
    options: { zone: Zone },
  ): PileSurface<readonly [Zone]>;
  useCardCollection<const Zones extends readonly CardZoneId[]>(
    name: string,
    options: { zones: Zones; mode?: "all" | "top-card" },
  ): CardCollectionSurface<Zones>;
};

type WorkspaceUI = Omit<
  DreamboardUI<typeof uiContract>,
  "Root" | "Game" | "Interaction" | "Board" | "Zone" | "Prompt" | "PromptInbox"
> & {
  Root(props: UIRootProps): ReactElement;
  defineSurfaces<const Spec extends WorkspaceSurfaceSpec>(
    spec: Spec,
  ): () => WorkspaceSurfaceValue<Spec>;
  defineGameUI<Surfaces>(
    config: DefineGameUIConfig<GameRootState, Surfaces> & {
      useSurfaces: () => Surfaces;
      interactionRoutes?: (context: {
        game: GameRootState;
        surfaces: Surfaces;
      }) => InteractionRoutes;
      phases: {
        readonly [Phase in PhaseName]: (context: {
          game: GameRootState;
          surfaces: Surfaces;
        }) => ReactNode;
      };
    },
  ): (props: Omit<UIRootProps, "children">) => ReactElement;
  readonly Game: TypedGame<typeof uiContract, GameView, PlayerId, PhaseName>;
  readonly Interaction: Pick<
    DreamboardUI<typeof uiContract>["Interaction"],
    "State" | "Dialog"
  > & {
    useForm<Key extends InteractionKey>(
      interaction: Key,
    ): InteractionFormSurface<Key>;
    form<const Interaction extends InteractionKey>(
      interaction: Interaction,
    ): WorkspaceInteractionFormDescriptor<Interaction>;
    forms<const Interactions extends Readonly<Record<string, InteractionKey>>>(
      interactions: Interactions,
    ): WorkspaceInteractionFormsDescriptor<Interactions>;
    Routes(props: InteractionRoutesProps): ReactElement;
  };
  readonly Board: WorkspaceBoard;
  readonly Zone: WorkspaceZone;
  readonly ResourceCounter: ResourceCounterComponents<ResourceId>;
};

function formInputKeysForInteraction(interaction: string): Set<string> {
  const [phase, id] = interaction.split(".", 2);
  const phaseSpec = phase
    ? (game.phases as Record<string, unknown>)[phase]
    : undefined;
  const phaseRecord = phaseSpec as
    | {
        interactions?: Record<
          string,
          { inputs?: Record<string, { kind?: string }> }
        >;
        cardActions?: Record<
          string,
          { inputs?: Record<string, { kind?: string }> }
        >;
        submit?: { inputs?: Record<string, { kind?: string }> };
      }
    | undefined;
  const spec =
    (id ? phaseRecord?.interactions?.[id] : undefined) ??
    (id ? phaseRecord?.cardActions?.[id] : undefined) ??
    (id === "submit" ? phaseRecord?.submit : undefined);
  return new Set(
    Object.entries((spec?.inputs ?? {}) as Record<string, { kind?: string }>)
      .filter(
        ([, collector]) =>
          collector.kind === "form" || collector.kind === "prompt",
      )
      .map(([input]) => input),
  );
}

export const UI = createWorkspaceUIContract<
  WorkspaceUI,
  typeof uiContract,
  ResourceId,
  WorkspaceZoneCard,
  typeof hexStaticBoards
>({
  uiContract,
  clientParamSchemasByPhase: createClientParamSchemasByPhase(
    game,
  ) as ClientParamSchemaMap,
  formInputKeysForInteraction,
  resourceIds: literals.resourceIds as readonly ResourceId[],
  resourcePresentationById: literals.resourcePresentationById as Partial<
    Record<string, { label?: string; icon?: string }>
  >,
  hexStaticBoards,
  cardIdFromZoneCard: (card) => card.id,
  zoneIdFromZoneCard: (card) => card.zone,
});
export const Board: WorkspaceUI["Board"] = UI.Board;
export const Zone: WorkspaceUI["Zone"] = UI.Zone;
export const Game: WorkspaceUI["Game"] = UI.Game;
export const Interaction = UI.Interaction;
export const PlayerRoster: WorkspaceUI["PlayerRoster"] = UI.PlayerRoster;
export const Dice: WorkspaceUI["Dice"] = UI.Dice;
export const Phase = UI.Phase;
export const ResourceCounter: WorkspaceUI["ResourceCounter"] =
  UI.ResourceCounter;

export const clientParamSchemasByPhase = createClientParamSchemasByPhase(
  game,
) as ClientParamSchemaMap;
