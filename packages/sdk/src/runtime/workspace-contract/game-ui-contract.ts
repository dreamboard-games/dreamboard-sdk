import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import {
  createClientParamSchemasByPhase,
  type ClientParamsOfInteractionOfDefinition,
  type DefaultedClientParamKeysOfInteractionOfDefinition,
  type InputKeysWithCollectorKindOfDefinition,
  type InteractionIdOfDefinitionPhase,
  type PhaseNamesOfDefinition,
  type ViewNamesOfDefinition,
  type ViewOfDefinition,
} from "../../reducer/advanced.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import { createWorkspaceUIContract, type DefineGameUIConfig } from "./index.js";
import type { DreamboardUI, TypedGame, UIContract } from "../ui-contract.js";
import type {
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
} from "../primitives/game.js";
import type { UIRootProps } from "../primitives/ui.js";
import type {
  AnyHexBoardInput,
  AnySquareBoardInput,
  BoardSpaceIdOf,
  InteractionVisualState,
  ResourceCounterComponents,
} from "../../ui.js";
import type {
  WorkspaceBoardSurface,
  WorkspaceBoardSurfaceDescriptor,
  WorkspaceCardCollectionSurfaceDescriptor,
  WorkspaceHandSurfaceDescriptor,
  WorkspaceInteractionFormDescriptor,
  WorkspaceInteractionFormsDescriptor,
  WorkspaceBoardTargetInputSlot,
  WorkspaceFormInputSlot,
  WorkspaceInteractionSlotComponent,
  WorkspacePileSurfaceDescriptor,
  WorkspacePilesSurfaceDescriptor,
  WorkspaceSurfaceSpec,
} from "./types.js";
import type { WorkspaceInteractionFormDialogProps } from "./forms.js";
import type { ZoneCardRenderItem, ZoneListProps } from "../primitives/zone.js";
import type { ClientParamSchemaMap } from "../context/ClientParamSchemaContext.js";

export interface GameUiManifestTypes {
  readonly PlayerId: string;
  readonly ResourceId: string;
  readonly ZoneId: string;
  readonly CardId: string;
  readonly CardType: string;
  readonly CardProperties: Record<string, unknown>;
  readonly BoardBaseId: string;
  readonly SpaceId: string;
  readonly EdgeId: string;
  readonly VertexId: string;
  readonly PlayerCardZoneId: string;
  readonly CardZoneId: string;
}

export type GameUiPhaseName<Game> = PhaseNamesOfDefinition<Game>;
export type GameUiViewName<Game> = ViewNamesOfDefinition<Game>;
export type GameUiView<Game> =
  Extract<"player", GameUiViewName<Game>> extends never
    ? never
    : ViewOfDefinition<Game, Extract<"player", GameUiViewName<Game>>>;

export type GameUiInteractionIdForPhase<
  Game,
  Phase extends GameUiPhaseName<Game>,
> = InteractionIdOfDefinitionPhase<Game, Phase>;

export type GameUiInteractionKey<Game> = {
  [Phase in GameUiPhaseName<Game>]: `${Phase}.${GameUiInteractionIdForPhase<Game, Phase>}`;
}[GameUiPhaseName<Game>];

type PhaseOfInteractionKey<
  Game,
  Key extends GameUiInteractionKey<Game>,
> = Key extends `${infer Phase}.${string}`
  ? Extract<Phase, GameUiPhaseName<Game>>
  : never;

type IdOfInteractionKey<
  Game,
  Key extends GameUiInteractionKey<Game>,
> = Key extends `${infer Phase}.${infer Id}`
  ? Phase extends GameUiPhaseName<Game>
    ? Extract<Id, GameUiInteractionIdForPhase<Game, Phase>>
    : never
  : never;

export type GameUiInteractionParamsOf<
  Game,
  Key extends GameUiInteractionKey<Game>,
> = ClientParamsOfInteractionOfDefinition<
  Game,
  PhaseOfInteractionKey<Game, Key>,
  IdOfInteractionKey<Game, Key>
>;

type CollectorKind =
  | "form"
  | "board-vertex"
  | "board-edge"
  | "board-tile"
  | "board-space"
  | "card"
  | "prompt";

type AuthoredInputKeys<Game, Key extends GameUiInteractionKey<Game>> =
  InputKeysWithCollectorKindOfDefinition<
    Game,
    PhaseOfInteractionKey<Game, Key>,
    IdOfInteractionKey<Game, Key>,
    CollectorKind
  > extends infer Input
    ? string extends Input
      ? never
      : Input & string
    : never;

export type GameUiInteractionInputKeys<
  Game,
  Key extends GameUiInteractionKey<Game>,
> =
  | (string extends keyof GameUiInteractionParamsOf<Game, Key>
      ? never
      : keyof GameUiInteractionParamsOf<Game, Key> & string)
  | AuthoredInputKeys<Game, Key>
  | (DefaultedClientParamKeysOfInteractionOfDefinition<
      Game,
      PhaseOfInteractionKey<Game, Key>,
      IdOfInteractionKey<Game, Key>
    > &
      string);

export type GameUiInteractionSlot = {
  readonly Field: WorkspaceInteractionSlotComponent;
  readonly Options: WorkspaceInteractionSlotComponent<{
    children: (option: { value: unknown; label: string }) => ReactNode;
  }>;
  readonly Value: WorkspaceInteractionSlotComponent<{
    children: (value: unknown | undefined) => ReactNode;
  }>;
  readonly Default: WorkspaceInteractionSlotComponent;
  readonly Card: WorkspaceInteractionSlotComponent<{ value: string }>;
  readonly Cards: WorkspaceInteractionSlotComponent<{
    children: (card: { id: string }) => ReactNode;
  }>;
  readonly Target: WorkspaceInteractionSlotComponent<{ value: string }>;
};

type GameUiCollectorSlot<
  Game,
  Key extends GameUiInteractionKey<Game>,
  Input extends GameUiInteractionInputKeys<Game, Key>,
> =
  Input extends InputKeysWithCollectorKindOfDefinition<
    Game,
    PhaseOfInteractionKey<Game, Key>,
    IdOfInteractionKey<Game, Key>,
    "board-space"
  >
    ? WorkspaceBoardTargetInputSlot<"space", never>
    : Input extends InputKeysWithCollectorKindOfDefinition<
          Game,
          PhaseOfInteractionKey<Game, Key>,
          IdOfInteractionKey<Game, Key>,
          "board-edge"
        >
      ? WorkspaceBoardTargetInputSlot<"edge", never>
      : Input extends InputKeysWithCollectorKindOfDefinition<
            Game,
            PhaseOfInteractionKey<Game, Key>,
            IdOfInteractionKey<Game, Key>,
            "board-vertex"
          >
        ? WorkspaceBoardTargetInputSlot<"vertex", never>
        : Input extends InputKeysWithCollectorKindOfDefinition<
              Game,
              PhaseOfInteractionKey<Game, Key>,
              IdOfInteractionKey<Game, Key>,
              "board-tile"
            >
          ? WorkspaceBoardTargetInputSlot<"tile", never>
          : Input extends InputKeysWithCollectorKindOfDefinition<
                Game,
                PhaseOfInteractionKey<Game, Key>,
                IdOfInteractionKey<Game, Key>,
                "card"
              >
            ? GameUiInteractionSlot
            : WorkspaceFormInputSlot<Input>;

export type GameUiInteractionFormSurface<
  Game,
  Contract extends UIContract,
  Key extends GameUiInteractionKey<Game>,
> = {
  readonly Root: WorkspaceInteractionSlotComponent;
  readonly Form: DreamboardUI<Contract>["Interaction"]["Form"];
  readonly Dialog: (
    props: WorkspaceInteractionFormDialogProps,
  ) => ReactElement | null;
  readonly State: DreamboardUI<Contract>["Interaction"]["State"];
  readonly Arm: DreamboardUI<Contract>["Interaction"]["Trigger"];
  readonly Submit: DreamboardUI<Contract>["Interaction"]["Submit"];
  readonly Field: <Input extends GameUiInteractionInputKeys<Game, Key>>(props: {
    input: Input;
    children?: ReactNode;
  }) => ReactElement | null;
  readonly slot: {
    readonly [Input in GameUiInteractionInputKeys<
      Game,
      Key
    >]: GameUiCollectorSlot<Game, Key, Input>;
  };
};

export type GameUiInteractionRoutes<Game> = Partial<{
  [Key in GameUiInteractionKey<Game>]: {
    readonly collect: {
      [Input in GameUiInteractionInputKeys<Game, Key>]: GameUiCollectorSlot<
        Game,
        Key,
        Input
      >;
    };
  };
}>;

export type GameUiZoneCard<Manifest extends GameUiManifestTypes> =
  ZoneCardRenderItem<
    Manifest["CardId"],
    Manifest["CardType"],
    Manifest["CardProperties"]
  > extends infer Item
    ? Item extends { zone: string }
      ? Omit<Item, "zone"> & { zone: Manifest["ZoneId"] }
      : never
    : never;

export type GameUiBoardSurface<
  Manifest extends GameUiManifestTypes,
  _Board extends Manifest["BoardBaseId"] = Manifest["BoardBaseId"],
> = WorkspaceBoardSurface<
  Manifest["SpaceId"],
  Manifest["EdgeId"],
  Manifest["VertexId"],
  Manifest["SpaceId"]
> & { readonly __board?: _Board };

type ZoneCardsComponent<Manifest extends GameUiManifestTypes> =
  WorkspaceInteractionSlotComponent<
    Omit<ZoneListProps, "children" | "empty"> & {
      empty?: ReactNode;
      children: (card: GameUiZoneCard<Manifest>) => ReactNode;
    }
  >;

type ZoneCardComponent<Manifest extends GameUiManifestTypes> =
  WorkspaceInteractionSlotComponent<
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "value"> & {
      card: GameUiZoneCard<Manifest>;
    }
  >;

export type GameUiHandCardIntent<Card extends string, Target extends string> =
  | { type: "activate"; cardId: Card; source: "tap" | "keyboard" }
  | { type: "previewStart"; cardId: Card }
  | { type: "previewEnd"; cardId: Card }
  | {
      type: "drop";
      cardId: Card;
      targetId: Target;
      source: "pointer" | "keyboard";
    };

export type GameUiHandSelectionSummary<Card extends string> = {
  readonly selectedCount: number;
  readonly selectedIds: readonly Card[];
  readonly hasInvalidSelection: boolean;
};

type GameUiHandProps<Manifest extends GameUiManifestTypes> = Omit<
  ZoneListProps,
  "children" | "empty"
> & {
  empty?: ReactNode;
  children: (
    card: GameUiZoneCard<Manifest>,
    state: InteractionVisualState,
  ) => ReactNode;
  layout?:
    | "fan"
    | "compressed-fan"
    | "tray"
    | "strip"
    | "stack"
    | {
        desktop?: "fan" | "compressed-fan" | "tray" | "strip" | "stack";
        mobile?: "fan" | "compressed-fan" | "tray" | "strip" | "stack";
      };
  mobileInteraction?: "direct-activate" | "drag-to-target";
  cardSize?: "sm" | "md" | "lg";
  ariaLabel?: string;
  dropTargets?: ReadonlyArray<{
    target:
      | { readonly kind: "card"; readonly card: Manifest["CardId"] }
      | {
          readonly kind: "space" | "tile";
          readonly target: Manifest["SpaceId"];
        }
      | { readonly kind: "edge"; readonly target: Manifest["EdgeId"] }
      | {
          readonly kind: "vertex";
          readonly target: Manifest["VertexId"];
        };
    label: string;
    render: (state: unknown) => ReactNode;
    className?: string;
    role?: string;
    order?: number;
  }>;
  renderDropTargets?: (children: ReactNode) => ReactNode;
  onCardIntent?: (
    intent: GameUiHandCardIntent<
      Manifest["CardId"],
      | Manifest["CardId"]
      | Manifest["SpaceId"]
      | Manifest["EdgeId"]
      | Manifest["VertexId"]
    >,
  ) => void;
  onSelectionSummary?: (
    summary: GameUiHandSelectionSummary<Manifest["CardId"]>,
  ) => void;
};

export type GameUiHandSurface<
  Manifest extends GameUiManifestTypes,
  Zones extends readonly Manifest["ZoneId"][] = readonly Manifest["ZoneId"][],
> = {
  readonly Hand: WorkspaceInteractionSlotComponent<
    Omit<GameUiHandProps<Manifest>, "children"> & { children: ReactNode }
  >;
  readonly Cards: WorkspaceInteractionSlotComponent<{
    children: (
      card: GameUiZoneCard<Manifest>,
      state: InteractionVisualState,
    ) => ReactNode;
  }>;
  readonly Summary: (props: {
    children?:
      | ReactNode
      | ((
          summary: GameUiHandSelectionSummary<Manifest["CardId"]>,
        ) => ReactNode);
  }) => ReactElement | null;
  readonly Actions: (props: {
    children?:
      | ReactNode
      | ((
          summary: GameUiHandSelectionSummary<Manifest["CardId"]>,
        ) => ReactNode);
  }) => ReactElement | null;
  readonly Card: ZoneCardComponent<Manifest>;
  readonly Staging: WorkspaceInteractionSlotComponent<{
    children: (
      card: Extract<GameUiZoneCard<Manifest>, { hidden: false }>,
    ) => ReactNode;
    label?: ReactNode;
    renderEmptySlot?: (index: number) => ReactNode;
    cardSize?: "sm" | "md" | "lg";
    ariaLabel?: string;
    className?: string;
  }>;
  readonly slot: {
    readonly card: GameUiInteractionSlot & { readonly __zones?: Zones };
  };
};

export type GameUiPileSurface<Manifest extends GameUiManifestTypes> = {
  readonly Pile: ZoneCardsComponent<Manifest>;
  readonly Card: ZoneCardComponent<Manifest>;
};

export type GameUiCardCollectionSurface<
  Manifest extends GameUiManifestTypes,
  Zones extends readonly Manifest["ZoneId"][] = readonly Manifest["ZoneId"][],
> = {
  readonly Collection: ZoneCardsComponent<Manifest>;
  readonly Card: ZoneCardComponent<Manifest>;
  readonly slot: {
    readonly card: GameUiInteractionSlot & { readonly __zones?: Zones };
  };
};

type UiRegistry<Game, Manifest extends GameUiManifestTypes> = {
  interactions: {
    [Key in GameUiInteractionKey<Game>]: {
      interaction: Key;
      phase: PhaseOfInteractionKey<Game, Key>;
      id: IdOfInteractionKey<Game, Key>;
    };
  };
  inputs: {
    [Key in GameUiInteractionInputKeys<Game, GameUiInteractionKey<Game>>]: {
      input: Key;
    };
  };
  prompts: {
    [Key in GameUiInteractionKey<Game>]: { interaction: Key };
  };
  promptOptions: Record<string, { value: string }>;
  players: { [Key in Manifest["PlayerId"]]: { player: Key } };
  zones: { [Key in Manifest["ZoneId"]]: { zone: Key } };
  cards: { [Key in Manifest["CardId"]]: { card: Key } };
  phases: { [Key in GameUiPhaseName<Game>]: { phase: Key } };
  boardTargets: {
    [Key in Manifest["SpaceId"] | Manifest["EdgeId"] | Manifest["VertexId"]]: {
      target: Key;
    };
  };
};

export type GameUiContract<
  Game,
  Manifest extends GameUiManifestTypes,
> = UiRegistry<Game, Manifest>;

type SurfaceValue<
  Game,
  Manifest extends GameUiManifestTypes,
  Contract extends UIContract,
  Spec,
> =
  Spec extends WorkspaceBoardSurfaceDescriptor<
    infer Board extends Manifest["BoardBaseId"]
  >
    ? GameUiBoardSurface<Manifest, Board>
    : Spec extends WorkspaceHandSurfaceDescriptor<
          infer Zone extends Manifest["PlayerCardZoneId"]
        >
      ? GameUiHandSurface<Manifest, readonly [Zone]>
      : Spec extends WorkspacePileSurfaceDescriptor<
            infer Zone extends Manifest["CardZoneId"]
          >
        ? GameUiPileSurface<Manifest> & { readonly __zone?: Zone }
        : Spec extends WorkspacePilesSurfaceDescriptor<
              infer Zones extends readonly Manifest["CardZoneId"][]
            >
          ? { readonly [Zone in Zones[number]]: GameUiPileSurface<Manifest> }
          : Spec extends WorkspaceCardCollectionSurfaceDescriptor<
                infer Zones extends readonly Manifest["CardZoneId"][]
              >
            ? GameUiCardCollectionSurface<Manifest, Zones>
            : Spec extends WorkspaceInteractionFormDescriptor<
                  infer Interaction extends GameUiInteractionKey<Game>
                >
              ? GameUiInteractionFormSurface<Game, Contract, Interaction>
              : Spec extends WorkspaceInteractionFormsDescriptor<
                    infer Forms extends Readonly<
                      Record<string, GameUiInteractionKey<Game>>
                    >
                  >
                ? {
                    readonly [Key in keyof Forms]: GameUiInteractionFormSurface<
                      Game,
                      Contract,
                      Forms[Key]
                    >;
                  }
                : Spec extends WorkspaceSurfaceSpec
                  ? {
                      readonly [Key in keyof Spec]: SurfaceValue<
                        Game,
                        Manifest,
                        Contract,
                        Spec[Key]
                      >;
                    }
                  : never;

type GameUiHexBoardId<HexBoards> = keyof HexBoards & string;
type GameUiSquareBoardId<SquareBoards> = keyof SquareBoards & string;
type GameUiHexBoardTopology<
  HexBoards,
  Id extends GameUiHexBoardId<HexBoards>,
> = Extract<HexBoards[Id], AnyHexBoardInput>;
type GameUiSquareBoardTopology<
  SquareBoards,
  Id extends GameUiSquareBoardId<SquareBoards>,
> = Extract<SquareBoards[Id], AnySquareBoardInput>;
type GameUiHexBoardSpaceId<
  HexBoards,
  Id extends GameUiHexBoardId<HexBoards>,
> = BoardSpaceIdOf<GameUiHexBoardTopology<HexBoards, Id>>;

type GameUiBoardNamespace<
  Manifest extends GameUiManifestTypes,
  Contract extends UIContract,
  HexBoards,
  SquareBoards,
> = Omit<
  DreamboardUI<Contract>["Board"],
  "HexView" | "HexGrid" | "SquareGrid"
> & {
  surface<const Board extends Manifest["BoardBaseId"]>(
    board: Board,
  ): WorkspaceBoardSurfaceDescriptor<Board>;
  useSurface<const Board extends Manifest["BoardBaseId"]>(
    name: string,
    options?: { board: Board },
  ): GameUiBoardSurface<Manifest, Board>;
  HexView<
    const Id extends GameUiHexBoardId<HexBoards>,
    const SpaceView extends {
      id: GameUiHexBoardSpaceId<HexBoards, Id>;
    },
  >(
    props: Omit<
      import("../primitives/board.js").BoardHexViewProps<
        GameUiHexBoardTopology<HexBoards, Id>,
        SpaceView
      >,
      "board"
    > & { board: Id },
  ): ReactElement;
  HexGrid<
    const Id extends GameUiHexBoardId<HexBoards>,
    const SpaceView extends {
      id: GameUiHexBoardSpaceId<HexBoards, Id>;
    },
  >(
    props: Omit<
      import("../primitives/board.js").BoardHexGridProps<
        GameUiHexBoardTopology<HexBoards, Id>,
        SpaceView
      >,
      "board" | "interactions"
    > & { board: Id },
  ): ReactElement;
  SquareGrid<const Id extends GameUiSquareBoardId<SquareBoards>>(
    props: Omit<
      import("../primitives/board.js").BoardSquareGridProps<
        GameUiSquareBoardTopology<SquareBoards, Id>
      >,
      "board" | "interactions"
    > & { board: Id },
  ): ReactElement;
};

export type GameWorkspaceUI<
  Game,
  Manifest extends GameUiManifestTypes,
  Contract extends GameUiContract<Game, Manifest>,
  HexBoards,
  SquareBoards,
> = Omit<
  DreamboardUI<Contract>,
  "Root" | "Game" | "Interaction" | "Board" | "Zone" | "Prompt" | "PromptInbox"
> & {
  Root(props: UIRootProps): ReactElement;
  defineSurfaces<const Spec extends WorkspaceSurfaceSpec>(
    spec: Spec,
  ): () => SurfaceValue<Game, Manifest, Contract, Spec>;
  defineGameUI<Surfaces>(
    config: DefineGameUIConfig<
      GameRenderState<
        GameUiView<Game>,
        Manifest["PlayerId"],
        GameUiPhaseName<Game>
      >,
      Surfaces
    > & {
      useSurfaces: () => Surfaces;
      interactionRoutes?: () => GameUiInteractionRoutes<Game>;
      phases: {
        readonly [Phase in GameUiPhaseName<Game>]: (context: {
          game: GameRenderState<
            GameUiView<Game>,
            Manifest["PlayerId"],
            GameUiPhaseName<Game>
          >;
          surfaces: Surfaces;
        }) => ReactNode;
      };
    },
  ): (props: Omit<UIRootProps, "children">) => ReactElement;
  readonly Game: TypedGame<
    Contract,
    GameUiView<Game>,
    Manifest["PlayerId"],
    GameUiPhaseName<Game>
  >;
  readonly Interaction: Pick<
    DreamboardUI<Contract>["Interaction"],
    "State" | "Dialog"
  > & {
    useForm<Key extends GameUiInteractionKey<Game>>(
      interaction: Key,
    ): GameUiInteractionFormSurface<Game, Contract, Key>;
    form<const Interaction extends GameUiInteractionKey<Game>>(
      interaction: Interaction,
    ): WorkspaceInteractionFormDescriptor<Interaction>;
    forms<
      const Interactions extends Readonly<
        Record<string, GameUiInteractionKey<Game>>
      >,
    >(
      interactions: Interactions,
    ): WorkspaceInteractionFormsDescriptor<Interactions>;
    Routes(props: {
      routes: GameUiInteractionRoutes<Game>;
      fallback?: ReactNode;
      includeUnavailable?: boolean | null;
    }): ReactElement;
  };
  readonly Board: GameUiBoardNamespace<
    Manifest,
    Contract,
    HexBoards,
    SquareBoards
  >;
  readonly Zone: {
    hand<const Zone extends Manifest["PlayerCardZoneId"]>(
      zone: Zone,
      options: {
        role: "primary" | "auxiliary" | "task";
        label: string;
        order?: number;
      },
    ): WorkspaceHandSurfaceDescriptor<Zone>;
    pile<const Zone extends Manifest["CardZoneId"]>(
      zone: Zone,
    ): WorkspacePileSurfaceDescriptor<Zone>;
    collection<const Zones extends readonly Manifest["CardZoneId"][]>(
      zones: Zones,
      options?: { mode?: "all" | "top-card" },
    ): WorkspaceCardCollectionSurfaceDescriptor<Zones>;
  } & DreamboardUI<Contract>["Zone"];
  readonly ResourceCounter: ResourceCounterComponents<Manifest["ResourceId"]>;
};

export interface CreateGameUiContractOptions<
  Game,
  Manifest extends GameUiManifestTypes,
  HexBoards extends Record<string, unknown>,
  SquareBoards extends Record<string, unknown>,
> {
  readonly game: Game;
  readonly resourceIds: readonly Manifest["ResourceId"][];
  readonly resourcePresentationById?: Partial<
    Record<string, { label?: string; icon?: string }>
  >;
  readonly hexStaticBoards: HexBoards;
  readonly squareStaticBoards: SquareBoards;
}

export function createGameUiContract<
  Game,
  Manifest extends GameUiManifestTypes,
  HexBoards extends Record<string, unknown>,
  SquareBoards extends Record<string, unknown>,
>(
  options: CreateGameUiContractOptions<Game, Manifest, HexBoards, SquareBoards>,
) {
  type Contract = GameUiContract<Game, Manifest>;
  type UI = GameWorkspaceUI<Game, Manifest, Contract, HexBoards, SquareBoards>;
  type Card = GameUiZoneCard<Manifest>;

  const uiContract = {
    interactions: {},
    inputs: {},
    prompts: {},
    promptOptions: {},
    players: {},
    zones: {},
    cards: {},
    phases: {},
    boardTargets: {},
  } as Contract;
  const clientParamSchemasByPhase = createClientParamSchemasByPhase(
    options.game as Parameters<typeof createClientParamSchemasByPhase>[0],
  ) as ClientParamSchemaMap;

  const formInputKeysForInteraction = (interaction: string) => {
    const [phase, id] = interaction.split(".", 2);
    const phaseSpec = phase
      ? (options.game as { phases?: Record<string, unknown> }).phases?.[phase]
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
      Object.entries(spec?.inputs ?? {})
        .filter(
          ([, collector]) =>
            collector.kind === "form" || collector.kind === "prompt",
        )
        .map(([input]) => input),
    );
  };

  const UI = createWorkspaceUIContract<
    UI,
    Contract,
    Manifest["ResourceId"],
    Card,
    HexBoards,
    SquareBoards
  >({
    uiContract,
    clientParamSchemasByPhase,
    formInputKeysForInteraction,
    resourceIds: options.resourceIds,
    resourcePresentationById: options.resourcePresentationById,
    hexStaticBoards: options.hexStaticBoards,
    squareStaticBoards: options.squareStaticBoards,
    cardIdFromZoneCard: (card) => card.id,
    zoneIdFromZoneCard: (card) => card.zone,
  });

  return { uiContract, UI, clientParamSchemasByPhase };
}

export type GameUiGameRootState<
  Game,
  Manifest extends GameUiManifestTypes,
> = GameRenderState<
  GameUiView<Game>,
  Manifest["PlayerId"],
  GameUiPhaseName<Game>
>;
export type GameUiPlayers<Manifest extends GameUiManifestTypes> =
  GamePlayersState<Manifest["PlayerId"]>;
export type GameUiMe<Manifest extends GameUiManifestTypes> = GameMeState<
  Manifest["PlayerId"]
>;
export type GameUiTurn<
  Game,
  Manifest extends GameUiManifestTypes,
> = GameTurnState<Manifest["PlayerId"], GameUiPhaseName<Game>>;
export type GameUiInteractionDescriptor<
  Game,
  Key extends GameUiInteractionKey<Game>,
> = InteractionDescriptor<Key>;
