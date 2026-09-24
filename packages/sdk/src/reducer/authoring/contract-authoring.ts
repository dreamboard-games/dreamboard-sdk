import type { z } from "zod";
import type {
  CardIdOfManifest,
  InputCollector,
  InteractionMap,
  InteractionRule,
  InteractionSpec,
  PhaseDefinition,
  PhaseMapOf,
  PhaseNameOfContract,
  PhaseSchemasOfContract,
  OptionsOfContract,
  PlayerViewDefinition,
  PlayerIdOfState,
  SchemaLike,
  SharedViewDefinition,
  StaticViewDefinition,
  TableOfManifest,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledSpaceIdOfTable,
  TiledVertexIdOfTable,
  ViewMapOf,
} from "../model";
import type { ScopedPhaseState } from "../model/spec/runtime-args";
import type {
  InputFieldRef,
  PlayerBoardSpaceTarget,
  PlayerSpaceInputSchema,
} from "../inputs";
import type { TargetPredicate } from "../inputs/targetRule";
import type { TableQueriesOfState } from "../model/queries";
import type { ReducerTransaction } from "../transaction";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  formInput,
  rngInput,
} from "../inputs";
import type {
  AnyReducerGameContract,
  ContractErrorCode,
  ContractManifest,
  ContractState,
} from "./types";
import { defineGameDefinition } from "./game";
import { defineInteraction, defineInteractionRule } from "./interaction";
import { definePhase } from "./phase";
import {
  defineEmptyView,
  definePlayerView,
  defineSharedView,
  defineStaticView,
} from "./views";

export type ContractWithPhases = AnyReducerGameContract & {
  readonly phases: Record<string, SchemaLike<object>>;
};

type BoundState<Contract extends ContractWithPhases> = ContractState<Contract>;

type BoundManifest<Contract extends ContractWithPhases> =
  ContractManifest<Contract>;

type BoundTable<Contract extends ContractWithPhases> = TableOfManifest<
  BoundManifest<Contract>
>;

type BoundPhaseState<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = ScopedPhaseState<BoundState<Contract>, z.infer<PhaseStateSchema>>;

type BoundFormInputs<Contract extends ContractWithPhases> = ReturnType<
  typeof formInput.forState<BoundState<Contract>>
>;

/** Board element collector options: the board and the predicates that filter it. */
type BoundBoardInputOptions<Contract extends ContractWithPhases, Id> = {
  boardId: string;
  where?: BoundWhere<Contract, Id>;
  dependsOn?: readonly InputFieldRef<string, unknown>[];
};

type BoundBoardInputs<Contract extends ContractWithPhases> = {
  vertex<
    Id extends string = TiledVertexIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(
    options: BoundBoardInputOptions<Contract, Id>,
  ): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-vertex">;
  edge<
    Id extends string = TiledEdgeIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(
    options: BoundBoardInputOptions<Contract, Id>,
  ): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-edge">;
  tile<Id extends string = string>(
    options: BoundBoardInputOptions<Contract, Id>,
  ): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-tile">;
  space<
    Id extends string = TiledSpaceIdOfTable<
      BoundTable<Contract>,
      TiledBoardIdOfTable<BoundTable<Contract>>
    >,
  >(
    options: BoundBoardInputOptions<Contract, Id>,
  ): InputCollector<z.ZodType<Id>, BoundState<Contract>, "board-space">;
  playerSpace<
    BoardId extends string = string,
    SpaceId extends string = string,
    PlayerId extends string = PlayerIdOfState<BoundState<Contract>>,
  >(options: {
    boardId: BoardId;
    where?: BoundWhere<
      Contract,
      PlayerBoardSpaceTarget<BoardId, SpaceId, PlayerId>
    >;
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }): InputCollector<
    PlayerSpaceInputSchema<BoardId, SpaceId, PlayerId>,
    BoundState<Contract>,
    "board-space"
  >;
};

/**
 * An eligibility predicate whose `errorCode` is checked against the model's
 * declared error codes. The unbound `TargetPredicate` accepts any string.
 */
export type BoundTargetPredicate<
  Contract extends ContractWithPhases,
  Target,
> = Omit<TargetPredicate<BoundState<Contract>, Target>, "errorCode"> & {
  errorCode: ContractErrorCode<Contract>;
};

type BoundWhere<Contract extends ContractWithPhases, Target> =
  | BoundTargetPredicate<Contract, Target>
  | readonly BoundTargetPredicate<Contract, Target>[];

type BoundCardCollector<
  Contract extends ContractWithPhases,
  Id extends string,
  ZoneIds extends readonly string[],
> = InputCollector<z.ZodType<Id>, BoundState<Contract>, "card"> & {
  readonly meta: {
    readonly zoneId: ZoneIds[number];
    readonly zoneIds: ZoneIds;
    readonly targetKind: "card";
  };
};

/**
 * Card collector: the zones to draw candidates from and the predicates that
 * filter them. The target rule is built internally.
 */
type BoundCardInput<Contract extends ContractWithPhases> = <
  Id extends string = CardIdOfManifest<BoundManifest<Contract>>,
  const ZoneIds extends readonly string[] = readonly string[],
>(options: {
  from: ZoneIds;
  where?: BoundWhere<Contract, Id>;
  dependsOn?: readonly InputFieldRef<string, unknown>[];
}) => BoundCardCollector<Contract, Id, ZoneIds>;

type BoundRngInputs<Contract extends ContractWithPhases> = {
  d6(count?: number): ReturnType<typeof rngInput.d6<BoundState<Contract>>>;
  coin(): ReturnType<typeof rngInput.coin<BoundState<Contract>>>;
};

export type BoundInputBuilders<Contract extends ContractWithPhases> = {
  readonly board: BoundBoardInputs<Contract>;
  readonly card: BoundCardInput<Contract>;
  readonly form: BoundFormInputs<Contract>;
  readonly rng: BoundRngInputs<Contract>;
};

export type PhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = {
  interaction<Collectors extends Record<string, InputCollector>>(
    spec: InteractionSpec<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>,
      ContractErrorCode<Contract>
    >,
  ): InteractionSpec<
    Collectors,
    BoundPhaseState<Contract, PhaseStateSchema>,
    BoundManifest<Contract>,
    ContractErrorCode<Contract>
  >;
  rule<
    Collectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
  >(
    rule: InteractionRule<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>,
      ContractErrorCode<Contract>
    >,
  ): InteractionRule<
    Collectors,
    BoundPhaseState<Contract, PhaseStateSchema>,
    BoundManifest<Contract>,
    ContractErrorCode<Contract>
  >;
  define<
    SubmitCollectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
    Interactions extends InteractionMap<
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>
    > = Record<string, never>,
  >(
    definition: Omit<
      PhaseDefinition<
        PhaseStateSchema,
        BoundState<Contract>,
        BoundManifest<Contract>,
        SubmitCollectors,
        Interactions,
        OptionsOfContract<Contract>,
        ContractErrorCode<Contract>
      >,
      "state"
    >,
  ): PhaseDefinition<
    PhaseStateSchema,
    BoundState<Contract>,
    BoundManifest<Contract>,
    SubmitCollectors,
    Interactions,
    OptionsOfContract<Contract>,
    ContractErrorCode<Contract>
  >;
  readonly inputs: BoundInputBuilders<Contract>;
  /** Compile-time only. Reading any member at runtime throws. */
  readonly types: PhaseTypes<Contract, PhaseStateSchema>;
};

/**
 * Phantom type carriers for one phase: `typeof playing.types.State` is the
 * phase-scoped game state (`state.phase` narrowed to this phase's schema).
 */
export type PhaseTypes<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = {
  readonly State: BoundPhaseState<Contract, PhaseStateSchema>;
  readonly PhaseState: z.infer<PhaseStateSchema>;
  readonly Tx: ReducerTransaction<
    BoundPhaseState<Contract, PhaseStateSchema>,
    ContractErrorCode<Contract>
  >;
};

/**
 * Phantom type carriers for the whole game. These replace the
 * `GameStateOf<GameContractOf<typeof model>>` chain: a module that has the
 * bound game value can write `typeof game.types.State` and stop there.
 */
export type ContractTypes<Contract extends ContractWithPhases> = {
  readonly Contract: Contract;
  readonly Options: OptionsOfContract<Contract>;
  readonly State: BoundState<Contract>;
  readonly Manifest: BoundManifest<Contract>;
  readonly ErrorCode: ContractErrorCode<Contract>;
  readonly PlayerId: PlayerIdOfState<BoundState<Contract>>;
  readonly Queries: TableQueriesOfState<BoundState<Contract>>;
  readonly Tx: ReducerTransaction<
    BoundState<Contract>,
    ContractErrorCode<Contract>
  >;
};

/**
 * View factories bound to the contract's state and manifest. Grouped under
 * `game.views` so the assembled `views: { shared, player }` map reads the same
 * way it is authored.
 */
export type BoundViewBuilders<Contract extends ContractWithPhases> = {
  shared<Projection>(
    definition: SharedViewDefinition<
      BoundState<Contract>,
      BoundManifest<Contract>,
      Projection
    >,
  ): SharedViewDefinition<
    BoundState<Contract>,
    BoundManifest<Contract>,
    Projection
  >;
  player<SharedProjection = unknown, Projection = unknown>(
    definition: PlayerViewDefinition<
      BoundState<Contract>,
      BoundManifest<Contract>,
      SharedProjection,
      Projection
    >,
  ): PlayerViewDefinition<
    BoundState<Contract>,
    BoundManifest<Contract>,
    SharedProjection,
    Projection
  >;
  empty(): import("../model").EmptyViewDefinition<
    BoundState<Contract>,
    BoundManifest<Contract>
  >;
  static<Projection>(
    definition: StaticViewDefinition<
      import("../model").ExactManifestContractOf<Contract>,
      Projection
    >,
  ): StaticViewDefinition<
    import("../model").ExactManifestContractOf<Contract>,
    Projection
  >;
};

/**
 * Rejects phase keys the model did not declare. `PhaseMapOf<Contract>` already
 * requires every declared phase; this closes the other direction so an extra
 * key fails at `assemble` instead of at runtime.
 */
type NoUndeclaredPhases<Contract, Definitions> = {
  [Name in Exclude<
    keyof Definitions,
    PhaseNameOfContract<Contract>
  >]: `Phase '${Name & string}' is not declared in model.phases`;
};

export type GameAuthoring<Contract extends ContractWithPhases> = {
  readonly contract: Contract;
  readonly views: BoundViewBuilders<Contract>;
  /** Compile-time only. Reading any member at runtime throws. */
  readonly types: ContractTypes<Contract>;
  /** Assemble the final game definition from phases and views. */
  assemble<
    Definitions extends PhaseMapOf<Contract>,
    Views extends ViewMapOf<Contract>,
  >(
    definition: Omit<
      import("../model").ReducerGameDefinition<Contract, Definitions, Views>,
      "contract"
    > & { phases: NoUndeclaredPhases<Contract, Definitions> },
  ): import("../model").ReducerGameDefinition<Contract, Definitions, Views>;
  phase<Name extends PhaseNameOfContract<Contract>>(
    name: Name,
  ): PhaseAuthoring<Contract, PhaseSchemasOfContract<Contract>[Name]>;
};

/** @deprecated internal alias; use {@link GameAuthoring}. */
export type ContractAuthoring<Contract extends ContractWithPhases> =
  GameAuthoring<Contract>;

const PHANTOM_TYPES_MESSAGE =
  "`.types` is a compile-time carrier: use it only in `typeof` positions.";

function phantomTypes<Types>(): Types {
  return new Proxy(Object.freeze({}), {
    get() {
      throw new TypeError(PHANTOM_TYPES_MESSAGE);
    },
  }) as Types;
}

type AnyPredicate = TargetPredicate<never, never>;

function toPredicateList(
  where: AnyPredicate | readonly AnyPredicate[] | undefined,
): readonly AnyPredicate[] {
  if (!where) return [];
  return Array.isArray(where) ? where : [where as AnyPredicate];
}

function applyWhere<Builder extends { where: (p: never) => Builder }>(
  builder: Builder,
  where: AnyPredicate | readonly AnyPredicate[] | undefined,
): Builder {
  return toPredicateList(where).reduce(
    (current, predicate) => current.where(predicate as never),
    builder,
  );
}

function createFusedCardInput<
  Contract extends ContractWithPhases,
>(): BoundCardInput<Contract> {
  return ((options: {
    from: readonly string[];
    where?: AnyPredicate | readonly AnyPredicate[];
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }) => {
    const target = applyWhere(
      cardTarget.zones<never, string, readonly string[]>(options.from),
      options.where,
    ).build();
    return cardInput({
      target: target as never,
      ...(options.dependsOn ? { dependsOn: options.dependsOn } : {}),
    });
  }) as unknown as BoundCardInput<Contract>;
}

function createFusedBoardInputs<
  Contract extends ContractWithPhases,
>(): BoundBoardInputs<Contract> {
  const fuse =
    (kind: "vertex" | "edge" | "space" | "tile") =>
    (options: {
      boardId: string;
      where?: AnyPredicate | readonly AnyPredicate[];
      dependsOn?: readonly InputFieldRef<string, unknown>[];
    }) => {
      const target = applyWhere(
        boardTarget[kind]<never, string>(options.boardId),
        options.where,
      ).build();
      return boardInput[kind]({
        target: target as never,
        ...(options.dependsOn ? { dependsOn: options.dependsOn } : {}),
      });
    };
  const playerSpace = (options: {
    boardId: string;
    where?: AnyPredicate | readonly AnyPredicate[];
    dependsOn?: readonly InputFieldRef<string, unknown>[];
  }) =>
    boardInput.playerSpace({
      target: applyWhere(
        boardTarget.playerSpace<never, string, string>(options.boardId),
        options.where,
      ).build() as never,
      ...(options.dependsOn ? { dependsOn: options.dependsOn } : {}),
    });
  return {
    vertex: fuse("vertex"),
    edge: fuse("edge"),
    space: fuse("space"),
    tile: fuse("tile"),
    playerSpace,
  } as unknown as BoundBoardInputs<Contract>;
}

function createBoundInputBuilders<
  Contract extends ContractWithPhases,
>(): BoundInputBuilders<Contract> {
  return {
    board: createFusedBoardInputs<Contract>(),
    card: createFusedCardInput<Contract>(),
    form: formInput.forState<BoundState<Contract>>(),
    rng: rngInput as BoundRngInputs<Contract>,
  };
}

function createPhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
>(
  _contract: Contract,
  schema: PhaseStateSchema,
): PhaseAuthoring<Contract, PhaseStateSchema> {
  return {
    interaction: (spec) =>
      defineInteraction<Contract, PhaseStateSchema>()(
        spec as Parameters<
          ReturnType<typeof defineInteraction<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof spec,
    rule: (rule) =>
      defineInteractionRule<Contract, PhaseStateSchema>()(
        rule as Parameters<
          ReturnType<typeof defineInteractionRule<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof rule,
    define: (definition) =>
      definePhase<Contract>()({
        ...definition,
        state: schema,
      } as Parameters<ReturnType<typeof definePhase<Contract>>>[0]) as never,
    inputs: createBoundInputBuilders<Contract>(),
    types: phantomTypes<PhaseTypes<Contract, PhaseStateSchema>>(),
  };
}

export function createContractAuthoring<
  const Contract extends ContractWithPhases,
>(contract: Contract): GameAuthoring<Contract> {
  const phaseCache = new Map<string, unknown>();
  const views: BoundViewBuilders<Contract> = {
    shared: (definition) => defineSharedView<Contract>()(definition),
    player: (definition) => definePlayerView<Contract>()(definition),
    empty: () => defineEmptyView<Contract>(),
    static: (definition) => defineStaticView<Contract>()(definition),
  };
  const assemble: GameAuthoring<Contract>["assemble"] = (definition) =>
    defineGameDefinition({
      contract,
      ...(definition as Omit<
        import("../model").ReducerGameDefinition<
          Contract,
          PhaseMapOf<Contract>,
          ViewMapOf<Contract>
        >,
        "contract"
      >),
    }) as never;
  return {
    contract,
    views,
    types: phantomTypes<ContractTypes<Contract>>(),
    assemble,
    phase: (name) => {
      const cached = phaseCache.get(name);
      if (cached) return cached as never;
      const schema = contract.phases[name];
      const bound = createPhaseAuthoring(contract, schema);
      phaseCache.set(name, bound);
      return bound as never;
    },
  };
}
