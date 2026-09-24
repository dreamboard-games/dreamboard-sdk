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
  createGame,
  type BoundTargetPredicate,
  type PlayerId,
} from "../src/reducer.js";
import { defineGameContract } from "../src/reducer/internal.js";
import type { GameStateOf } from "../src/reducer/model.js";
import {
  createManifestStringLiteralSchema,
  type ClientParamsOfInteractionOfDefinition,
  type PhaseNamesOfDefinition,
  type PhaseNameOfContract,
  type ReducerManifestContract,
  type RuntimeCardData,
  type RuntimeRecord,
  type RuntimeTableRecord,
} from "../src/reducer/advanced.js";

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
type TestPerPlayer<Value> = {
  readonly __perPlayer: true;
  readonly entries: ReadonlyArray<readonly [TestPlayerId, Value]>;
};
type TestTable = Omit<
  RuntimeTableRecord,
  "playerOrder" | "cards" | "hands" | "resources"
> & {
  playerOrder: TestPlayerId[];
  cards: Record<TestCardId, RuntimeCardData>;
  hands: Record<TestPlayerZoneId, TestPerPlayer<TestCardId[]>>;
  resources: TestPerPlayer<RuntimeRecord>;
};
function testPerPlayer<Value>(): TestPerPlayer<Value> {
  return { __perPlayer: true, entries: [] };
}

const playerIds = [
  "player-1",
  "player-2",
] as const as unknown as readonly PlayerId[];
const phaseNames = ["setup", "playerTurn"] as const;
const cardIds = ["card-1", "card-2"] as const;
const playerZoneIds = ["hand"] as const;

const manifest = {
  literals: {
    playerIds,
    phaseNames,
    boardLayouts: [] as const,
    cardSetIds: ["cards"] as const,
    cardTypes: ["action"] as const,
    deckIds: [] as const,
    handIds: playerZoneIds,
    sharedZoneIds: [] as const,
    playerZoneIds,
    zoneIds: playerZoneIds,
    cardIds,
    resourceIds: [] as const,
    pieceTypeIds: [] as const,
    pieceIds: [] as const,
    dieTypeIds: [] as const,
    dieIds: [] as const,
    boardTemplateIds: [] as const,
    boardTypeIds: [] as const,
    boardBaseIds: [] as const,
    boardIds: [] as const,
    boardContainerIds: [] as const,
    relationTypeIds: [] as const,
    edgeIds: [] as const,
    edgeTypeIds: [] as const,
    vertexIds: [] as const,
    vertexTypeIds: [] as const,
    spaceIds: [] as const,
    spaceTypeIds: [] as const,
    handVisibilityById: { hand: "ownerOnly" } as const,
    zoneVisibilityById: { hand: "ownerOnly" } as const,
    cardSetIdByCardId: { "card-1": "cards", "card-2": "cards" },
    cardTypeByCardId: { "card-1": "action", "card-2": "action" },
    cardSetIdsBySharedZoneId: {},
    cardSetIdsByPlayerZoneId: { hand: ["cards"] },
  },
  ids: {
    playerId: createManifestStringLiteralSchema(playerIds),
    phaseName: createManifestStringLiteralSchema(phaseNames),
    boardLayout: z.never(),
    cardSetId: createManifestStringLiteralSchema(["cards"] as const),
    cardType: createManifestStringLiteralSchema(["action"] as const),
    cardId: createManifestStringLiteralSchema(cardIds),
    deckId: z.never(),
    handId: createManifestStringLiteralSchema(playerZoneIds),
    sharedZoneId: z.never(),
    playerZoneId: createManifestStringLiteralSchema(playerZoneIds),
    zoneId: createManifestStringLiteralSchema(playerZoneIds),
    resourceId: z.never(),
    pieceTypeId: z.never(),
    pieceId: z.never(),
    dieId: z.never(),
    dieTypeId: z.never(),
    boardTypeId: z.never(),
    boardId: z.never(),
    boardBaseId: z.never(),
    boardContainerId: z.never(),
    relationTypeId: z.never(),
    edgeId: z.never(),
    edgeTypeId: z.never(),
    vertexId: z.never(),
    vertexTypeId: z.never(),
    spaceId: z.never(),
    spaceTypeId: z.never(),
  },
  defaults: {
    zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
    decks: () => ({}),
    hands: () => ({ hand: testPerPlayer<TestCardId[]>() }),
    handVisibility: () => ({}),
    ownerOfCard: () => ({}),
    visibility: () => ({}),
    resources: () => testPerPlayer<RuntimeRecord>(),
  },
  tableSchema: z.custom<TestTable>(),
  runtimeSchema: z.any(),
  createGameStateSchema: () => z.any(),
} satisfies ReducerManifestContract<
  TestTable,
  (typeof phaseNames)[number],
  TestPlayerId,
  never,
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

const runtimeContract = defineGameContract(gameModel);
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
  const draft: GameState = tx.moveCardBetweenPlayerZones({
    playerId,
    fromZoneId: "hand",
    toZoneId: "hand",
    cardId: "card-1",
  });
  tx.rotatePlayerZone({
    zoneId: "hand",
    direction: "left",
    cardIdsByPlayer: { [playerId]: ["card-2"] },
  });
  tx.moveCardBetweenPlayerZones({
    playerId,
    fromZoneId: "hand",
    toZoneId: "hand",
    // @ts-expect-error Card IDs stay constrained to this manifest.
    cardId: "unknown-card",
  });
  // @ts-expect-error A transaction has no immutable-op escape hatch.
  tx.apply((state: GameState) => state);
  // @ts-expect-error Patch field types remain constrained by the state schema.
  tx.patchPublicState({ currentPlayerId: 12 });
  return draft;
}

// --- A phase file: the bound handle, fused inputs, tx-first reducer. --------

const playerTurn = game.phase("playerTurn");
// @ts-expect-error Phase stages have been removed.
playerTurn.stepPhase({});
// @ts-expect-error Cards use ordinary interactions with explicit card inputs.
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
        // @ts-expect-error Mutation callbacks no longer receive an ops namespace.
        args.ops;
        // @ts-expect-error Mutation callbacks have no effect namespace.
        args.fx;
        // @ts-expect-error Outcome builders do not schedule effects.
        tx.schedule({ kind: "engine.rollDie" });
        // @ts-expect-error Effect continuations have been removed.
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
    { cardId: TestCardId; mood: "ready" | "wait" }
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
  return {
    me: playerId,
    current: state.publicState.currentPlayerId,
    hand: q.zone.playerCards(playerId, "hand"),
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
// @ts-expect-error Removed dependency declaration is not an input option.
playerTurn.inputs.form.choice({
  choices: [{ value: "a", label: "A" }],
  dependsOn: [],
  defaultValue: "a",
});
playerTurn.inputs.form.choice({
  // @ts-expect-error Previous values are closed over from the step factory selected argument.
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
