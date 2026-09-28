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
import type { RuntimeJson } from "../shared/runtime-json.js";
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
export type BoardDataOf<G, K extends string> = [TableOfGame<G>] extends [never]
  ? ReadonlyData<import("../reducer/model/table.js").RuntimeBoardState>
  : TableOfGame<G> extends { boards: { byId: infer Boards } }
    ? K extends keyof Boards
      ? ReadonlyData<Boards[K]> & { readonly id: K }
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
      ? ReadonlyData<Spaces[S]> & { readonly id: S }
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
  createBoard<K extends IdOf<G, "boardId">>(
    id: K,
    data: BoardDataOf<G, K>,
  ): BoardBase<G, K>;
  routeTarget(target: SelectionTarget<G>, options?: TargetOptions<G>): void;
  routeCardDrop(cardId: IdOf<G, "cardId">, target: DropTarget<G>): void;
  invalidate(): void;
}
export interface NativeEvent {
  preventDefault(): void;
}
export interface FieldEvent {
  readonly currentTarget: {
    readonly value: string;
    readonly valueAsNumber?: number;
  };
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
export interface InputBase<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
> {
  readonly key: N;
  readonly kind: InputKind<G, K, N>;
  readonly game: CoreInstance<G>;
  readonly interaction: InteractionBase<G, K>;
  getDomain(): InputDomain;
  getValue(): InteractionParams<G, K>[N] | undefined;
  setValue(value: Exclude<InteractionParams<G, K>[N], undefined>): void;
  clear(): void;
  getIsReady(): boolean;
  getEligibleTargets(): readonly InputTarget<G, K, N>[];
  getIsEligible(value: InputTarget<G, K, N>): boolean;
  getIsSelected(value: InputTarget<G, K, N>): boolean;
  getSelectHandler(value: InputTarget<G, K, N>): () => void;
  getTargetProps(value: InputTarget<G, K, N>): ActionProps;
  getFieldProps(): {
    value: Exclude<InteractionParams<G, K>[N], null | undefined> | "";
    disabled: boolean;
    onChange(event: FieldEvent): void;
    readonly [key: `data-${string}`]: string | number | boolean | undefined;
  };
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
  getIsAvailable(): boolean;
  getUnavailableReason(): string | null;
  getStep(): InteractionDescriptor["step"] | null;
  getStepIndex(): number | null;
  getIsReady(): boolean;
  getMissingInputs(): readonly InputKey<G, K>[];
  getStatus(): "open" | "submitting" | "submitted";
  submit(): Promise<SubmitResult>;
  cancel(): Promise<SubmitResult>;
  reset(): void;
  activate(): void;
  getSubmitHandler(): (event?: NativeEvent) => void;
  getSubmitProps(): ActionProps;
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
export type ReadonlyData<T> = T extends readonly (infer Item)[]
  ? readonly ReadonlyData<Item>[]
  : T extends object
    ? { readonly [K in keyof T]: ReadonlyData<T[K]> }
    : T;
export type CardDataOf<G, K extends string> = G extends {
  contract: { manifest: { tableSchema: infer Schema extends z.ZodType } };
}
  ? z.output<Schema> extends { cards: infer Cards }
    ? K extends keyof Cards
      ? ReadonlyData<Cards[K]> & { readonly id: K }
      : never
    : never
  : Readonly<Record<string, RuntimeJson>>;
interface CardEntity<G, K extends IdOf<G, "cardId"> = IdOf<G, "cardId">> {
  readonly id: K;
  readonly zone: IdOf<G, "zoneId">;
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
type CardVisibility<G, K extends string> =
  | { readonly hidden: true; readonly view: null }
  | { readonly hidden: false; readonly view: CardDataOf<G, K> };
export type CardBase<
  G,
  K extends IdOf<G, "cardId"> = IdOf<G, "cardId">,
> = CardEntity<G, K> & CardVisibility<G, K>;
export type Card<
  G,
  F extends Features,
  K extends IdOf<G, "cardId"> = IdOf<G, "cardId">,
> = Omit<CardEntity<G, K>, "getInteractions" | "game"> &
  CardVisibility<G, K> &
  Hook<F, "card"> & {
    readonly game: GameInstance<G, F>;
    getInteractions(): readonly AnyInteraction<G, F>[];
  };
export interface ZoneBase<G, K extends IdOf<G, "zoneId"> = IdOf<G, "zoneId">> {
  readonly id: K;
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
    getCard<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K>;
    findCard<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K> | undefined;
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
    get<K extends IdOf<G, "zoneId">>(id: K): Zone<G, F, K>;
    find<K extends IdOf<G, "zoneId">>(id: K): Zone<G, F, K> | undefined;
    getAll(): readonly Zone<G, F>[];
  };
  readonly cards: {
    get<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K>;
    find<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K> | undefined;
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
  readonly coverage?: Readonly<Record<InteractionKey<G>, unknown>>;
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
  inspect(): ReadModel<G>;
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
  | keyof ReadModel<G>
  | "store"
  | "getSnapshot"
  | "getOptions"
  | "setOptions"
  | "inspect"
> &
  ReadModel<G, F> &
  RootHooks<G, F> & {
    readonly store: Pick<Store<GameSnapshot<G, F>>, "get" | "subscribe">;
    getSnapshot(): GameSnapshot<G, F>;
    inspect(): GameSnapshot<G, F>;
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
