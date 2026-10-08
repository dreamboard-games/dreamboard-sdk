import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { PerPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { validatedReducerDefinition } from "../model/definition";
import type { ViewData } from "../model/spec/views";
import { InteractionSteps } from "./steps";
import type { ViewDefinition } from "../model";
import type { z } from "zod";
import type {
  ZoneIdOfTable,
  CardIdOfManifest,
  TileIdOfTable,
  BoardIdOfTable,
  SpaceIdOfTable,
  InputCollector,
  InteractionMap,
  InteractionRule,
  InteractionSpec,
  PhaseDefinition,
  PhaseMapOf,
  ReducerGameDefinition,
  ReducerGameDefinitionInput,
  OptionsOfContract,
  PlayerIdOfState,
  SchemaLike,
  TableOfManifest,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
  ViewOfContract,
} from "../model";
import type { ScopedPhaseState } from "../model/spec/runtime-args";
import type {
  BoardSpaceTarget,
  BoardSpaceInputSchema,
  PositionTarget,
} from "../inputs";
import type { PositionTargetSchema } from "../../shared/position-target.js";
import type {
  TargetPredicate,
  TargetRule,
  TargetRuleBuilder,
} from "../inputs/targetRule";
import type { CollectorState } from "../model";
import type { TableQueriesOfState } from "../model/queries";
import type { ReducerTransaction } from "../transaction";
import {
  boardInput,
  boardTarget,
  cardInput,
  cardTarget,
  positionInput,
  tileInput,
  tileTarget,
  formInput,
  rngInput,
} from "../inputs";
import type {
  AnyReducerGameContract,
  ContractErrorCode,
  ContractManifest,
  ContractState,
} from "./types";
import {
  validateDefineGamePhaseNames,
  validateDefineGamePhases,
} from "./validation";
import { defineInteraction, defineInteractionRule } from "./interaction";
import { defineView } from "./views";
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

/** The selected board owns the element namespace, including generic spaces. */
type BoundBoardInputOptions<
  Contract extends ContractWithPhases,
  BoardId,
  Id,
> = {
  boardId: BoardId;
  where?: BoundWhere<Contract, Id>;
};
type PlayerBoardBaseId<Contract extends ContractWithPhases> = {
  [
    B in keyof BoundManifest<Contract>["boardDefinitions"] & string
  ]: BoundManifest<Contract>["boardDefinitions"][B] extends {
    scope: "perPlayer";
  }
    ? B
    : never;
}[keyof BoundManifest<Contract>["boardDefinitions"] & string];
type PlayerBoardRuntimeId<Table, Base extends string> = Extract<
  BoardIdOfTable<Table>,
  PerPlayerInstanceId<"board", Base>
>;
type BoundBoardInputs<Contract extends ContractWithPhases> = {
  vertex<
    B extends TiledBoardIdOfTable<
      BoundTable<Contract>,
      BoundManifest<Contract>
    >,
  >(
    options: BoundBoardInputOptions<
      Contract,
      B,
      TiledVertexIdOfTable<
        BoundTable<Contract>,
        NoInfer<B>,
        BoundManifest<Contract>
      >
    >,
  ): InputCollector<
    z.ZodString,
    BoundState<Contract>,
    "board-vertex",
    TiledVertexIdOfTable<BoundTable<Contract>, B, BoundManifest<Contract>>
  >;
  edge<
    B extends TiledBoardIdOfTable<
      BoundTable<Contract>,
      BoundManifest<Contract>
    >,
  >(
    options: BoundBoardInputOptions<
      Contract,
      B,
      TiledEdgeIdOfTable<
        BoundTable<Contract>,
        NoInfer<B>,
        BoundManifest<Contract>
      >
    >,
  ): InputCollector<
    z.ZodString,
    BoundState<Contract>,
    "board-edge",
    TiledEdgeIdOfTable<BoundTable<Contract>, B, BoundManifest<Contract>>
  >;
  space<B extends BoardIdOfTable<BoundTable<Contract>>>(
    options: BoundBoardInputOptions<
      Contract,
      B,
      SpaceIdOfTable<BoundTable<Contract>, NoInfer<B>, BoundManifest<Contract>>
    >,
  ): InputCollector<
    z.ZodString,
    BoundState<Contract>,
    "board-space",
    SpaceIdOfTable<BoundTable<Contract>, B, BoundManifest<Contract>>
  >;
  playerSpace<B extends PlayerBoardBaseId<Contract>>(options: {
    boardId: B;
    where?: BoundWhere<
      Contract,
      BoardSpaceTarget<
        PerPlayerInstanceId<"board", NoInfer<B>>,
        SpaceIdOfTable<
          BoundTable<Contract>,
          PlayerBoardRuntimeId<BoundTable<Contract>, NoInfer<B>>,
          BoundManifest<Contract>
        >
      >
    >;
  }): InputCollector<
    BoardSpaceInputSchema,
    BoundState<Contract>,
    "board-space",
    BoardSpaceTarget<
      PerPlayerInstanceId<"board", B>,
      SpaceIdOfTable<
        BoundTable<Contract>,
        PlayerBoardRuntimeId<BoundTable<Contract>, B>,
        BoundManifest<Contract>
      >
    >
  >;
};

/**
 * An eligibility predicate whose `errorCode` is checked against the model's
 * declared error codes. The unbound `TargetPredicate` accepts any string.
 */
export type BoundTargetPredicate<
  Contract extends ContractWithPhases,
  Target,
> = Omit<
  TargetPredicate<BoundState<Contract>, Target, BoundManifest<Contract>>,
  "errorCode"
> & {
  errorCode: ContractErrorCode<Contract>;
};

type BoundWhere<Contract extends ContractWithPhases, Target> =
  | BoundTargetPredicate<Contract, Target>
  | readonly BoundTargetPredicate<Contract, Target>[];

type BoundCardCollector<
  Contract extends ContractWithPhases,
  Id extends string,
  ZoneIds extends readonly string[],
> = InputCollector<z.ZodString, BoundState<Contract>, "card", Id> & {
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
  const ZoneIds extends readonly ZoneIdOfTable<BoundTable<Contract>>[],
>(options: {
  from: ZoneIds;
  where?: BoundWhere<Contract, CardIdOfManifest<BoundManifest<Contract>>>;
}) => BoundCardCollector<
  Contract,
  CardIdOfManifest<BoundManifest<Contract>>,
  ZoneIds
>;

/** Tile instances in authored zones or exact runtime boards. */
type BoundTileInput<Contract extends ContractWithPhases> = (
  options: (
    | { from: readonly ZoneIdOfTable<BoundTable<Contract>>[]; boards?: never }
    | {
        boards: readonly TiledBoardIdOfTable<
          BoundTable<Contract>,
          BoundManifest<Contract>
        >[];
        from?: never;
      }
  ) & {
    where?: BoundWhere<Contract, TileIdOfTable<BoundTable<Contract>>>;
  },
) => InputCollector<
  z.ZodType<TileIdOfTable<BoundTable<Contract>>>,
  BoundState<Contract>,
  "tile",
  TileIdOfTable<BoundTable<Contract>>
>;

/**
 * An insertion point in one of the zones, in each host the player may reach.
 * `tx.moveComponentToPosition` places a card there.
 */
type BoundPositionInput<Contract extends ContractWithPhases> = <
  const ZoneIds extends readonly ZoneIdOfTable<BoundTable<Contract>>[],
>(options: {
  zones: ZoneIds;
}) => InputCollector<
  typeof PositionTargetSchema,
  BoundState<Contract>,
  "position",
  PositionTarget<ZoneIds[number]>
> & { readonly meta: { readonly zoneIds: ZoneIds } };

type BoundRngInputs<Contract extends ContractWithPhases> = {
  d6(count?: number): ReturnType<typeof rngInput.d6<BoundState<Contract>>>;
  coin(): ReturnType<typeof rngInput.coin<BoundState<Contract>>>;
};

export type BoundInputBuilders<Contract extends ContractWithPhases> = {
  readonly board: BoundBoardInputs<Contract>;
  readonly card: BoundCardInput<Contract>;
  readonly position: BoundPositionInput<Contract>;
  readonly tile: BoundTileInput<Contract>;
  readonly form: BoundFormInputs<Contract>;
  readonly rng: BoundRngInputs<Contract>;
};

/** Preserve each phase kind's required fields while binding its state schema. */
type PhaseDefinitionWithoutState<Definition> = Definition extends unknown
  ? Omit<Definition, "state">
  : never;

export type PhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
> = {
  steps(): InteractionSteps<
    BoundPhaseState<Contract, PhaseStateSchema>,
    Record<never, never>,
    BoundManifest<Contract>
  >;
  interaction<Collectors extends Record<string, InputCollector>>(
    spec: Extract<
      InteractionSpec<
        Collectors,
        BoundPhaseState<Contract, PhaseStateSchema>,
        BoundManifest<Contract>,
        ContractErrorCode<Contract>
      >,
      { steps: unknown }
    >,
  ): Extract<
    InteractionSpec<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>,
      ContractErrorCode<Contract>
    >,
    { steps: unknown }
  >;
  interaction<Collectors extends Record<string, InputCollector>>(
    spec: Extract<
      InteractionSpec<
        Collectors,
        BoundPhaseState<Contract, PhaseStateSchema>,
        BoundManifest<Contract>,
        ContractErrorCode<Contract>
      >,
      { inputs: unknown }
    >,
  ): Extract<
    InteractionSpec<
      Collectors,
      BoundPhaseState<Contract, PhaseStateSchema>,
      BoundManifest<Contract>,
      ContractErrorCode<Contract>
    >,
    { inputs: unknown }
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
    const Kind extends "player" | "simultaneousPlayer" | "auto" =
      "player" | "simultaneousPlayer" | "auto",
  >(
    definition: PhaseDefinitionWithoutState<
      PhaseDefinition<
        PhaseStateSchema,
        BoundState<Contract>,
        BoundManifest<Contract>,
        SubmitCollectors,
        Interactions,
        OptionsOfContract<Contract>,
        ContractErrorCode<Contract>
      >
    > & { kind: Kind },
  ): PhaseDefinition<
    PhaseStateSchema,
    BoundState<Contract>,
    BoundManifest<Contract>,
    SubmitCollectors,
    Interactions,
    OptionsOfContract<Contract>,
    ContractErrorCode<Contract>
  > & { kind: Kind };
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
    ContractErrorCode<Contract>,
    BoundManifest<Contract>
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
  readonly Queries: TableQueriesOfState<
    BoundState<Contract>,
    BoundManifest<Contract>
  >;
  readonly Tx: ReducerTransaction<
    BoundState<Contract>,
    ContractErrorCode<Contract>,
    BoundManifest<Contract>
  >;
};

export type GameAuthoring<Contract extends ContractWithPhases> = {
  readonly contract: Contract;
  view<Projection extends ViewData>(
    view: ViewDefinition<
      BoundState<Contract>,
      BoundManifest<Contract>,
      Projection
    >,
  ): ViewDefinition<BoundState<Contract>, BoundManifest<Contract>, Projection>;
  /** Compile-time only. Reading any member at runtime throws. */
  readonly types: ContractTypes<Contract>;
  /** Assemble the final game definition from phases and the seat view. */
  assemble<
    Definitions extends PhaseMapOf<Contract>,
    View extends ViewOfContract<Contract>,
  >(
    definition: ReducerGameDefinitionInput<Contract, Definitions, View>,
  ): ReducerGameDefinition<Contract, Definitions, View>;
  phase<Name extends keyof Contract["phases"] & string>(
    name: Name,
  ): PhaseAuthoring<Contract, Contract["phases"][Name]>;
};

const PHANTOM_TYPES_MESSAGE =
  "`.types` is a compile-time carrier: use it only in `typeof` positions.";

function phantomTypes<Types>(): Types {
  return new Proxy(Object.freeze({}), {
    get() {
      throw new TypeError(PHANTOM_TYPES_MESSAGE);
    },
  }) as Types;
}

function applyWhere<
  State extends CollectorState,
  Target,
  Rule extends TargetRule<State, Target, Definitions>,
  Definitions extends TopologyDefinitions,
>(
  builder: TargetRuleBuilder<State, Target, Rule, Definitions>,
  where:
    | TargetPredicate<State, Target, Definitions>
    | readonly TargetPredicate<State, Target, Definitions>[]
    | undefined,
): TargetRuleBuilder<State, Target, Rule, Definitions> {
  const predicates =
    where === undefined ? [] : "test" in where ? [where] : where;
  return predicates.reduce(
    (current, predicate) => current.where(predicate),
    builder,
  );
}

function createFusedCardInput<Contract extends ContractWithPhases>(
  contract: Contract,
): BoundCardInput<Contract> {
  return (options) =>
    cardInput({
      target: applyWhere(
        cardTarget.zones<
          BoundState<Contract>,
          CardIdOfManifest<BoundManifest<Contract>>,
          typeof options.from,
          BoundManifest<Contract>
        >(options.from, contract.manifest),
        options.where,
      ).build(),
    });
}

function createFusedTileInput<Contract extends ContractWithPhases>(
  contract: Contract,
): BoundTileInput<Contract> {
  return (options) => {
    const builder =
      options.from !== undefined
        ? tileTarget.zones<
            BoundState<Contract>,
            TileIdOfTable<BoundTable<Contract>>,
            BoundManifest<Contract>
          >(options.from)
        : tileTarget.boards<
            BoundState<Contract>,
            TileIdOfTable<BoundTable<Contract>>,
            BoundManifest<Contract>
          >(options.boards);
    return tileInput({
      target: applyWhere(builder, options.where).build(),
      // The bound contract owns the authoritative tile syntax and target IDs.
      schema: contract.manifest.ids.tileId as z.ZodType<
        TileIdOfTable<BoundTable<Contract>>
      >,
    });
  };
}

function createFusedBoardInputs<
  Contract extends ContractWithPhases,
>(): BoundBoardInputs<Contract> {
  return {
    vertex: (options) =>
      boardInput.vertex({
        target: applyWhere(
          boardTarget.vertex<
            BoundState<Contract>,
            TiledVertexIdOfTable<
              BoundTable<Contract>,
              typeof options.boardId,
              BoundManifest<Contract>
            >,
            BoundManifest<Contract>
          >(options.boardId),
          options.where,
        ).build(),
      }),
    edge: (options) =>
      boardInput.edge({
        target: applyWhere(
          boardTarget.edge<
            BoundState<Contract>,
            TiledEdgeIdOfTable<
              BoundTable<Contract>,
              typeof options.boardId,
              BoundManifest<Contract>
            >,
            BoundManifest<Contract>
          >(options.boardId),
          options.where,
        ).build(),
      }),
    space: (options) =>
      boardInput.space({
        target: applyWhere(
          boardTarget.space<
            BoundState<Contract>,
            SpaceIdOfTable<
              BoundTable<Contract>,
              typeof options.boardId,
              BoundManifest<Contract>
            >,
            BoundManifest<Contract>
          >(options.boardId),
          options.where,
        ).build(),
      }),
    playerSpace: (options) =>
      boardInput.playerSpace({
        target: applyWhere(
          boardTarget.playerSpace<
            BoundState<Contract>,
            typeof options.boardId,
            SpaceIdOfTable<
              BoundTable<Contract>,
              PlayerBoardRuntimeId<
                BoundTable<Contract>,
                typeof options.boardId
              >,
              BoundManifest<Contract>
            >,
            BoundManifest<Contract>
          >(options.boardId),
          options.where,
        ).build(),
      }),
  };
}

function createBoundInputBuilders<Contract extends ContractWithPhases>(
  contract: Contract,
): BoundInputBuilders<Contract> {
  return {
    board: createFusedBoardInputs<Contract>(),
    card: createFusedCardInput(contract),
    position: (options) =>
      positionInput({ zones: options.zones, definitions: contract.manifest }),
    tile: createFusedTileInput(contract),
    form: formInput.forState<BoundState<Contract>>(),
    rng: rngInput,
  };
}

function createPhaseAuthoring<
  Contract extends ContractWithPhases,
  PhaseStateSchema extends SchemaLike<object>,
>(
  contract: Contract,
  schema: PhaseStateSchema,
): PhaseAuthoring<Contract, PhaseStateSchema> {
  return {
    steps: () => new InteractionSteps(),
    interaction: defineInteraction<
      Contract,
      PhaseStateSchema
    >() as PhaseAuthoring<Contract, PhaseStateSchema>["interaction"],
    rule: (rule) =>
      defineInteractionRule<Contract, PhaseStateSchema>()(
        rule as Parameters<
          ReturnType<typeof defineInteractionRule<Contract, PhaseStateSchema>>
        >[0],
      ) as typeof rule,
    define: (definition) => ({ ...definition, state: schema }),
    inputs: createBoundInputBuilders(contract),
    types: phantomTypes<PhaseTypes<Contract, PhaseStateSchema>>(),
  };
}

export function createContractAuthoring<
  const Contract extends ContractWithPhases,
>(contract: Contract): GameAuthoring<Contract> {
  const phases: Contract["phases"] = contract.phases;
  const assemble: GameAuthoring<Contract>["assemble"] = (definition) => {
    const game = { ...definition, contract };
    validateDefineGamePhaseNames(game);
    validateDefineGamePhases(game);
    return { ...game, [validatedReducerDefinition]: true };
  };
  return {
    contract,
    view: defineView<Contract>(),
    types: phantomTypes<ContractTypes<Contract>>(),
    assemble,
    phase: (name) => createPhaseAuthoring(contract, phases[name]),
  };
}
