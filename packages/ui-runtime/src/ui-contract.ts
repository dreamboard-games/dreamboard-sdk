import type {
  ButtonHTMLAttributes,
  ComponentType,
  ReactElement,
  ReactNode,
} from "react";
import {
  Board as BoardPrimitive,
  Dice as DicePrimitive,
  Game as GamePrimitive,
  Interaction as InteractionPrimitive,
  Phase as PhasePrimitive,
  PlayerRoster as PlayerRosterPrimitive,
  Prompt as PromptPrimitive,
  PromptInbox as PromptInboxPrimitive,
  UI as UIPrimitive,
  Zone as ZonePrimitive,
  type BoardHexGridProps,
  type BoardHexGridInteractionFilter,
  type BoardTargetProps,
  type BoardSpaceTargetProps,
  type BoardEdgeTargetProps,
  type BoardVertexTargetProps,
  type GameChromeProps,
  type DiceComponents,
  type GameRootProps,
  type InteractionCardInputProps,
  type InteractionDialogProps,
  type InteractionFieldPrimitiveProps,
  type InteractionFormPrimitiveProps,
  type InteractionRoutesMap,
  type InteractionRoutesProps,
  type InteractionRootProps,
  type InteractionSwitchRouteMap,
  type InteractionSwitchProps,
  type PhaseSwitchProps,
  type PlayerRosterComponents,
  type PlayerRosterBadge,
  type PlayerRosterEntry,
  type PlayerRosterListProps,
  type PlayerRosterPartProps,
  type PlayerRosterRootProps,
  type PlayerRosterSwitchButtonProps,
  type PromptDialogProps,
  type PromptInboxItemsProps,
  type PromptOptionRenderItem,
  type PromptOptionProps,
  type PromptOptionsProps,
  type PromptRootProps,
  type UIRootProps,
  type ZoneItemProps,
  type ZoneCardAtProps,
  type ZoneCardActionProps,
  type ZoneCardRenderItem,
  type ZoneListProps,
  type ZonePileCardsProps,
  type ZonePileRootProps,
  type ZoneRootProps,
} from "./primitives/index.js";
import type { InteractionDescriptor } from "./types/plugin-state.js";
import type {
  AnyHexBoardInput,
  BoardSpaceIdOf,
} from "@dreamboard-games/ui-sdk";

/**
 * Workspace-aware UI typing extension point.
 *
 * Generated workspaces will augment this interface with their concrete UI
 * contract. The unregistered SDK keeps all public keys string-compatible so
 * package-local tests and generic consumers can still import ui-sdk directly.
 */
export interface DreamboardUIRegister {}

export type UIContractBucket = Record<string, unknown>;

export interface UIContract {
  interactions?: UIContractBucket;
  inputs?: UIContractBucket;
  prompts?: UIContractBucket;
  promptOptions?: UIContractBucket;
  players?: UIContractBucket;
  zones?: UIContractBucket;
  cards?: UIContractBucket;
  phases?: UIContractBucket;
  boardTargets?: UIContractBucket;
}

type RegisteredUIContract = DreamboardUIRegister extends {
  ui: infer Registered extends UIContract;
}
  ? Registered
  : UIContract;

type BucketOf<Contract extends UIContract, Key extends keyof UIContract> =
  NonNullable<Contract[Key]> extends UIContractBucket
    ? NonNullable<Contract[Key]>
    : UIContractBucket;

type StringKeyOf<Bucket extends UIContractBucket> = Extract<
  keyof Bucket,
  string
>;

type StringKeysOrFallback<Bucket extends UIContractBucket> = [
  StringKeyOf<Bucket>,
] extends [never]
  ? string
  : string extends StringKeyOf<Bucket>
    ? string
    : StringKeyOf<Bucket>;

export type RegisteredUI = RegisteredUIContract;

export type InteractionKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "interactions">>;

export type InteractionInputKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "inputs">>;

export type PromptKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "prompts">>;

export type PromptOptionKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "promptOptions">>;

export type PlayerKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "players">>;

export type ZoneKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "zones">>;

export type CardKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "cards">>;

export type PhaseKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "phases">>;

export type BoardTargetKey<Contract extends UIContract = RegisteredUI> =
  StringKeysOrFallback<BucketOf<Contract, "boardTargets">>;

type TypedZoneCardRenderItem<Contract extends UIContract> =
  ZoneCardRenderItem<CardKey<Contract> & string> extends infer Item
    ? Item extends { id: string; zone: string }
      ? Omit<Item, "id" | "zone"> & {
          id: CardKey<Contract>;
          zone: ZoneKey<Contract>;
        }
      : never
    : never;

export type TypedInteraction<Contract extends UIContract> = Omit<
  typeof InteractionPrimitive,
  "Root" | "CardInput" | "Dialog" | "Field" | "Form" | "Switch"
> & {
  Root<Interaction extends InteractionKey<Contract>>(
    props: InteractionRootProps<Interaction>,
  ): ReactElement | null;
  Switch(
    props: Omit<InteractionSwitchProps<InteractionKey<Contract>>, "routes"> & {
      routes: InteractionSwitchRouteMap<InteractionKey<Contract>>;
    },
  ): ReactElement;
  Routes(
    props: Omit<InteractionRoutesProps<InteractionKey<Contract>>, "routes"> & {
      routes: InteractionRoutesMap<InteractionKey<Contract>>;
    },
  ): ReactElement;
  CardInput<Input extends InteractionInputKey<Contract>>(
    props: Omit<InteractionCardInputProps, "input" | "unsafeCardId"> & {
      input: Input;
      unsafeCardId?: CardKey<Contract>;
    },
  ): ReactElement;
  Dialog<Interaction extends InteractionKey<Contract>>(
    props: InteractionDialogProps<Interaction>,
  ): ReactElement;
  Field<Input extends InteractionInputKey<Contract>>(
    props: Omit<InteractionFieldPrimitiveProps, "input"> & { input: Input },
  ): ReactElement | null;
  Form(props: InteractionFormPrimitiveProps): ReactElement | null;
};

export type InteractionSlotComponent<Props = object> = ComponentType<
  Props extends { children: unknown } ? Props : Props & { children?: ReactNode }
>;

export interface InteractionDefaultInputSlot {
  readonly Default: InteractionSlotComponent;
}

export interface InteractionValueInputSlot<Value = unknown> {
  readonly Value: InteractionSlotComponent<{
    children: (value: Value | undefined) => ReactNode;
  }>;
}

export interface InteractionChoiceInputSlot<Value = unknown> {
  readonly Field: InteractionSlotComponent;
  readonly Options: InteractionSlotComponent<{
    children: (option: { value: Value; label: string }) => ReactNode;
  }>;
}

export interface InteractionChoiceListInputSlot<Value = unknown> {
  readonly Field: InteractionSlotComponent;
  readonly Options: InteractionSlotComponent<{
    children: (option: { value: Value; label: string }) => ReactNode;
  }>;
}

export interface InteractionNumberInputSlot {
  readonly Field: InteractionSlotComponent;
}

export interface InteractionResourceMapInputSlot<
  Resource extends string = string,
> {
  readonly Field: InteractionSlotComponent;
  readonly Resource: InteractionSlotComponent<{ value: Resource }>;
}

export type InteractionFormInputSlot<Value = unknown> =
  | InteractionChoiceInputSlot<Value>
  | InteractionChoiceListInputSlot<Value>
  | InteractionNumberInputSlot
  | InteractionResourceMapInputSlot;

export interface InteractionCardTargetInputSlot<Card extends string = string> {
  readonly Card: InteractionSlotComponent<
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
  readonly Cards: InteractionSlotComponent<{
    children: (card: { id: Card }) => ReactNode;
  }>;
}

export interface InteractionBoardTargetInputSlot<
  Target extends string = string,
> {
  readonly Target: InteractionSlotComponent<
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
}

export type InteractionBoardSpaceTargetInputSlot<
  Space extends string = string,
> = InteractionBoardTargetInputSlot<Space>;

export type InteractionBoardEdgeTargetInputSlot<Edge extends string = string> =
  InteractionBoardTargetInputSlot<Edge>;

export type InteractionBoardVertexTargetInputSlot<
  Vertex extends string = string,
> = InteractionBoardTargetInputSlot<Vertex>;

export type InteractionBoardTileTargetInputSlot<Tile extends string = string> =
  InteractionBoardTargetInputSlot<Tile>;

export interface InteractionSubmitSlot {
  readonly Button: InteractionSlotComponent<
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "disabled" | "type" | "value"
    >
  >;
}

export type TypedPrompt<Contract extends UIContract> = Omit<
  typeof PromptPrimitive,
  "Root" | "Option" | "Options" | "Dialog"
> & {
  Root<Prompt extends PromptKey<Contract>>(
    props: PromptRootProps<Prompt>,
  ): ReactElement | null;
  Option<Option extends PromptOptionKey<Contract>>(
    props: Omit<PromptOptionProps, "value"> & { value: Option },
  ): ReactElement;
  Options(
    props: Omit<PromptOptionsProps, "children"> & {
      children: (
        option: Omit<PromptOptionRenderItem, "id"> & {
          id: PromptOptionKey<Contract>;
        },
      ) => ReactNode;
    },
  ): ReactElement;
  Dialog<Prompt extends PromptKey<Contract>>(
    props: PromptDialogProps<Prompt>,
  ): ReactElement;
};

export type TypedPromptInbox<Contract extends UIContract> = Omit<
  typeof PromptInboxPrimitive,
  "Items"
> & {
  Items(
    props: Omit<PromptInboxItemsProps, "children"> & {
      children: (
        prompt: Omit<InteractionDescriptor, "interactionKey"> & {
          interactionKey: PromptKey<Contract>;
        },
      ) => ReactNode;
    },
  ): ReactElement;
};

type TypedPlayerRosterEntry<Player extends string> = Omit<
  PlayerRosterEntry,
  "playerId"
> & {
  playerId: Player;
};

type TypedPlayerRosterRootProps<Player extends string> = Omit<
  PlayerRosterRootProps,
  "score" | "scoreLabel" | "badges" | "metadata"
> & {
  score?: (playerId: Player) => number | undefined;
  scoreLabel?: string | ((playerId: Player) => string | undefined);
  badges?: (
    playerId: Player,
  ) => ReadonlyArray<PlayerRosterBadge | null | false | undefined>;
  metadata?: (playerId: Player) => Record<string, unknown> | undefined;
};

type TypedPlayerRosterListProps<Player extends string> = Omit<
  PlayerRosterListProps,
  "children"
> & {
  children?: (player: TypedPlayerRosterEntry<Player>) => ReactNode;
};

type TypedPlayerRosterPartProps<Player extends string> = Omit<
  PlayerRosterPartProps,
  "player"
> & {
  player: TypedPlayerRosterEntry<Player>;
};

type TypedPlayerRosterSwitchButtonProps<Player extends string> = Omit<
  PlayerRosterSwitchButtonProps,
  "player"
> & {
  player: TypedPlayerRosterEntry<Player>;
};

export type TypedPlayerRoster<Contract extends UIContract> = Omit<
  PlayerRosterComponents,
  "Root" | "List" | "SwitchButton" | "Name" | "Score" | "Badges"
> & {
  Root(
    props: TypedPlayerRosterRootProps<PlayerKey<Contract>>,
  ): ReactElement | null;
  List(props: TypedPlayerRosterListProps<PlayerKey<Contract>>): ReactElement;
  SwitchButton(
    props: TypedPlayerRosterSwitchButtonProps<PlayerKey<Contract>>,
  ): ReactElement;
  Name(props: TypedPlayerRosterPartProps<PlayerKey<Contract>>): ReactElement;
  Score(
    props: TypedPlayerRosterPartProps<PlayerKey<Contract>>,
  ): ReactElement | null;
  Badges(
    props: TypedPlayerRosterPartProps<PlayerKey<Contract>>,
  ): ReactElement | null;
};

export type TypedPhase<Contract extends UIContract> = Omit<
  typeof PhasePrimitive,
  "Switch"
> & {
  Switch(props: PhaseSwitchProps<PhaseKey<Contract>>): ReactElement | null;
};

export type TypedZone<Contract extends UIContract> = Omit<
  typeof ZonePrimitive,
  | "Root"
  | "Item"
  | "CardAt"
  | "TopCard"
  | "CardAction"
  | "List"
  | "PileRoot"
  | "PileCards"
> & {
  Root<Zone extends ZoneKey<Contract>>(
    props: Omit<ZoneRootProps, "zone"> & { zone: Zone },
  ): ReactElement;
  Item<Card extends CardKey<Contract>>(
    props: Omit<ZoneItemProps, "card"> & { card: Card },
  ): ReactElement;
  CardAction<Card extends CardKey<Contract>>(
    props: Omit<ZoneCardActionProps, "card"> & { card?: Card },
  ): ReactElement;
  CardAt<Zone extends ZoneKey<Contract>>(
    props: Omit<ZoneCardAtProps<Zone>, "zone" | "children"> & {
      zone?: Zone;
      children?:
        | ReactNode
        | ((card: TypedZoneCardRenderItem<Contract>) => ReactNode);
    },
  ): ReactElement | null;
  TopCard<Zone extends ZoneKey<Contract>>(
    props: Omit<ZoneCardAtProps<Zone>, "zone" | "index" | "children"> & {
      zone?: Zone;
      children?:
        | ReactNode
        | ((card: TypedZoneCardRenderItem<Contract>) => ReactNode);
    },
  ): ReactElement | null;
  List(
    props: Omit<ZoneListProps, "children"> & {
      children?:
        | ReactNode
        | ((card: TypedZoneCardRenderItem<Contract>) => ReactNode);
    },
  ): ReactElement;
  PileRoot<Zone extends ZoneKey<Contract>>(
    props: Omit<ZonePileRootProps<Zone>, "zone"> & {
      zone: Zone;
    },
  ): ReactElement;
  PileCards(
    props: Omit<ZonePileCardsProps, "renderCard"> & {
      renderCard: (card: TypedZoneCardRenderItem<Contract>) => ReactNode;
    },
  ): ReactElement | null;
};

export type TypedBoard<Contract extends UIContract> = Omit<
  typeof BoardPrimitive,
  "Target" | "SpaceTarget" | "EdgeTarget" | "VertexTarget" | "HexGrid"
> & {
  Target<Target extends BoardTargetKey<Contract>>(
    props: Omit<BoardTargetProps, "value"> & { value: Target },
  ): ReactElement;
  SpaceTarget<Target extends BoardTargetKey<Contract>>(
    props: Omit<BoardSpaceTargetProps, "value"> & { value: Target },
  ): ReactElement;
  EdgeTarget<Target extends BoardTargetKey<Contract>>(
    props: Omit<BoardEdgeTargetProps, "value"> & { value: Target },
  ): ReactElement;
  VertexTarget<Target extends BoardTargetKey<Contract>>(
    props: Omit<BoardVertexTargetProps, "value"> & { value: Target },
  ): ReactElement;
  HexGrid<
    TBoard extends AnyHexBoardInput,
    TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
  >(
    props: Omit<BoardHexGridProps<TBoard, TSpaceView>, "interactions"> & {
      interactions?:
        | Exclude<BoardHexGridInteractionFilter, object>
        | {
            edge?: ReadonlyArray<InteractionKey<Contract>>;
            vertex?: ReadonlyArray<InteractionKey<Contract>>;
            space?: ReadonlyArray<InteractionKey<Contract>>;
          };
    },
  ): ReactElement;
};

export type TypedGame<
  _Contract extends UIContract,
  View = unknown,
  Player extends string = PlayerKey<_Contract>,
  Phase extends string = PhaseKey<_Contract>,
> = Omit<typeof GamePrimitive, "Root"> & {
  Root(props: GameRootProps<View, Player, Phase>): ReactElement;
  Chrome(
    props: GameChromeProps<View, Player, Phase, InteractionKey<_Contract>>,
  ): ReactElement;
};

export interface DreamboardUI<Contract extends UIContract = RegisteredUI> {
  readonly contract: Contract;
  Root(props: UIRootProps): ReactElement;
  readonly Game: TypedGame<Contract>;
  readonly Interaction: TypedInteraction<Contract>;
  readonly Prompt: TypedPrompt<Contract>;
  readonly PromptInbox: TypedPromptInbox<Contract>;
  readonly PlayerRoster: TypedPlayerRoster<Contract>;
  readonly Dice: DiceComponents;
  readonly Phase: TypedPhase<Contract>;
  readonly Zone: TypedZone<Contract>;
  readonly Board: TypedBoard<Contract>;
}

export function createDreamboardUI<const Contract extends UIContract>(
  contract: Contract,
): DreamboardUI<Contract> {
  return {
    contract,
    Root: UIPrimitive.Root,
    Game: GamePrimitive,
    Interaction: InteractionPrimitive,
    Prompt: PromptPrimitive,
    PromptInbox: PromptInboxPrimitive,
    PlayerRoster: PlayerRosterPrimitive,
    Dice: DicePrimitive,
    Phase: PhasePrimitive,
    Zone: ZonePrimitive,
    Board: BoardPrimitive,
  } as DreamboardUI<Contract>;
}
