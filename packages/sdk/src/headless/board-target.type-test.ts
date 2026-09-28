import { z } from "zod";
import { createGame, many } from "../reducer.js";
import type { InputDomain } from "../shared/interaction-schema.js";
import type { DropTarget } from "./features/drag.js";
import type { IdOf } from "./model.js";

const model = createGame({
  manifest: {
    players: { minPlayers: 2, maxPlayers: 2 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        layout: "square",
        scope: "perPlayer",
        spaces: [{ id: "slot", row: 0, col: 0 }],
        edges: [],
        vertices: [],
        relations: [],
        containers: [],
      },
    ],
  },
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const collector = play.inputs.board.playerSpace({ boardId: "mat" });
const several = many(collector, { min: 1 });
const game = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {
        choose: play.interaction({
          inputs: { space: collector, spaces: several },
          reduce({ input }) {
            const base: "mat" = input.params.space.boardId;
            const manyBase: "mat" = input.params.spaces[0]!.boardId;
            // @ts-expect-error A player-space value is not a scalar ID.
            const scalar: string = input.params.space;
            void [base, manyBase, scalar];
          },
        }),
      },
    }),
  },
  view: model.view(() => ({})),
});
declare const domain: InputDomain;
if (
  domain.type === "boardTarget" &&
  domain.valueKind === "player-board-space"
) {
  const player: string = domain.eligibleTargets[0]!.playerId;
  // @ts-expect-error The tuple domain cannot expose scalar targets.
  const scalar: string = domain.eligibleTargets[0]!;
  void [player, scalar];
}
declare const drop: DropTarget<typeof game>;
if (drop.valueKind === "player-board-space") {
  const base: IdOf<typeof game, "boardBaseId"> = drop.boardId;
  // @ts-expect-error A base board identity is not a player-specific runtime board.
  const runtime: IdOf<typeof game, "boardId"> = drop.boardId;
  void [base, runtime];
} else {
  const runtime: IdOf<typeof game, "boardId"> = drop.boardId;
  const id: string = drop.id;
  void [runtime, id];
}

void game;
