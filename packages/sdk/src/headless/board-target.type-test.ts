import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../shared/domain/per-player-instance.js";
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
            const base: PerPlayerInstanceId<"board", "mat"> =
              input.params.space.boardId;
            const manyBase: PerPlayerInstanceId<"board", "mat"> =
              input.params.spaces[0].boardId;
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
if (domain.type === "boardTarget" && domain.valueKind === "board-space") {
  const boardId: string = domain.eligibleTargets[0].boardId;
  // @ts-expect-error The tuple domain cannot expose scalar targets.
  const scalar: string = domain.eligibleTargets[0];
  void [boardId, scalar];
}
declare const drop: DropTarget<typeof game>;
if (drop.valueKind === "board-space") {
  const runtime: IdOf<typeof game, "boardId"> = drop.value.boardId;
  // @ts-expect-error A runtime instance is not an authored board base.
  const base: IdOf<typeof game, "boardBaseId"> = drop.value.boardId;
  void [base, runtime];
} else {
  const runtime: IdOf<typeof game, "boardId"> = drop.boardId;
  const id: string = drop.value;
  void [runtime, id];
}

void game;

import type { CoreInstance, SelectionTarget } from "./model.js";
declare const instance: CoreInstance<typeof game>;
const selectedSpace = {
  boardId: perPlayerInstanceId("board", "mat", "player-2"),
  spaceId: "slot" as const,
};
const spacesInput = instance.inputs.get("play.choose", "spaces");
spacesInput.setValue([selectedSpace]);
spacesInput.getSelectHandler(selectedSpace);
// @ts-expect-error many selects an item, not the whole collection.
spacesInput.getSelectHandler([selectedSpace]);
// @ts-expect-error many setValue still takes the whole array.
spacesInput.setValue(selectedSpace);
const target: SelectionTarget<typeof game> = {
  kind: "space",
  valueKind: "board-space",
  value: selectedSpace,
};
const duplicateBoard: SelectionTarget<typeof game> = {
  kind: "space",
  valueKind: "board-space",
  value: selectedSpace,
  // @ts-expect-error Tuple targets already own their board identity.
  boardId: perPlayerInstanceId("board", "mat", "player-1"),
};
const tupleEdge: SelectionTarget<typeof game> = {
  kind: "edge",
  // @ts-expect-error Tuple targets are spaces, not edges.
  valueKind: "board-space",
  value: selectedSpace,
};
// @ts-expect-error Scalar board targets require their runtime board ID.
const noBoard: SelectionTarget<typeof game> = {
  kind: "space",
  valueKind: "board-id",
  value: "slot",
};
// @ts-expect-error Space identity belongs to this board.
const missingSpace: SelectionTarget<typeof game> = {
  kind: "space",
  valueKind: "board-id",
  boardId: perPlayerInstanceId("board", "mat", "player-2"),
  value: "missing",
};
void [target, duplicateBoard, tupleEdge, noBoard, missingSpace];

import type { BoardBase } from "./model.js";
declare const board: BoardBase<
  typeof game,
  PerPlayerInstanceId<"board", "mat">
>;
const boardScope: "perPlayer" = board.data.scope;
const boardIdentity: PerPlayerInstanceId<"board", "mat"> = board.data.id;
const spaceIdentity: "slot" = board.data.spaces.slot.id;
// @ts-expect-error Board data preserves the declared topology.
void board.data.spaces.missing;
// @ts-expect-error Projected data is deeply readonly.
board.data.spaces.slot.row = 2;
void [boardScope, boardIdentity, spaceIdentity];

import { createGameInstance } from "./instance.js";
import { boardFeature } from "./features/board.js";
import type { GameSource } from "./model.js";
declare const source: GameSource;
const ui = createGameInstance<typeof game>()({
  source,
  features: (core, context) => ({ board: boardFeature(core, context) }),
});
const semanticSpace = ui.boards
  .get(perPlayerInstanceId("board", "mat", "player-2"))
  .spaces.get("slot");
const semanticId: "slot" = semanticSpace.id;
const ownerId: PerPlayerInstanceId<"board", "mat"> = semanticSpace.board.id;
const row: number = semanticSpace.data.row;
semanticSpace.board.game.boards
  .get(perPlayerInstanceId("board", "mat", "player-2"))
  .spaces.get("slot");
semanticSpace.getSelectHandler({
  interaction: "play.choose",
  input: "space",
})();
const scopedSpaces = ui.boards.get(
  perPlayerInstanceId("board", "mat", "player-2"),
).spaces;
// @ts-expect-error A board-scoped lookup rejects an unknown space.
scopedSpaces.get("missing");
// @ts-expect-error Space selection retains interaction identity.
semanticSpace.getSelectHandler({ interaction: "play.missing" });
void [semanticId, ownerId, row];
