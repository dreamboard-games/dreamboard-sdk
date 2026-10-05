import type { ZoneHostMap } from "../src/reducer/model/table";
import type { ScenarioCommandOf } from "../src/testing/definitions.js";
import { many } from "../src/reducer.js";
import { boardInput, boardTarget } from "../src/reducer/inputs.js";
import type { CollectorState, ParamsOf } from "../src/reducer/model.js";
/**
 * Type-level proof for the public authoring surface.
 *
 * `createGame(model)` is the only entry point. The returned value is the type
 * leaf (`typeof game.types.*`), the factory namespace (`game.phase(name)`,
 * `phase.inputs.*`, `game.view`), and the assembler (`game.assemble`).
 * Mutation callbacks receive an open transaction `tx` and end with a bare
 * `return`, `tx.transition(...)`, `tx.endGame(...)`, or `tx.reject(...)`.
 */
import { z } from "zod";
import {
  asPlayerId,
  createGame,
  type BoundTargetPredicate,
  type PlayerId,
  type ReducerGameDefinitionInput,
} from "../src/reducer.js";
import type { GameStateOf } from "../src/reducer/model.js";
import type { HiddenCardId } from "../src/shared/domain/cards.js";
import {
  createManifestStringLiteralSchema,
  type ClientParamsOfInteractionOfDefinition,
  type PhaseNamesOfDefinition,
  type PhaseNameOfContract,
  type ReducerManifestContract,
  type RuntimeCardData,
  type RuntimeRecord,
  type RuntimeTableRecord,
} from "../src/reducer/model.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

// --- A schema-only model file: no SDK factory is called here. --------------

type TestPlayerId = PlayerId;
type TestCardId = "card-1" | "card-2";
type TestPlayerZoneId = "hand";
type TestPlayerRecord<Value> = Record<TestPlayerId, Value>;
type TestTable = Omit<
  RuntimeTableRecord,
  "playerOrder" | "cards" | "zones" | "resources"
> & {
  playerOrder: TestPlayerId[];
  cards: Record<TestCardId, RuntimeCardData>;
  zones: Record<
    TestPlayerZoneId,
    ZoneHostMap<PlayerId, TestCardId, "perPlayer">
  >;
  resources: TestPlayerRecord<RuntimeRecord>;
};
function testPlayerRecord<Value>(): TestPlayerRecord<Value> {
  return Object.fromEntries([]);
}

const playerIds: readonly PlayerId[] = [
  asPlayerId("player-1"),
  asPlayerId("player-2"),
];
const phaseNames = ["setup", "playerTurn"] as const;
const cardIds = ["card-1", "card-2"] as const;
const playerZoneIds = ["hand"] as const;

const manifest = {
  zoneDefinitions: {
    hand: {
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["cards"],
    },
  } as const,
  literals: {
    playerIds,
    phaseNames,
    boardLayouts: [] as const,
    cardSetIds: ["cards"] as const,
    cardTypes: ["action"] as const,
    zoneIds: playerZoneIds,
    cardIds,
    resourceIds: [] as const,
    pieceTypeIds: [] as const,
    pieceIds: [] as const,
    dieTypeIds: [] as const,
    dieIds: [] as const,
    boardTypeIds: [] as const,
    boardBaseIds: [] as const,
    boardIds: [] as const,
    relationTypeIds: [] as const,
    edgeIds: [] as const,
    edgeTypeIds: [] as const,
    vertexIds: [] as const,
    vertexTypeIds: [] as const,
    spaceIds: [] as const,
    spaceTypeIds: [] as const,
    cardSetIdByCardId: { "card-1": "cards", "card-2": "cards" },
    cardTypeByCardId: { "card-1": "action", "card-2": "action" },
  },
  ids: {
    playerId: createManifestStringLiteralSchema(playerIds),
    phaseName: createManifestStringLiteralSchema(phaseNames),
    boardLayout: z.never(),
    cardSetId: createManifestStringLiteralSchema(["cards"] as const),
    cardType: createManifestStringLiteralSchema(["action"] as const),
    cardId: createManifestStringLiteralSchema(cardIds),
    zoneId: createManifestStringLiteralSchema(playerZoneIds),
    resourceId: z.never(),
    pieceTypeId: z.never(),
    pieceId: z.never(),
    dieId: z.never(),
    dieTypeId: z.never(),
    boardTypeId: z.never(),
    boardId: z.never(),
    boardBaseId: z.never(),
    relationTypeId: z.never(),
    edgeId: z.never(),
    edgeTypeId: z.never(),
    vertexId: z.never(),
    vertexTypeId: z.never(),
    spaceId: z.never(),
    spaceTypeId: z.never(),
  },
  defaults: {
    zones: () => ({ hand: testPlayerRecord<TestCardId[]>() }),
    ownerOfCard: () => ({}),
    visibility: () => ({}),
    resources: () => testPlayerRecord<RuntimeRecord>(),
  },
  tableSchema: z.custom<TestTable>(),
  runtimeSchema: z.any(),
  createGameStateSchema: () => z.any(),
} satisfies ReducerManifestContract<
  TestTable,
  (typeof phaseNames)[number],
  TestPlayerId,
  TestPlayerZoneId,
  TestCardId
>;

const gameModel = {
  manifest,
  state: {
    public: z.object({
      currentPlayerId: createManifestStringLiteralSchema(playerIds).nullable(),
    }),
    private: z.object({}),
    hidden: z.object({}),
  },
  phases: {
    setup: z.object({}),
    playerTurn: z.object({ rolled: z.boolean() }),
  },
  errors: {
    NOT_READY: "You are not ready.",
    BAD_CARD: "That card is not playable.",
  },
};

type GameModel = typeof gameModel;

// --- The bound game value. In a real workspace this is `app/game-model.ts`. --

const game = createGame(gameModel);
type GameState = typeof game.types.State;
type GameErrorCode = typeof game.types.ErrorCode;
type Tx = typeof game.types.Tx;

// --- Phantom types equal the contract-derived types exactly. -----------------

const runtimeContract = game.contract;
type _StateEqualsContractState = Expect<
  Equal<GameState, GameStateOf<typeof runtimeContract>>
>;
type _FlowPhaseIsLiteral = Expect<
  Equal<GameState["flow"]["currentPhase"], "setup" | "playerTurn">
>;
type _PlayerIdIsBranded = Expect<
  Equal<GameState["publicState"]["currentPlayerId"], PlayerId | null>
>;
type _ErrorCodesAreLiteral = Expect<
  Equal<
    Extract<GameErrorCode, "NOT_READY" | "BAD_CARD" | "NOPE">,
    "NOT_READY" | "BAD_CARD"
  >
>;
type _PhantomPlayerId = Expect<Equal<typeof game.types.PlayerId, PlayerId>>;

// Rules and helpers type their parameters from the phantom carriers alone.
export function nextPlayer(state: GameState): PlayerId | null {
  return state.publicState.currentPlayerId;
}
export function markReady(tx: Tx, playerId: PlayerId): void {
  tx.patchPublicState({ currentPlayerId: playerId });
}

// Direct transaction methods preserve manifest identities without an ops layer.
export function mutateTypedDraft(tx: Tx, playerId: PlayerId): GameState {
  const draft: GameState = tx.moveComponentToZone({
    to: { zoneId: "hand", hostId: playerId },
    componentId: "card-1",
  });
  tx.rotateZone({
    zoneId: "hand",
    direction: "left",
    componentIdsByPlayer: { [playerId]: ["card-2"] },
  });
  tx.moveComponentToZone({
    to: { zoneId: "hand", hostId: playerId },
    // @ts-expect-error Card IDs stay constrained to this manifest.
    componentId: "unknown-card",
  });
  tx.moveComponentToZone({
    // @ts-expect-error Per-player destinations require an explicit active host.
    to: { zoneId: "hand" },
    componentId: "card-1",
  });
  // @ts-expect-error A transaction has no immutable-op escape hatch.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: A transaction has no immutable-op escape hatch.
  tx.apply((state: GameState) => state);
  // @ts-expect-error Patch field types remain constrained by the state schema.
  tx.patchPublicState({ currentPlayerId: 12 });
  return draft;
}

// --- A phase file: the bound handle, fused inputs, tx-first reducer. --------

const playerTurn = game.phase("playerTurn");
// @ts-expect-error Phase stages have been removed.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Phase stages have been removed.
playerTurn.stepPhase({});
// @ts-expect-error Cards use ordinary interactions with explicit card inputs.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Cards use ordinary interactions with explicit card inputs.
playerTurn.cardAction({});

// `state.phase` is the phase fields plus the cross-phase `PhaseAccessor`.
type _PhaseScopedState = Expect<
  Equal<(typeof playerTurn.types.State)["phase"]["rolled"], boolean>
>;
type _PhaseRawState = Expect<
  Equal<typeof playerTurn.types.PhaseState, { rolled: boolean }>
>;
// A phase-scoped transaction is assignable to a base-state helper parameter.
type _ScopedTxFlowsToBaseTx = Expect<
  typeof playerTurn.types.Tx extends Tx ? true : false
>;

// Fused card input: zones plus predicates; no target builder, no `.build()`.
const readyCard = playerTurn.inputs.card({
  from: ["hand"],
  where: {
    id: "ready-card",
    errorCode: "BAD_CARD",
    test: ({ state, targetId }) => {
      type _WhereStateIsScoped = Expect<
        Equal<typeof state.phase.rolled, boolean>
      >;
      type _WhereTargetIsCardId = Expect<Equal<typeof targetId, TestCardId>>;
      return state.phase.rolled && targetId === "card-1";
    },
  },
});
type _FusedCardKeepsZone = Expect<
  Equal<(typeof readyCard)["meta"]["zoneId"], "hand">
>;

// Predicates can live in their own module, typed against the game contract.
export const firstCardOnly: BoundTargetPredicate<
  typeof game.types.Contract,
  TestCardId
> = {
  id: "first-card-only",
  errorCode: "BAD_CARD",
  test: ({ targetId }) => targetId === "card-1",
};

// The bound `where` checks error codes against the model.
playerTurn.inputs.card({
  from: ["hand"],
  // @ts-expect-error `BAD_CRAD` is not a declared error code.
  where: { id: "typo", errorCode: "BAD_CRAD", test: () => true },
});

const playerTurnPhase = playerTurn.define({
  kind: "player",
  initialState: () => ({ rolled: false }),
  actor: ({ state }) => state.publicState.currentPlayerId,
  interactions: {
    pick: playerTurn.interaction({
      inputs: {
        cardId: readyCard,
        mood: playerTurn.inputs.form.choice({
          choices: [
            { value: "ready", label: "Ready" },
            { value: "wait", label: "Wait" },
          ],
          defaultValue: "ready",
        }),
      },
      reduce: ({ tx, input, ...args }) => {
        // @ts-expect-error Acceptance belongs to tx, not the callback args.
        args.accept;
        // @ts-expect-error Transactions have no competing edit constructor.
        args.edit;
        // @ts-expect-error Rejection belongs to tx.
        args.reject;
        // @ts-expect-error Terminal results belong to tx.
        args.endGame;
        // @ts-expect-error Mutation callbacks no longer receive an ops namespace.
        args.ops;
        // @ts-expect-error Mutation callbacks have no effect namespace.
        args.fx;
        // @ts-expect-error Outcome builders do not schedule effects.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Outcome builders do not schedule effects.
        tx.schedule({ kind: "engine.rollDie" });
        // @ts-expect-error Effect continuations have been removed.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Effect continuations have been removed.
        tx.effect({});
        type _ParamsAreLiteral = Expect<
          Equal<typeof input.params.mood, "ready" | "wait">
        >;
        type _CardParamIsBranded = Expect<
          Equal<typeof input.params.cardId, TestCardId>
        >;
        type _TxIsPhaseScoped = Expect<
          Equal<typeof tx.state.phase.rolled, boolean>
        >;
        // Mutations go through the transaction; a bare return accepts it.
        const patched = tx.patchPhaseState({ rolled: true });
        type _MutationRetainsPhase = Expect<
          Equal<typeof patched.phase.rolled, boolean>
        >;
        // @ts-expect-error The scoped phase state rejects unrelated fields.
        tx.patchPhaseState({ nonexistent: true });
        markReady(tx, input.playerId);
        if (input.params.mood === "wait") return;
        // Declared error codes only.
        if (input.params.cardId !== "card-1") return tx.reject("BAD_CARD");
        // Declared phase names only.
        return tx.transition("setup");
      },
    }),
  },
});

// `tx.transition` and `tx.reject` are checked against the model.
playerTurn.define({
  kind: "auto",
  initialState: () => ({ rolled: false }),
  enter: ({ tx }) => {
    // @ts-expect-error misspelled phase name.
    tx.transition("setpu");
    // @ts-expect-error undeclared error code.
    return tx.reject("NOT_REDY");
  },
});

// --- Assembly. View are plain objects with no factory argument. ------------

const definition = game.assemble({
  initial: {
    public: ({ playerIds }) => ({ currentPlayerId: playerIds[0] ?? null }),
    private: () => ({}),
    hidden: () => ({}),
  },
  initialPhase: "setup",
  phases: {
    setup: game.phase("setup").define({
      kind: "auto",
      initialState: () => ({}),
      enter: ({ tx }) => tx.transition("playerTurn"),
    }),
    playerTurn: playerTurnPhase,
  },
  view: game.view(({ state, playerId }) => ({
    me: playerId,
    current: state.publicState.currentPlayerId,
    rolled: state.phase.get("playerTurn")?.rolled ?? false,
  })),
});

type _PhaseNamesSurvive = Expect<
  Equal<PhaseNamesOfDefinition<typeof definition>, "setup" | "playerTurn">
>;
type _ClientParamsSurvive = Expect<
  Equal<
    ClientParamsOfInteractionOfDefinition<
      typeof definition,
      "playerTurn",
      "pick"
    >,
    // Seats name the cards hidden from them by position.
    { cardId: TestCardId | HiddenCardId; mood: "ready" | "wait" }
  >
>;
type _DefinitionStateFlowsToContractState = Expect<
  GameStateOf<typeof definition> extends GameState ? true : false
>;

// --- Phase keys are checked at `assemble`. ---------------------------------

game.assemble({
  initialPhase: "setup",
  // @ts-expect-error missing `playerTurn` phase key.
  phases: {
    setup: game
      .phase("setup")
      .define({ kind: "auto", initialState: () => ({}) }),
  },
  view: () => ({}),
});

game.assemble({
  initialPhase: "setup",
  phases: {
    setup: game
      .phase("setup")
      .define({ kind: "auto", initialState: () => ({}) }),
    playerTurn: playerTurnPhase,
    // @ts-expect-error extra `bonus` phase key is not in the model.
    bonus: game
      .phase("setup")
      .define({ kind: "auto", initialState: () => ({}) }),
  },
  view: () => ({}),
});

// Named inputs preserve the same public checks without exposing output-only fields.
const assemblyInput: ReducerGameDefinitionInput<
  typeof game.contract,
  typeof definition.phases,
  typeof definition.view
> = {
  phases: definition.phases,
  initialPhase: "setup",
  view: definition.view,
};
const reassembled = game.assemble(assemblyInput);
type _AssemblyPreservesView = Expect<
  Equal<typeof reassembled.view, typeof definition.view>
>;

const phasesWithExtraKey = {
  ...definition.phases,
  bonus: definition.phases.setup,
};
game.assemble({
  // @ts-expect-error Extra phase keys are rejected even through a variable.
  phases: phasesWithExtraKey,
  view: definition.view,
});
game.assemble({
  ...assemblyInput,
  // @ts-expect-error Initial phase must be declared by the model.
  initialPhase: "bonus",
});
game.assemble({
  ...assemblyInput,
  initial: {
    // @ts-expect-error Initial state callbacks retain their model output type.
    public: () => ({ currentPlayerId: 42 }),
  },
});

// @ts-expect-error misspelled phase name is rejected at `game.phase`.
game.phase("playerTurm");

export { definition };

const optionsGame = createGame({
  ...gameModel,
  options: z.strictObject({
    variant: z.enum(["short", "long"]),
    rounds: z.number().int().default(3),
  }),
});
optionsGame.phase("playerTurn").define({
  kind: "player",
  initialState: ({ options }) => {
    const variant: "short" | "long" = options.variant;
    const rounds: number = options.rounds;
    // @ts-expect-error Options retain their model-bound keys.
    options.undeclared;
    return { rolled: variant === "short" && rounds > 0 };
  },
});
optionsGame.assemble({
  initial: {
    public: ({ options, playerIds }) => {
      const variant: "short" | "long" = options.variant;
      // @ts-expect-error Parsed numeric options do not become strings.
      const rounds: string = options.rounds;
      void variant;
      void rounds;
      return { currentPlayerId: playerIds[0] ?? null };
    },
  },
  phases: {
    setup: optionsGame
      .phase("setup")
      .define({ kind: "auto", initialState: () => ({}) }),
    playerTurn: optionsGame
      .phase("playerTurn")
      .define({ kind: "player", initialState: () => ({ rolled: false }) }),
  },
  view: () => ({}),
});
const optionPhase = optionsGame.phase("playerTurn");
optionPhase.interaction({
  inputs: {},
  actor: ({ state }) => state.publicState.currentPlayerId,
  reduce: () => {},
});
optionPhase.interaction({
  inputs: {},
  // @ts-expect-error Actor IDs stay model-bound.
  actor: () => "unknown-seat",
  reduce: () => {},
});
// @ts-expect-error Recipient routing uses actor.
optionPhase.interaction({
  inputs: {},
  to: () => playerIds[0],
  reduce: () => {},
});
// @ts-expect-error Visibility is controlled by actor authorization.
optionPhase.interaction({
  inputs: {},
  visibility: "actorsOnly",
  reduce: () => {},
});
// @ts-expect-error Affordability is an authored rule.
optionPhase.interaction({
  inputs: {},
  cost: () => ({ gold: 1 }),
  reduce: () => {},
});
optionPhase.define({
  kind: "player",
  initialState: () => ({ rolled: false }),
  // @ts-expect-error Phase guidance metadata was removed.
  guidance: { summary: "Removed" },
});
optionPhase.define({
  kind: "player",
  initialState: () => ({ rolled: false }),
  // @ts-expect-error Phase zone wiring metadata was removed.
  zones: ["hand"],
});
// @ts-expect-error Ordinary form choices replace prompt collectors.
optionPhase.inputs.prompt;
optionsGame.assemble({
  ...definition,
  // @ts-expect-error Initialization uses model options and ordinary phase entry.
  setupProfiles: {},
});

// One contextual seat view; legacy projection roles and resolver injection are absent.
const seatView = game.view(({ state, playerId, q, ...args }) => {
  // @ts-expect-error A seat view cannot consume a separate shared projection.
  args.shared;
  // @ts-expect-error Derived values are ordinary memoized functions.
  args.derived;
  const handIds = q.zone("hand", playerId);
  type _ZonePreservesComponentIds = Expect<
    Equal<(typeof handIds)[number], TestCardId>
  >;
  // @ts-expect-error Per-player zone reads require the branded host identity.
  q.zone("hand");
  // @ts-expect-error Literal seat strings cannot bypass the PlayerId boundary.
  q.zone("hand", "player-1");
  return {
    me: playerId,
    current: state.publicState.currentPlayerId,
    hand: q.zone.cards("hand", playerId),
  };
});
type _SeatViewInference = Expect<
  Equal<
    ReturnType<typeof seatView>["me"],
    GameState["table"]["playerOrder"][number]
  >
>;
// @ts-expect-error Split shared/player/static view builders were removed.
game.views;

const committedSteps = playerTurn
  .steps()
  .input("count", { kind: "form", schema: z.number() })
  .input("choice", ({ selected, state, playerId, q }) => {
    const count: number = selected.count;
    // @ts-expect-error A factory cannot read a future step.
    selected.choice;
    void [count, state.phase, playerId, q];
    return { kind: "form" as const, schema: z.string().nullable() };
  });
playerTurn.interaction({
  steps: committedSteps,
  reduce({ input }) {
    const count: number = input.params.count;
    const choice: string | null = input.params.choice;
    void [count, choice];
    // @ts-expect-error Complete params contain only declared steps.
    input.params.future;
  },
});
// @ts-expect-error Step names are unique.
committedSteps.input("count", { kind: "form", schema: z.number() });
// @ts-expect-error Server sampled inputs cannot be committed interaction steps.
playerTurn.steps().input("roll", playerTurn.inputs.rng.d6());
// @ts-expect-error Inputs and ordered steps are mutually exclusive.
playerTurn.interaction({ inputs: {}, steps: committedSteps, reduce() {} });

// @ts-expect-error Dynamic step factories cannot return server sampled collectors.
playerTurn.steps().input("roll", () => playerTurn.inputs.rng.d6());

const stepDefinition = game.assemble({
  ...definition,
  phases: {
    ...definition.phases,
    playerTurn: playerTurn.define({
      kind: "player",
      initialState: () => ({ rolled: false }),
      interactions: {
        choose: playerTurn.interaction({ steps: committedSteps, reduce() {} }),
      },
    }),
  },
});
type StepCommandParams = ClientParamsOfInteractionOfDefinition<
  typeof stepDefinition,
  "playerTurn",
  "choose"
>;
const firstStepParams: StepCommandParams = { count: 1 };
const secondStepParams: StepCommandParams = { choice: null };
// @ts-expect-error A command cannot submit the whole dependent interaction.
const combinedStepParams: StepCommandParams = { count: 1, choice: null };
// @ts-expect-error The current step command requires one declared value.
const emptyStepParams: StepCommandParams = {};
playerTurn.inputs.form.choice({
  choices: [{ value: "a", label: "A" }],
  dependsOn: [],
  // @ts-expect-error No overload accepts the removed dependsOn option.
  defaultValue: "a",
});
playerTurn.inputs.form.choice({
  // @ts-expect-error Previous values are closed over from the step factory selected argument.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Negative compiler proof: Previous values are closed over from the step factory selected argument.
  choices: ({ values }) => [{ value: values.previous, label: "A" }],
  defaultValue: () => undefined,
});
void [firstStepParams, secondStepParams, combinedStepParams, emptyStepParams];

playerTurn.interaction({
  inputs: {
    bonus: playerTurn.inputs.form.number({ min: 0, max: 10, defaultValue: 0 }),
    dice: playerTurn.inputs.rng.d6(),
  },
  paramsSchema: z.object({ bonus: z.number() }),
  rules: [
    {
      id: "client-only",
      errorCode: "NOT_READY",
      validate({ input }) {
        const bonus: number = input.params.bonus;
        // @ts-expect-error Engine-sampled values do not exist during validation.
        input.params.dice;
        return bonus >= 0;
      },
    },
  ],
  reduce({ input }) {
    const faces: number[] = input.params.dice.values;
    void faces;
  },
});

// Authored view records cannot shadow manifest-owned geometry.
// @ts-expect-error Primitive projections are not authored seat records.
game.view(() => 3);
// @ts-expect-error Array projections are not authored seat records.
game.view(() => ["hidden"]);
// @ts-expect-error boards is reserved for manifest metadata.
game.view(() => ({ boards: {} }));

// Nested domain interfaces and readonly collections remain valid authoring data.
interface ProjectedCard {
  readonly id: string;
}
declare const projectedCards: readonly ProjectedCard[];
const recordView = game.view(() => ({ cards: projectedCards }));
void recordView;

import type { CoreInstance } from "../src/headless/model.js";
declare const steppedInstance: CoreInstance<typeof stepDefinition>;
steppedInstance.inputs.get("playerTurn.choose", "count").setValue(1);
steppedInstance.inputs.get("playerTurn.choose", "choice").setValue(null);
// @ts-expect-error Step input value types remain distinct.
steppedInstance.inputs.get("playerTurn.choose", "count").setValue("bad");

// Syntax parsing does not establish manifest membership; complete collection does.
type _CardSyntaxIsString = Expect<
  Equal<z.infer<typeof readyCard.schema>, string>
>;
const collectedCards = many(readyCard, { min: 1, max: 2 });
type _ManyCardSyntax = Expect<
  Equal<z.infer<typeof collectedCards.schema>, string[]>
>;
type _ManyCardValue = Expect<
  Equal<ParamsOf<{ cards: typeof collectedCards }>["cards"], TestCardId[]>
>;
const collectedSpaces = boardInput.space({
  target: boardTarget.space<CollectorState, "s1" | "s2">("board").build(),
});
type _SpaceSyntax = Expect<
  Equal<z.infer<typeof collectedSpaces.schema>, string>
>;
type _SpaceValue = Expect<
  Equal<ParamsOf<{ space: typeof collectedSpaces }>["space"], "s1" | "s2">
>;
const collectedPlayerSpace = boardInput.playerSpace({
  target: boardTarget
    .playerSpace<CollectorState, "mat", "s1" | "s2">("mat")
    .build(),
});
type _PlayerSpaceSyntax = Expect<
  Equal<
    z.infer<typeof collectedPlayerSpace.schema>,
    { boardId: string; spaceId: string }
  >
>;
type _PlayerSpaceValue = Expect<
  Equal<
    ParamsOf<{ space: typeof collectedPlayerSpace }>["space"]["spaceId"],
    "s1" | "s2"
  >
>;
const parsedSyntax = readyCard.schema.parse("unrelated-id");
// @ts-expect-error A syntax parse is not proof of manifest membership.
const unvalidatedCard: TestCardId = parsedSyntax;
void unvalidatedCard;
type _ScenarioCardValue = Expect<
  Equal<
    Extract<
      ScenarioCommandOf<typeof definition>,
      { interactionId: "pick" }
    >["params"]["cardId"],
    TestCardId
  >
>;
const nestedCollectedCards = many(collectedCards, { count: 2 });
type _NestedCardValue = Expect<
  Equal<
    ParamsOf<{ cards: typeof nestedCollectedCards }>["cards"],
    TestCardId[][]
  >
>;

// Bound phases preserve simultaneous-only requirements after supplying state.
playerTurn.define({
  kind: "simultaneousPlayer",
  actors: ({ state }) => state.table.playerOrder,
  submit: { inputs: {} },
  resolve: () => {},
});
// @ts-expect-error Simultaneous phases require a resolver.
playerTurn.define({
  kind: "simultaneousPlayer",
  actors: ({ state }) => state.table.playerOrder,
  submit: { inputs: {} },
});
// @ts-expect-error Simultaneous phases require an actor selector.
playerTurn.define({
  kind: "simultaneousPlayer",
  submit: { inputs: {} },
  resolve: () => {},
});
// @ts-expect-error Simultaneous phases require a submit definition.
playerTurn.define({
  kind: "simultaneousPlayer",
  actors: ({ state }) => state.table.playerOrder,
  resolve: () => {},
});

const dynamicChoice = playerTurn.inputs.form.choice({
  choices: () => [{ value: "ready" as const, label: "Ready" }],
  defaultValue: () => "ready" as const,
});
const dynamicList = playerTurn.inputs.form.choiceList({
  choices: () => [{ value: "ready" as const, label: "Ready" }],
});
const staticChoice = playerTurn.inputs.form.choice({
  choices: [{ value: "ready", label: "Ready" }],
  defaultValue: "ready",
});
type _StaticChoiceSyntax = Expect<
  Equal<z.output<typeof staticChoice.schema>, "ready">
>;
type _DynamicChoiceSyntax = Expect<
  Equal<z.output<typeof dynamicChoice.schema>, string | null>
>;
type _DynamicListSyntax = Expect<
  Equal<z.output<typeof dynamicList.schema>, string[]>
>;
type _DynamicChoiceValue = Expect<
  Equal<ParamsOf<{ mode: typeof dynamicChoice }>["mode"], "ready">
>;
type _DynamicListValue = Expect<
  Equal<ParamsOf<{ modes: typeof dynamicList }>["modes"], "ready"[]>
>;
// @ts-expect-error Dynamic syntax parsing does not establish choice membership.
const unvalidatedChoice: "ready" = dynamicChoice.schema.parse("not-a-choice");
// @ts-expect-error List syntax parsing does not establish choice membership.
const unvalidatedChoices: "ready"[] = dynamicList.schema.parse([
  "not-a-choice",
]);
const dynamicPhase = playerTurn.define({
  kind: "player",
  interactions: {
    choose: playerTurn.interaction({
      inputs: { mode: dynamicChoice, modes: dynamicList },
      paramsSchema: z.object({
        mode: z.string().nullable(),
        modes: z.array(z.string()),
      }),
      reduce: ({ input }) => {
        type _ValidatedMode = Expect<Equal<typeof input.params.mode, "ready">>;
        type _ValidatedModes = Expect<
          Equal<typeof input.params.modes, "ready"[]>
        >;
      },
    }),
  },
});
const dynamicDefinition = game.assemble({
  phases: { setup: definition.phases.setup, playerTurn: dynamicPhase },
  view: definition.view,
});
type _ScenarioDynamicChoice = Expect<
  Equal<
    Extract<
      ScenarioCommandOf<typeof dynamicDefinition>,
      { interactionId: "choose" }
    >["params"]["mode"],
    "ready"
  >
>;
type _ScenarioDynamicList = Expect<
  Equal<
    Extract<
      ScenarioCommandOf<typeof dynamicDefinition>,
      { interactionId: "choose" }
    >["params"]["modes"],
    readonly "ready"[]
  >
>;
void [unvalidatedChoice, unvalidatedChoices];
