import { compileManifest } from "./manifest/compiler";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createGame } from "../reducer";
import {
  type ClientParamsOfInteractionOfDefinition,
  type PhaseNamesOfDefinition,
} from "../reducer/model";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

function createModel() {
  const manifest = compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [
      {
        id: "cards",
        name: "Cards",
        cardSchema: z.object({}),
        defaultHome: { type: "detached" },
        cards: [
          {
            id: "card-1",
            name: "card-1",
            cardType: "standard",
            count: 1,
            properties: {},
          },
        ],
      },
    ],
    zones: [
      {
        id: "hand",
        name: "hand",
        scope: "perPlayer",
        visibility: "ownerOnly",
        allowedCardSetIds: ["cards"],
      },
    ],
  });
  return {
    manifest,
    state: {
      public: z.object({
        currentPlayerId: manifest.ids.playerId.nullable(),
      }),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      setup: z.object({}),
      playerTurn: z.object({ rolled: z.boolean() }),
    },
  };
}

function createAuthoring() {
  return createGame(createModel());
}

describe("createGame", () => {
  test("stages model inference before contextually typing the implementation", () => {
    const authoring = createAuthoring();
    const setup = authoring.phase("setup");
    const playerTurn = authoring.phase("playerTurn");
    const game = authoring.assemble({
      initial: {
        public: ({ playerIds }) => ({
          currentPlayerId: authoring.contract.manifest.ids.playerId
            .nullable()
            .parse(playerIds[0] ?? null),
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "setup",
      phases: {
        setup: setup.define({
          kind: "player",
          initialState: () => ({}),
          interactions: {},
        }),
        playerTurn: playerTurn.define({
          kind: "player",
          initialState: () => ({ rolled: false }),
          actor: ({ state }) => state.publicState.currentPlayerId,
          interactions: {
            chooseMood: playerTurn.interaction({
              inputs: {
                mood: playerTurn.inputs.form.choice({
                  choices: [
                    { value: "ready", label: "Ready" },
                    { value: "wait", label: "Wait" },
                  ],
                  defaultValue: "ready",
                }),
                dice: playerTurn.inputs.rng.d6(),
              },
              reduce: () => {},
            }),
          },
        }),
      },
      view: () => ({}),
    });
    type PhaseNames = PhaseNamesOfDefinition<typeof game>;
    type Params = ClientParamsOfInteractionOfDefinition<
      typeof game,
      "playerTurn",
      "chooseMood"
    >;
    const typeAssertions = [true, true] satisfies [
      Expect<Equal<PhaseNames, "setup" | "playerTurn">>,
      Expect<Equal<Params, { mood: "ready" | "wait" }>>,
    ];
    expect(game.contract.phaseNames).toEqual(["setup", "playerTurn"]);
    expect(typeAssertions).toEqual([true, true]);
  });
});

describe("bound game authoring", () => {
  test("preserves an interaction specification through the bound factory", () => {
    const authoring = createAuthoring();
    const playerTurn = authoring.phase("playerTurn");
    const spec = {
      inputs: {
        mood: playerTurn.inputs.form.choice({
          choices: [
            { value: "ready", label: "Ready" },
            { value: "wait", label: "Wait" },
          ],
          defaultValue: "ready",
        }),
      },
      reduce: () => {},
    };
    expect(playerTurn.interaction(spec)).toBe(spec);
  });
  test("infers game phases and client params without authored annotations", () => {
    const authoring = createAuthoring();
    const setup = authoring.phase("setup");
    const playerTurn = authoring.phase("playerTurn");
    const setupPhase = setup.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {},
    });
    const playerTurnPhase = playerTurn.define({
      kind: "player",
      initialState: () => ({ rolled: false }),
      actor: ({ state }) => state.publicState.currentPlayerId,
      interactions: {
        chooseMood: playerTurn.interaction({
          inputs: {
            mood: playerTurn.inputs.form.choice({
              choices: [
                { value: "ready", label: "Ready" },
                { value: "wait", label: "Wait" },
              ],
              defaultValue: "ready",
            }),
            dice: playerTurn.inputs.rng.d6(),
          },
          reduce: () => {},
        }),
      },
    });
    const game = authoring.assemble({
      initial: {
        public: ({ playerIds }) => ({
          currentPlayerId: authoring.contract.manifest.ids.playerId
            .nullable()
            .parse(playerIds[0] ?? null),
        }),
        private: () => ({}),
        hidden: () => ({}),
      },
      initialPhase: "setup",
      phases: {
        setup: setupPhase,
        playerTurn: playerTurnPhase,
      },
      view: () => ({}),
    });
    type PhaseNames = PhaseNamesOfDefinition<typeof game>;
    type Params = ClientParamsOfInteractionOfDefinition<
      typeof game,
      "playerTurn",
      "chooseMood"
    >;
    const typeAssertions = [true, true] satisfies [
      Expect<Equal<PhaseNames, "setup" | "playerTurn">>,
      Expect<Equal<Params, { mood: "ready" | "wait" }>>,
    ];
    expect(game.contract).toBe(authoring.contract);
    expect(game.phases.playerTurn).toBe(playerTurnPhase);
    expect(typeAssertions).toEqual([true, true]);
  });
});
