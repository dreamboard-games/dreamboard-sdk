import { compileManifest } from "../manifest/compiler.js";
import * as z from "zod";
import { createGame } from "../authoring/game";
import { many } from "./many";
import { boardTarget } from "./boardTarget";
import { boardInput } from "./boardInput";
import type { ParamsOf, ClientParamsOf } from "../model/spec/inputs";
import type { ClientParamsOfInteractionOfDefinition } from "../model/definition";
import type {
  SeatSpaceRef,
  SeatTileRef,
} from "../../shared/domain/seat-reference.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const game = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    zones: [{ id: "bag", name: "Bag", scope: "shared" }],
    boards: [{ id: "map", name: "Map", layout: "square", scope: "shared" }],
    tileTypes: [
      {
        id: "terrain",
        name: "Terrain",
        layout: "square",
        cells: [{ id: "center", at: { col: 0, row: 0 } }],
      },
    ],
    tileSeeds: [
      { id: "tile", typeId: "terrain", home: { type: "zone", zoneId: "bag" } },
    ],
  }),
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
  errors: { INVALID_TILE: "Invalid tile" },
});
const play = game.phase("play");
const tile = play.inputs.tile({
  from: ["bag"],
  where: {
    id: "terrain",
    errorCode: "INVALID_TILE",
    test: ({ targetId, q }) => {
      const id: "tile" = targetId;
      const type: "terrain" = q.tile(id).tileTypeId;
      return type === "terrain";
    },
  },
});
const collectors = { tile, tiles: many(tile, { count: 2 }) };
const reducerId: Equal<ParamsOf<typeof collectors>["tile"], "tile"> = true;
const reducerIds: Equal<ParamsOf<typeof collectors>["tiles"], "tile"[]> = true;
const clientRef: Equal<ClientParamsOf<typeof collectors>["tile"], SeatTileRef> =
  true;
const clientRefs: Equal<
  ClientParamsOf<typeof collectors>["tiles"],
  SeatTileRef[]
> = true;
const spaceCollector = play.inputs.board.space({ boardId: "map" });
play.interaction({
  inputs: { tile, space: spaceCollector },
  rules: [
    {
      id: "authoritative-references",
      errorCode: "INVALID_TILE",
      validate: ({ input }) => {
        const actualTile: "tile" = input.params.tile;
        const actualSpace: ParamsOf<{ space: typeof spaceCollector }>["space"] =
          input.params.space;
        // @ts-expect-error Rules receive decoded tile identities, not seat references.
        const wireTile: SeatTileRef = input.params.tile;
        // @ts-expect-error Rules receive decoded cell identities, not seat references.
        const wireSpace: SeatSpaceRef = input.params.space;
        void [actualTile, actualSpace, wireTile, wireSpace];
        return null;
      },
    },
  ],
  reduce: () => {},
});

const spaceCollectors = {
  space: spaceCollector,
  spaces: many(spaceCollector, { count: 2 }),
};
const clientSpace: Equal<
  ClientParamsOf<typeof spaceCollectors>["space"],
  SeatSpaceRef
> = true;
const clientSpaces: Equal<
  ClientParamsOf<typeof spaceCollectors>["spaces"],
  SeatSpaceRef[]
> = true;
// @ts-expect-error Authoritative tiled cell identities cannot be submitted as opaque seat spaces.
const wrongSpace: ClientParamsOf<typeof spaceCollectors>["space"] =
  {} as ParamsOf<typeof spaceCollectors>["space"];
void [clientSpace, clientSpaces, wrongSpace];

// @ts-expect-error Authoritative tile identity cannot be submitted as a seat reference.
const wrongRef: ClientParamsOf<typeof collectors>["tile"] = "tile";
// @ts-expect-error Cell-space targets are not tile inventory targets.
boardTarget.tile;
// @ts-expect-error There is no board-tile compatibility collector.
boardInput.tile;
// @ts-expect-error Bound tile candidates require declared zones.
play.inputs.tile({ from: ["missing"] });
// @ts-expect-error Bound board candidates require declared runtime tiled boards.
play.inputs.tile({ boards: ["missing"] });
const assembled = game.assemble({
  view: () => ({}),
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        choose: play.interaction({
          inputs: collectors,
          reduce: ({ input }) => {
            const actual: "tile" = input.params.tile;
            void actual;
          },
        }),
      },
    }),
  },
});
const submitted: Equal<
  ClientParamsOfInteractionOfDefinition<
    typeof assembled,
    "play",
    "choose"
  >["tile"],
  SeatTileRef
> = true;
void [reducerId, reducerIds, clientRef, clientRefs, wrongRef, submitted];
