import { compileManifest } from "./manifest/compiler";
import { createGame as createModel } from "../reducer";
import { cardInput, cardTarget } from "./inputs";

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { formInput, rngInput } from "./inputs";
import { many } from "../reducer";
import { type CollectorState } from "../reducer/model";

import { createClientParamSchemasByPhase } from "./client-param-schemas";
function createContract() {
  return createModel({
    manifest: compileManifest({
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
              cardType: "play-card",
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
    }),
    state: {
      public: z.object({}),
      private: z.object({}),
      hidden: z.object({}),
    },
    phases: {
      setup: z.object({}),
      play: z.object({}),
    },
  });
}
describe("createClientParamSchemasByPhase", () => {
  test("derives schemas from registry-materialized authored interactions", () => {
    const contract = createContract();
    const explicitSchema = z.object({
      explicit: z.literal("schema"),
    });
    const game = contract.assemble({
      initial: { public: () => ({}), private: () => ({}), hidden: () => ({}) },
      view: () => ({}),
      initialPhase: "setup",
      phases: {
        setup: contract.phase("setup").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            choose: contract.phase("setup").interaction({
              inputs: {
                count: formInput.number({ min: 0, max: 10 }),
                mode: formInput.choice({
                  choices: [
                    { value: "fast", label: "Fast" },
                    { value: "slow", label: "Slow" },
                  ],
                  defaultValue: "fast",
                }),
                labels: many(
                  formInput.choice({
                    choices: [
                      { value: "a", label: "A" },
                      { value: "b", label: "B" },
                      { value: "c", label: "C" },
                    ],
                    defaultValue: "a",
                  }),
                  {
                    count: 2,
                    distinct: true,
                  },
                ),
                dice: rngInput.d6(2),
              },
              reduce: () => {},
            }),
            explicit: contract.phase("setup").interaction({
              inputs: {
                explicit: formInput.choice({
                  choices: [
                    { value: "ignored", label: "Ignored" },
                    { value: "schema", label: "Schema" },
                  ],
                  defaultValue: "ignored",
                }),
              },
              paramsSchema: explicitSchema,
              reduce: () => {},
            }),
            playCard: contract.phase("setup").interaction({
              inputs: {
                cardId: cardInput({
                  target: cardTarget
                    .zones<CollectorState, string>(["hand"])
                    .where({
                      id: "card-type",
                      errorCode: "CARD_TYPE_NOT_ALLOWED",
                      test: ({ state, targetId }) =>
                        state.table.cards[targetId]?.cardType === "play-card",
                    })
                    .build(),
                }),
                target: formInput.choice({
                  choices: [{ value: "zone-1", label: "Zone 1" }],
                  defaultValue: "zone-1",
                }),
                sampled: rngInput.d6(),
              },
              reduce: () => {},
            }),
          },
        }),
        play: contract.phase("play").define({
          kind: "player",
          initialState: () => ({}),
          interactions: {
            choose: contract.phase("play").interaction({
              inputs: {
                label: formInput.choice({
                  choices: [{ value: "ok", label: "OK" }],
                  defaultValue: "ok",
                }),
              },
              reduce: () => {},
            }),
          },
        }),
      },
    });
    const schemas = createClientParamSchemasByPhase(game);
    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: ["a", "b"] })
        .success,
    ).toBe(true);
    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: ["a", "b"] }),
    ).toMatchObject({
      success: true,
      data: { count: 1, labels: ["a", "b"], mode: "fast" },
    });
    expect(
      schemas.setup?.choose?.safeParse({
        count: 1,
        labels: ["a", "b"],
      }).success,
    ).toBe(true);
    expect(
      schemas.setup?.choose?.safeParse({ count: 1, labels: "a" }).success,
    ).toBe(false);
    expect(
      schemas.setup?.choose?.safeParse({ label: "wrong-phase" }).success,
    ).toBe(false);
    expect(schemas.play?.choose?.safeParse({ label: "ok" }).success).toBe(true);
    expect(schemas.play?.choose?.safeParse({ count: 1 }).success).toBe(true);
    expect(
      schemas.setup?.explicit?.safeParse({ explicit: "schema" }).success,
    ).toBe(true);
    expect(
      schemas.setup?.explicit?.safeParse({ ignored: "input" }).success,
    ).toBe(false);
    expect(
      schemas.setup?.playCard?.safeParse({ cardId: "card-1", target: "zone-1" })
        .success,
    ).toBe(true);
    expect(
      schemas.setup?.playCard?.safeParse({ target: "zone-1" }).success,
    ).toBe(false);
  });
});
