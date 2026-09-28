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
  const base: IdOf<typeof game, "boardBaseId"> = drop.value.boardId;
  // @ts-expect-error A base board identity is not a player-specific runtime board.
  const runtime: IdOf<typeof game, "boardId"> = drop.value.boardId;
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
  boardId: "mat" as const,
  spaceId: "slot" as const,
  playerId: model.contract.manifest.ids.playerId.parse("player-2"),
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
  valueKind: "player-board-space",
  value: selectedSpace,
};
const duplicateBoard: SelectionTarget<typeof game> = {
  kind: "space",
  valueKind: "player-board-space",
  value: selectedSpace,
  // @ts-expect-error Tuple targets already own their board identity.
  boardId: "mat:player-1",
};
const tupleEdge: SelectionTarget<typeof game> = {
  kind: "edge",
  // @ts-expect-error Tuple targets are spaces, not edges.
  valueKind: "player-board-space",
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
  boardId: "mat:player-2",
  value: "missing",
};
void [target, duplicateBoard, tupleEdge, noBoard, missingSpace];

import type { BoardBase } from "./model.js";
declare const board: BoardBase<typeof game, "mat:player-2">;
const boardScope: "perPlayer" = board.data.scope;
const boardIdentity: "mat:player-2" = board.data.id;
const spaceIdentity: "slot" = board.data.spaces.slot.id;
// @ts-expect-error Board data preserves the declared topology.
void board.data.spaces.missing;
// @ts-expect-error Projected data is deeply readonly.
board.data.spaces.slot.row = 2;
void [boardScope, boardIdentity, spaceIdentity];
