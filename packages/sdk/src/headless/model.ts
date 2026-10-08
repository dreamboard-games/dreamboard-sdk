import {
  runtimeFeatures,
  type RuntimeFeatureContext,
} from "./runtime-features.js";
import type { InputControl, InputTargetOption } from "./input-control.js";
export type { InputControl, InputTargetOption } from "./input-control.js";
import type { SelectionTarget, DropTarget, TargetOptions } from "./targets.js";
export type * from "./targets.js";
import type { z } from "zod";
import type { Store } from "@tanstack/store";
import type {
  PhaseNamesOfDefinition,
  InteractionIdOfDefinitionPhase,
  ClientParamsOfInteractionOfDefinition,
  ViewOfDefinition,
  InputCollectorOfDefinition,
} from "../reducer/model/definition.js";
import type {
  InputDomain,
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginPlayerSummary,
} from "../shared/protocol/frame.js";
import type { GameEvent } from "../shared/domain/results.js";
import type {
  HiddenCardId,
  ViewCard,
  ViewCardOfTable,
} from "../shared/domain/cards.js";
export type { HiddenCardId } from "../shared/domain/cards.js";
import type {
  RuntimeJson,
  ReadonlyRuntimeData,
} from "../shared/runtime-json.js";
import type {
  GameSource,
  SourceState,
  SourceRequest,
  SourceSnapshot,
  SubmitResult,
} from "./sources/types.js";

export type PhaseName<G> = [PhaseNamesOfDefinition<G>] extends [never]
  ? string
  : PhaseNamesOfDefinition<G>;
export type InteractionKey<G> = unknown extends G
  ? string
  : [PhaseNamesOfDefinition<G>] extends [never]
    ? string
    : {
        [
          P in PhaseNamesOfDefinition<G>
        ]: `${P}.${InteractionIdOfDefinitionPhase<G, P>}`;
      }[PhaseNamesOfDefinition<G>];
type InteractionIdentity<G, K> = {
  [P in PhaseNamesOfDefinition<G>]: {
    [I in InteractionIdOfDefinitionPhase<G, P>]: `${P}.${I}` extends K
      ? { phase: P; id: I }
      : never;
  }[InteractionIdOfDefinitionPhase<G, P>];
}[PhaseNamesOfDefinition<G>];
type RawInteractionParams<G, K extends InteractionKey<G>> = unknown extends G
  ? Record<string, RuntimeJson>
  : [PhaseNamesOfDefinition<G>] extends [never]
    ? Record<string, RuntimeJson>
    : InteractionIdentity<G, K> extends infer Identity
      ? Identity extends {
          phase: infer P extends PhaseNamesOfDefinition<G>;
          id: infer I;
        }
        ? I extends InteractionIdOfDefinitionPhase<G, P>
          ? ClientParamsOfInteractionOfDefinition<G, P, I>
          : never
        : never
      : never;
type UnionKeys<T> = T extends unknown ? keyof T : never;
type UnionValue<T, Key> = T extends unknown
  ? Key extends keyof T
    ? T[Key]
    : never
  : never;
export type InteractionParams<G, K extends InteractionKey<G>> = {
  [N in UnionKeys<RawInteractionParams<G, K>>]: UnionValue<
    RawInteractionParams<G, K>,
    N
  >;
};
type CollectorOf<G, K, N extends string> =
  InteractionIdentity<G, K> extends infer Identity
    ? Identity extends {
        phase: infer P extends PhaseNamesOfDefinition<G>;
        id: infer I;
      }
      ? I extends InteractionIdOfDefinitionPhase<G, P>
        ? InputCollectorOfDefinition<G, P, I, N>
        : never
      : never
    : never;
export type InputKind<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> = [CollectorOf<G, K, N>] extends [never]
  ? InteractionInputDescriptor["kind"]
  : CollectorOf<G, K, N> extends {
        readonly kind: infer Kind extends InteractionInputDescriptor["kind"];
      }
    ? Kind
    : InteractionInputDescriptor["kind"];
type SelectionValue<Collector, Value> = Collector extends
  | { readonly selection: { readonly mode: "many" } }
  | { readonly domain: (...args: never[]) => { readonly type: "choiceList" } }
  ? Value extends readonly (infer Item)[]
    ? Item
    : never
  : Value;
export type InputTarget<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> = [CollectorOf<G, K, N>] extends [never]
  ? Exclude<InteractionParams<G, K>[N], undefined>
  : SelectionValue<
      CollectorOf<G, K, N>,
      Exclude<InteractionParams<G, K>[N], undefined>
    >;
export type AnyInput<G, F extends Features, K extends InteractionKey<G>> = {
  [N in InputKey<G, K>]: Input<G, F, K, N>;
}[InputKey<G, K>];
export type AnyInteraction<G, F extends Features = Record<never, never>> = {
  [K in InteractionKey<G>]: Interaction<G, F, K>;
}[InteractionKey<G>];

export type InputKey<G, K extends InteractionKey<G>> = keyof InteractionParams<
  G,
  K
> &
  string;
export type IdOf<G, K extends string> = G extends {
  contract: { manifest: { ids: Record<K, infer Schema extends z.ZodType> } };
}
  ? z.output<Schema> & string
  : string;
export type ViewOf<G> = [ViewOfDefinition<G>] extends [never]
  ? unknown
  : ViewOfDefinition<G>;
export type Drafts<G> = Readonly<
  Partial<{
    [K in InteractionKey<G>]: Readonly<Partial<InteractionParams<G, K>>>;
  }>
>;
export interface LocalState<G> {
  readonly drafts: Drafts<G>;
  readonly activeInteraction: InteractionKey<G> | null;
}
export interface Feature {
  readonly root?: object;
  readonly interaction?: object;
  readonly input?: object;
  readonly zone?: object;
  readonly card?: object;
  readonly board?: object;
  readonly dispose?: () => void;
}
export type Features = Readonly<Record<string, Feature>>;
type Intersection<U> = (
  U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
  ? I
  : never;
export type Hook<
  F extends Features,
  H extends keyof Feature,
> = keyof F extends never
  ? Record<never, never>
  : Intersection<
      {
        [K in keyof F]: F[K] extends Record<H, infer A>
          ? A
          : Record<never, never>;
      }[keyof F]
    >;
export type TableOfGame<G> = G extends {
  contract: { manifest: { tableSchema: infer Schema extends z.ZodType } };
}
  ? z.output<Schema>
  : never;
/** Actual host identity admitted for one zone's attachment. */
export type ZoneHostId<G, K extends IdOf<G, "zoneId"> = IdOf<G, "zoneId">> = [
  TableOfGame<G>,
] extends [never]
  ? string
  : TableOfGame<G> extends { zones: infer Zones }
    ? K extends keyof Zones
      ? Extract<keyof Zones[K], string>
      : never
    : never;

type SeatCell<Cell> = Cell extends {
  readonly id: string;
  readonly tileId: string;
}
  ? Omit<Cell, "id" | "tileId"> & {
      readonly id: import("../shared/domain/seat-reference.js").SeatSpaceRef;
      readonly tileRef: import("../shared/domain/seat-reference.js").SeatTileRef;
    }
  : Cell;
type SeatRelation<Relation> = Relation extends {
  readonly fromSpaceId: string;
  readonly toSpaceId: string;
}
  ? Omit<Relation, "fromSpaceId" | "toSpaceId"> & {
      readonly fromSpaceId: import("../shared/domain/seat-reference.js").SeatSpaceRef;
      readonly toSpaceId: import("../shared/domain/seat-reference.js").SeatSpaceRef;
    }
  : Relation;
type SeatElement<Element> = Element extends {
  readonly spaceIds: readonly string[];
}
  ? Omit<Element, "spaceIds"> & {
      readonly spaceIds: readonly import("../shared/domain/seat-reference.js").SeatSpaceRef[];
    }
  : Element;
type TileDefinitionsOf<G> = G extends {
  contract: { manifest: { tileDefinitions: infer Definitions } };
}
  ? Definitions
  : never;
type VisibleTileData<G, Runtime> = Runtime extends {
  readonly tileTypeId: infer Type extends string;
  readonly properties: infer Properties;
}
  ? Type extends keyof TileDefinitionsOf<G>
    ? TileDefinitionsOf<G>[Type] extends { readonly fields: infer Fields }
      ? Omit<
          Extract<
            import("../shared/seat-topology-schema.js").ProjectedTile,
            { disclosure: "visible" }
          >,
          "tileTypeId" | "properties" | "fields"
        > & {
          readonly tileTypeId: Type;
          readonly properties: ReadonlyData<Properties>;
          readonly fields: ReadonlyData<Fields>;
        }
      : never
    : never
  : never;
/** The seat DTO is canonical; known games refine only disclosed authored face data. */
export type TileDataOf<G> = [TableOfGame<G>] extends [never]
  ? import("../shared/seat-topology-schema.js").ProjectedTile
  : | Extract<
        import("../shared/seat-topology-schema.js").ProjectedTile,
        { disclosure: "concealed" }
      >
    | (TableOfGame<G> extends { readonly tiles: infer Tiles }
        ? VisibleTileData<G, Tiles[keyof Tiles]>
        : never);
export type PlacedTileDataOf<G> = TileDataOf<G> & {
  readonly placement: Extract<
    import("../shared/seat-topology-schema.js").SeatBoardTopology,
    { layout: "hex" | "square" }
  >["tiles"][number]["placement"];
};
type SeatTopology<Topology, G> = Topology extends {
  readonly layout: "hex" | "square";
  readonly spaces: infer Spaces;
  readonly relations: readonly (infer Relation)[];
  readonly edges: readonly (infer Edge)[];
  readonly vertices: readonly (infer Vertex)[];
}
  ? Omit<Topology, "spaces" | "relations" | "edges" | "vertices"> & {
      readonly spaces: Readonly<
        Record<
          import("../shared/domain/seat-reference.js").SeatSpaceRef,
          SeatCell<Spaces[keyof Spaces]>
        >
      >;
      readonly tiles: readonly PlacedTileDataOf<G>[];
      readonly relations: readonly SeatRelation<Relation>[];
      readonly edges: readonly SeatElement<Edge>[];
      readonly vertices: readonly SeatElement<Vertex>[];
    }
  : Topology;

export type BoardDataOf<G, K extends string> = [TableOfGame<G>] extends [never]
  ? import("../shared/seat-topology-schema.js").SeatBoardTopology
  : G extends {
        contract: {
          manifest: infer Definitions extends
            import("../shared/domain/topology-definitions.js").TopologyDefinitions;
        };
      }
    ? TableOfGame<G> extends { boards: infer Boards }
      ? K extends Extract<keyof Boards, string>
        ? SeatTopology<
            import("../reducer/model/topology.js").BoardTopologyOf<
              TableOfGame<G>,
              Definitions,
              K
            >,
            G
          >
        : never
      : never
    : never;
export type BoardSpaceId<G, B extends IdOf<G, "boardId">> = B extends unknown
  ? BoardDataOf<G, B> extends { readonly spaces: infer Spaces }
    ? keyof Spaces & string
    : never
  : never;
export type BoardSpaceData<
  G,
  B extends IdOf<G, "boardId">,
  S extends BoardSpaceId<G, B>,
> = B extends unknown
  ? BoardDataOf<G, B> extends { readonly spaces: infer Spaces }
    ? S extends keyof Spaces
      ? Spaces[S] & { readonly id: S }
      : never
    : never
  : never;
export interface BoardSpace<
  G,
  F extends Features = Record<never, never>,
  B extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
  S extends BoardSpaceId<G, B> = BoardSpaceId<G, B>,
> {
  readonly id: S;
  readonly data: BoardSpaceData<G, B, S>;
  readonly board: Board<G, F, B>;
  getIsEligible(): boolean;
  getIsSelectable(): boolean;
  getIsSelected(): boolean;
  getSelectHandler(options?: TargetOptions<G>): () => void;
  getTargetProps(options?: TargetOptions<G>): ActionProps;
}
export interface BoardSpaceCollection<
  G,
  F extends Features = Record<never, never>,
  B extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
> {
  get<S extends BoardSpaceId<G, B>>(id: S): BoardSpace<G, F, B, S>;
  find<S extends BoardSpaceId<G, B>>(id: S): BoardSpace<G, F, B, S> | undefined;
  getAll(): readonly BoardSpace<G, F, B>[];
}
type BoardHooks<G, F extends Features, B extends IdOf<G, "boardId">> = {
  [K in keyof Hook<F, "board">]: Hook<
    F,
    "board"
  >[K] extends BoardSpaceCollection<G>
    ? BoardSpaceCollection<G, F, B>
    : Hook<F, "board">[K];
};
export interface BoardBase<
  G,
  K extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
> {
  readonly id: K;
  readonly game: CoreInstance<G>;
  readonly data: BoardDataOf<G, K>;
}
export type Board<
  G,
  F extends Features,
  K extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
> = BoardBase<G, K> &
  BoardHooks<G, F, K> & { readonly game: GameInstance<G, F> };
export interface BoardCollection<G, F extends Features = Record<never, never>> {
  get<K extends IdOf<G, "boardId">>(id: K): Board<G, F, K>;
  find<K extends IdOf<G, "boardId">>(id: K): Board<G, F, K> | undefined;
  getAll(): readonly Board<G, F>[];
}
type RootHooks<G, F extends Features> = {
  [K in keyof Hook<F, "root">]: Hook<F, "root">[K] extends BoardCollection<G>
    ? BoardCollection<G, F>
    : Hook<F, "root">[K];
};
export interface FeatureContext<G> {
  readonly [runtimeFeatures]: RuntimeFeatureContext;
  createBoard<K extends IdOf<G, "boardId">>(
    data: BoardDataOf<G, K> & { readonly id: K },
  ): BoardBase<G, K>;
  routeTarget(target: SelectionTarget<G>, options?: TargetOptions<G>): void;
  routeCardDrop(cardId: SeatCardId<G>, target: DropTarget<G>): void;
  invalidate(): void;
}
export interface NativeEvent {
  preventDefault(): void;
}
export type ActionProps = {
  readonly onClick: (event?: NativeEvent) => void;
  readonly disabled: boolean;
  readonly type: "button";
  readonly [key: `data-${string}`]: string | number | boolean | undefined;
};
export interface Player<
  G,
  K extends IdOf<G, "playerId"> = IdOf<G, "playerId">,
> {
  readonly id: K;
  readonly index: number;
  readonly name: string;
  readonly color?: string;
  readonly isMe: boolean;
  readonly game: CoreInstance<G>;
}
export interface Phase<G> {
  readonly current: PhaseName<G> | null;
  is(name: PhaseName<G>): boolean;
  switch<R>(routes: { [P in PhaseName<G>]: () => R }): R | null;
}
export interface Turn<G> {
  readonly activePlayerIds: readonly IdOf<G, "playerId">[];
  readonly currentPlayerId: IdOf<G, "playerId"> | null;
  readonly order: readonly IdOf<G, "playerId">[];
  readonly isMine: boolean;
}
type DomainOfCollector<Collector> = Collector extends {
  readonly domain: (...args: never[]) => infer Domain extends InputDomain;
}
  ? Domain
  : InputDomain;
export type InputDomainOf<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> = [CollectorOf<G, K, N>] extends [never]
  ? InputDomain
  : DomainOfCollector<CollectorOf<G, K, N>>;
// Distribute over collector unions when an interaction key is not yet narrowed.
type SelectionModeOfCollector<Collector> = Collector extends
  | { readonly selection: { readonly mode: "many" } }
  | { readonly domain: (...args: never[]) => { readonly type: "choiceList" } }
  ? "many"
  : "single";
type InputSelectionMode<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> = [CollectorOf<G, K, N>] extends [never]
  ? "single" | "many"
  : SelectionModeOfCollector<CollectorOf<G, K, N>>;

export interface InputBase<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> {
  readonly key: N;
  readonly kind: InputKind<G, K, N>;
  readonly game: CoreInstance<G>;
  readonly interaction: InteractionBase<G, K>;
  readonly domainType: InputDomainOf<G, K, N>["type"];
  readonly selectionMode: InputSelectionMode<G, K, N>;
  getDomain(): InputDomainOf<G, K, N>;
  getControl(): InputControl;
  getTargetOptions(): readonly InputTargetOption<InputTarget<G, K, N>>[];
  getValue(): InteractionParams<G, K>[N] | undefined;
  readonly setValue: (
    value: Exclude<InteractionParams<G, K>[N], undefined>,
  ) => void;
  clear(): void;
  getIsReady(): boolean;
  getEligibleTargets(): readonly InputTarget<G, K, N>[];
  readonly getIsEligible: (value: InputTarget<G, K, N>) => boolean;
  readonly getIsSelected: (value: InputTarget<G, K, N>) => boolean;
  readonly getSelectHandler: (value: InputTarget<G, K, N>) => () => void;
  readonly getTargetProps: (value: InputTarget<G, K, N>) => ActionProps;
}
export type Input<
  G,
  F extends Features,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> = Omit<InputBase<G, K, N>, "interaction" | "game"> &
  Hook<F, "input"> & {
    readonly game: GameInstance<G, F>;
    readonly interaction: Interaction<G, F, K>;
  };
export interface InteractionBase<G, K extends InteractionKey<G>> {
  readonly key: K;
  readonly id: [InteractionIdentity<G, K>] extends [never]
    ? string
    : InteractionIdentity<G, K>["id"];
  readonly phase: [InteractionIdentity<G, K>] extends [never]
    ? PhaseName<G>
    : InteractionIdentity<G, K>["phase"];
  readonly label: string;
  readonly help?: string;
  readonly kind: "inputs" | "steps";
  readonly game: CoreInstance<G>;
  getAvailability(): InteractionDescriptor["availability"];
  getIsAvailable(params?: InteractionParams<G, K>): boolean;
  getUnavailableReason(): string | null;
  getStep(): InteractionDescriptor["step"] | null;
  getStepIndex(): number | null;
  getIsReady(params?: InteractionParams<G, K>): boolean;
  getMissingInputs(): readonly InputKey<G, K>[];
  getStatus(): "open" | "submitting" | "submitted";
  submit(params?: InteractionParams<G, K>): Promise<SubmitResult>;
  cancel(): Promise<SubmitResult>;
  reset(): void;
  activate(): void;
  getSubmitHandler(
    params?: InteractionParams<G, K>,
  ): (event?: NativeEvent) => void;
  getSubmitProps(params?: InteractionParams<G, K>): ActionProps;
}
export type Interaction<
  G,
  F extends Features,
  K extends InteractionKey<G>,
> = InteractionBase<G, K> &
  Hook<F, "interaction"> & {
    readonly game: GameInstance<G, F>;
    getInput<N extends InputKey<G, K>>(key: N): Input<G, F, K, N>;
    findInput<N extends InputKey<G, K>>(key: N): Input<G, F, K, N> | undefined;
    getInputs(): readonly AnyInput<G, F, K>[];
  };
export type ReadonlyData<T> = ReadonlyRuntimeData<T>;
export type CardDataOf<G, K extends string> = [TableOfGame<G>] extends [never]
  ? ReadonlyData<ViewCard<K>>
  : TableOfGame<G> extends {
        cards: Record<
          string,
          { cardType: string; properties: Record<string, unknown> }
        >;
      }
    ? K extends keyof TableOfGame<G>["cards"]
      ? ReadonlyData<ViewCardOfTable<TableOfGame<G>, K>>
      : never
    : never;

interface CardEntity<G> {
  readonly zone: IdOf<G, "zoneId">;
  readonly hostId: ZoneHostId<G>;
  readonly index: number;

  readonly game: CoreInstance<G>;
  getInteractions(): readonly AnyInteraction<G>[];
  getIsEligible(): boolean;
  getIsSelected(): boolean;
  getCanSelect(options?: TargetOptions<G>): boolean;
  select(options?: TargetOptions<G>): void;
  getSelectHandler(options?: TargetOptions<G>): () => void;
  getProps(options?: TargetOptions<G>): ActionProps;
}
/** The id a seat knows a card by. */
export type SeatCardId<G> = IdOf<G, "cardId"> | HiddenCardId;
type HiddenCard<K extends HiddenCardId> = {
  readonly hidden: true;
  readonly id: K;
  readonly view: null;
  /** The URL of the card's back image, when it has one. */
  readonly backImage: string | null;
};
/** A hidden id is hidden; any other id is visible, or either when it is `string`. */
type CardVisibility<G, K extends string> = K extends HiddenCardId
  ? HiddenCard<K>
  : | (HiddenCardId extends K ? HiddenCard<HiddenCardId> : never)
    | {
        readonly hidden: false;
        readonly id: K;
        readonly view: CardDataOf<G, K>;
      };
export type CardBase<
  G,
  K extends SeatCardId<G> = SeatCardId<G>,
> = CardEntity<G> & CardVisibility<G, K>;
export type Card<
  G,
  F extends Features,
  K extends SeatCardId<G> = SeatCardId<G>,
> = Omit<CardEntity<G>, "getInteractions" | "game"> &
  CardVisibility<G, K> &
  Hook<F, "card"> & {
    readonly game: GameInstance<G, F>;
    getInteractions(): readonly AnyInteraction<G, F>[];
  };
/** One tile presentation admitted for this seat; its reference expires with its frame. */
export interface Tile<G, F extends Features = Record<never, never>> {
  readonly ref: import("../shared/domain/seat-reference.js").SeatTileRef;
  readonly data: TileDataOf<G>;
  readonly zone: IdOf<G, "zoneId">;
  readonly hostId: ZoneHostId<G>;
  readonly index: number;
  readonly game: GameInstance<G, F>;
  getInteractions(): readonly AnyInteraction<G, F>[];
  getIsEligible(): boolean;
  getIsSelected(): boolean;
  getCanSelect(options?: TargetOptions<G>): boolean;
  select(options?: TargetOptions<G>): void;
  getSelectHandler(options?: TargetOptions<G>): () => void;
  getTargetProps(options?: TargetOptions<G>): ActionProps;
}
export interface ZoneBase<G, K extends IdOf<G, "zoneId"> = IdOf<G, "zoneId">> {
  readonly id: K;
  readonly hostId: ZoneHostId<G, K>;
  /** Number of projected cards and tiles; omitted inventory contributes nothing. */
  readonly count: number;
  readonly game: CoreInstance<G>;
  getIsEmpty(): boolean;
}
export type Zone<
  G,
  F extends Features,
  K extends IdOf<G, "zoneId"> = IdOf<G, "zoneId">,
> = ZoneBase<G, K> &
  Hook<F, "zone"> & {
    readonly game: GameInstance<G, F>;
    getCards(options?: {
      sort?: (a: Card<G, F>, b: Card<G, F>) => number;
    }): readonly Card<G, F>[];
    getTiles(): readonly Tile<G, F>[];
    getTile(
      ref: import("../shared/domain/seat-reference.js").SeatTileRef,
    ): Tile<G, F>;
    findTile(
      ref: import("../shared/domain/seat-reference.js").SeatTileRef,
    ): Tile<G, F> | undefined;
    getCard<K extends SeatCardId<G>>(id: K): Card<G, F, K>;
    findCard<K extends SeatCardId<G>>(id: K): Card<G, F, K> | undefined;
  };
export interface ReadModel<G, F extends Features = Record<never, never>> {
  readonly snapshot: SourceSnapshot | null;
  readonly view: ViewOf<G> | null;
  readonly version: number | null;
  readonly connection: SourceState["connection"];
  readonly failure: SourceState["failure"];
  readonly request: SourceState["request"];
  readonly state: LocalState<G>;
  readonly phase: Phase<G>;
  readonly turn: Turn<G>;
  readonly me: {
    readonly id: IdOf<G, "playerId">;
    readonly player: Player<G>;
    getCanAct(): boolean;
  } | null;
  readonly players: {
    get<K extends IdOf<G, "playerId">>(id: K): Player<G, K>;
    find<K extends IdOf<G, "playerId">>(id: K): Player<G, K> | undefined;
    getAll(): readonly Player<G>[];
    next(id: IdOf<G, "playerId">): Player<G>;
    readonly order: readonly IdOf<G, "playerId">[];
  };
  readonly interactions: {
    get<K extends InteractionKey<G>>(key: K): Interaction<G, F, K>;
    find<K extends InteractionKey<G>>(key: K): Interaction<G, F, K> | undefined;
    list(): readonly AnyInteraction<G, F>[];
    listAvailable(): readonly AnyInteraction<G, F>[];
  };
  readonly inputs: {
    get<K extends InteractionKey<G>, N extends InputKey<G, K>>(
      interaction: K,
      input: N,
    ): Input<G, F, K, N>;
    find<K extends InteractionKey<G>, N extends InputKey<G, K>>(
      interaction: K,
      input: N,
    ): Input<G, F, K, N> | undefined;
  };
  readonly zones: {
    get<K extends IdOf<G, "zoneId">>(
      id: K,
      hostId: ZoneHostId<G, NoInfer<K>>,
    ): Zone<G, F, K>;
    find<K extends IdOf<G, "zoneId">>(
      id: K,
      hostId: ZoneHostId<G, NoInfer<K>>,
    ): Zone<G, F, K> | undefined;
    getAll(): readonly Zone<G, F>[];
  };
  readonly cards: {
    get<K extends SeatCardId<G>>(id: K): Card<G, F, K>;
    find<K extends SeatCardId<G>>(id: K): Card<G, F, K> | undefined;
  };
  readonly events: { readonly recent: readonly GameEvent[] };
}
export interface InstanceOptions<G, S extends GameSource = GameSource> {
  readonly source: S;
  readonly initialState?: Partial<LocalState<G>>;
  readonly state?: Partial<LocalState<G>>;
  readonly onDraftsChange?: (drafts: Drafts<G>) => void;
  readonly onActiveInteractionChange?: (key: InteractionKey<G> | null) => void;
  readonly onError?: (error: unknown) => void;
  readonly debug?: boolean;
}
export type CoreInstance<G> = ReadModel<G> & {
  readonly store: Pick<Store<ReadModel<G>>, "get" | "subscribe">;
  getSnapshot(): ReadModel<G>;
  getOptions(): InstanceOptions<G>;
  setOptions(options: InstanceOptions<G>): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
  assertCoverage(): void;
};
export type GameSnapshot<
  G,
  F extends Features = Record<never, never>,
> = ReadModel<G, F> & RootHooks<G, F>;
export type GameInstance<
  G,
  F extends Features = Record<never, never>,
  S extends GameSource = GameSource,
> = Omit<
  CoreInstance<G>,
  keyof ReadModel<G> | "store" | "getSnapshot" | "getOptions" | "setOptions"
> &
  ReadModel<G, F> &
  RootHooks<G, F> & {
    readonly store: Pick<Store<GameSnapshot<G, F>>, "get" | "subscribe">;
    getSnapshot(): GameSnapshot<G, F>;
    getOptions(): InstanceOptions<G, S>;
    setOptions(options: InstanceOptions<G, S>): void;
  } & (S extends { apply(action: infer A): infer R }
    ? { apply(action: A): R }
    : Record<never, never>) &
  (S extends { explore(...args: infer A): infer R }
    ? { explore(...args: A): R }
    : Record<never, never>);
export type {
  GameSource,
  SourceState,
  SourceRequest,
  SourceSnapshot,
  SubmitResult,
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginPlayerSummary,
};
