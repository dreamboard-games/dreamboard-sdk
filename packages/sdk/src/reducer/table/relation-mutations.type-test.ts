import * as z from "zod";
import { createGame } from "../../reducer.js";
import { compileManifest } from "../manifest/compiler.js";
import type { RelationInputForBoard } from "../manifest/types.js";
const manifest = {
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  boards: [
    {
      id: "track",
      name: "Track",
      scope: "shared",
      layout: "generic",
      spaces: [{ id: "a" }, { id: "b" }],
      relationFieldsSchema: z.strictObject({
        required: z.string(),
        cost: z.int().default(2),
      }),
    },
  ],
} as const;
const definitions = compileManifest(manifest);
type Input = RelationInputForBoard<typeof definitions, "track">;
const valid: Input = {
  id: "route",
  typeId: "open",
  fromSpaceId: "a",
  toSpaceId: "b",
  fields: { required: "yes" },
};
// @ts-expect-error Required schema input cannot be omitted.
const missingFields: Input = {
  id: "route",
  typeId: "open",
  fromSpaceId: "a",
  toSpaceId: "b",
};
const missingRequired: Input = {
  ...valid,
  // @ts-expect-error Defaults do not make other required keys optional.
  fields: { cost: 1 },
};
const badEndpoint: Input = {
  ...valid,
  // @ts-expect-error Endpoints follow the authored board family.
  toSpaceId: "elsewhere",
};
const badFrom: Input = {
  ...valid,
  // @ts-expect-error Foreign source endpoint is also denied.
  fromSpaceId: "elsewhere",
};
void [valid, missingFields, missingRequired, badEndpoint, badFrom];

const model = createGame({
  manifest: compileManifest(manifest),
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
play.interaction({
  inputs: {},
  reduce({ tx }) {
    tx.addRelation({ boardId: "track", relation: valid });
    tx.addRelation({
      boardId: "track",
      relation: {
        ...valid,
        // @ts-expect-error Actual authored reducer keeps required schema input keys.
        fields: {},
      },
    });
  },
});
