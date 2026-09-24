import type { z } from "zod";
import type { Store } from "@tanstack/store";
import type {
  PhaseNamesOfDefinition,
  InteractionIdOfDefinitionPhase,
  ClientParamsOfInteractionOfDefinition,
  ViewOfDefinition,
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
        [P in PhaseNamesOfDefinition<G>]: `${P}.${InteractionIdOfDefinitionPhase<G, P>}`;
      }[PhaseNamesOfDefinition<G>];
export type InteractionParams<
  G,
  K extends InteractionKey<G>,
> = unknown extends G
  ? Record<string, RuntimeJson>
  : K extends `${infer P}.${infer I}`
    ? P extends PhaseNamesOfDefinition<G>
      ? I extends InteractionIdOfDefinitionPhase<G, P>
        ? ClientParamsOfInteractionOfDefinition<G, P, I>
        : never
      : Record<string, RuntimeJson>
    : Record<string, RuntimeJson>;
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
export interface BoardBase<
  G,
  K extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
> {
  readonly id: K;
  readonly game: CoreInstance<G>;
  readonly data: Readonly<object>;
}
export type Board<
  G,
  F extends Features,
  K extends IdOf<G, "boardId"> = IdOf<G, "boardId">,
> = BoardBase<G, K> & Hook<F, "board"> & { readonly game: GameInstance<G, F> };
export interface BoardCollection<G, F extends Features = Record<never, never>> {
  get<K extends IdOf<G, "boardId">>(id: K): Board<G, F, K> | undefined;
  getAll(): readonly Board<G, F>[];
}
type RootHooks<G, F extends Features> = {
  [K in keyof Hook<F, "root">]: Hook<F, "root">[K] extends BoardCollection<G>
    ? BoardCollection<G, F>
    : Hook<F, "root">[K];
};
export interface FeatureContext<G> {
  createBoard<K extends IdOf<G, "boardId">, Data extends object>(
    id: K,
    data: Data,
  ): BoardBase<G, K> & { readonly data: Readonly<Data> };
  routeTarget(
    kind: "card" | "space" | "edge" | "vertex" | "tile",
    id: string,
    options?: { interaction?: InteractionKey<G>; boardId?: IdOf<G, "boardId"> },
  ): void;
  routeCardDrop(
    cardId: IdOf<G, "cardId">,
    target: {
      kind: "space" | "edge" | "vertex" | "tile";
      id: string;
      boardId?: IdOf<G, "boardId">;
      interaction?: InteractionKey<G>;
    },
  ): void;
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
export interface Player<G> {
  readonly id: IdOf<G, "playerId">;
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
  readonly kind: string;
  readonly game: CoreInstance<G>;
  readonly interaction: InteractionBase<G, K>;
  getDomain(): InputDomain;
  getValue(): InteractionParams<G, K>[N] | undefined;
  setValue(value: Exclude<InteractionParams<G, K>[N], undefined>): void;
  clear(): void;
  getIsReady(): boolean;
  getEligibleTargets(): readonly RuntimeJson[];
  getIsEligible(value: RuntimeJson): boolean;
  getIsSelected(value: RuntimeJson): boolean;
  getSelectHandler(value: RuntimeJson): () => void;
  getTargetProps(value: RuntimeJson): ActionProps;
  getFieldProps(): {
    value: InteractionParams<G, K>[N] | "";
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
  readonly id: string;
  readonly phase: PhaseName<G>;
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
  getMissingInputs(): readonly string[];
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
    getInput<N extends InputKey<G, K>>(key: N): Input<G, F, K, N> | undefined;
    getInputs(): readonly Input<G, F, K, InputKey<G, K>>[];
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
      ? ReadonlyData<Cards[K]>
      : never
    : never
  : Readonly<Record<string, RuntimeJson>>;
export interface CardBase<G, K extends IdOf<G, "cardId"> = IdOf<G, "cardId">> {
  readonly id: K;
  readonly zone: IdOf<G, "zoneId">;
  readonly index: number;
  readonly view: CardDataOf<G, K> | null;
  readonly hidden: boolean;
  readonly game: CoreInstance<G>;
  getInteractions(): readonly InteractionBase<G, InteractionKey<G>>[];
  getIsEligible(): boolean;
  getIsSelected(): boolean;
  getCanSelect(): boolean;
  select(options?: { interaction?: InteractionKey<G> }): void;
  getSelectHandler(options?: { interaction?: InteractionKey<G> }): () => void;
  getProps(options?: { interaction?: InteractionKey<G> }): ActionProps;
}
export type Card<
  G,
  F extends Features,
  K extends IdOf<G, "cardId"> = IdOf<G, "cardId">,
> = Omit<CardBase<G, K>, "getInteractions" | "game"> &
  Hook<F, "card"> & {
    readonly game: GameInstance<G, F>;
    getInteractions(): readonly Interaction<G, F, InteractionKey<G>>[];
  };
export interface ZoneBase<G> {
  readonly id: IdOf<G, "zoneId">;
  readonly count: number;
  readonly game: CoreInstance<G>;
  getIsEmpty(): boolean;
}
export type Zone<G, F extends Features> = ZoneBase<G> &
  Hook<F, "zone"> & {
    readonly game: GameInstance<G, F>;
    getCards(options?: {
      sort?: (a: Card<G, F>, b: Card<G, F>) => number;
    }): readonly Card<G, F>[];
    getCard<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K> | undefined;
  };
export interface ReadModel<G, F extends Features = Record<never, never>> {
  readonly snapshot: SourceSnapshot | null;
  readonly view: ViewOf<G> | null;
  readonly version: number | null;
  readonly connection: SourceState["connection"];
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
    get(id: IdOf<G, "playerId">): Player<G> | undefined;
    getAll(): readonly Player<G>[];
    next(id: IdOf<G, "playerId">): Player<G> | undefined;
    readonly order: readonly IdOf<G, "playerId">[];
  };
  readonly interactions: {
    get<K extends InteractionKey<G>>(key: K): Interaction<G, F, K> | undefined;
    list(): readonly Interaction<G, F, InteractionKey<G>>[];
    listAvailable(): readonly Interaction<G, F, InteractionKey<G>>[];
  };
  readonly inputs: {
    get<K extends InteractionKey<G>, N extends InputKey<G, K>>(
      interaction: K,
      input: N,
    ): Input<G, F, K, N> | undefined;
  };
  readonly zones: {
    get(id: IdOf<G, "zoneId">): Zone<G, F> | undefined;
    getAll(): readonly Zone<G, F>[];
  };
  readonly cards: {
    get<K extends IdOf<G, "cardId">>(id: K): Card<G, F, K> | undefined;
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
  SourceSnapshot,
  SubmitResult,
  InteractionDescriptor,
  InteractionInputDescriptor,
  PluginPlayerSummary,
};
