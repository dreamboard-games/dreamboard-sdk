import { z } from "zod";
import { createGame } from "./game";
import { boardInput, boardTarget } from "../inputs";
import type { CollectorState, CollectorValueOf } from "../model/spec";
import { createTableQueries } from "../table-queries";

const game = createGame({
  manifest: {
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    zones: [],
    boards: [
      {
        id: "mat",
        name: "Mat",
        layout: "generic",
        scope: "perPlayer",
        spaces: [{ id: "slot" }],
      },
      {
        id: "market",
        name: "Market",
        layout: "generic",
        scope: "shared",
        spaces: [{ id: "supply" }],
      },
    ],
    pieceTypes: [{ id: "worker", name: "Worker", slots: [{ id: "pocket" }] }],
    pieceSeeds: [{ id: "pawn", typeId: "worker" }],
    dieTypes: [
      { id: "combat", name: "Combat", sides: 6, slots: [{ id: "face" }] },
    ],
    dieSeeds: [{ id: "battle", typeId: "combat" }],
  },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const phase = game.phase("play");
const space = phase.inputs.board.space({ boardId: "market" });
const supply: CollectorValueOf<typeof space> = "supply";
// @ts-expect-error Space IDs belong to the selected board.
const wrongSpace: CollectorValueOf<typeof space> = "slot";
const playerSpace = phase.inputs.board.playerSpace({ boardId: "mat" });
const target: CollectorValueOf<typeof playerSpace> = {
  boardId: "mat",
  playerId: game.contract.manifest.ids.playerId.parse("player-2"),
  spaceId: "slot",
};
// @ts-expect-error Shared boards cannot be selected by player-space input.
phase.inputs.board.playerSpace({ boardId: "market" });
// @ts-expect-error Unknown boards are rejected.
phase.inputs.board.space({ boardId: "missing" });
// @ts-expect-error Generic boards do not have tiled vertices.
phase.inputs.board.vertex({ boardId: "market" });
// @ts-expect-error Card source zones come from the manifest.
phase.inputs.card({ from: ["missing"] });
const edge = boardTarget.edge<CollectorState, "e1">("map").build();
// @ts-expect-error A space collector cannot consume an edge rule.
boardInput.space({ target: edge });
const tuple = boardTarget
  .playerSpace<CollectorState, "mat", "slot">("mat")
  .build();
// @ts-expect-error Scalar space collectors cannot consume player-space tuples.
boardInput.space({ target: tuple });
const q = createTableQueries(game.contract.manifest.createInitialTable());
q.slot.occupants({ kind: "piece", id: "pawn" }, "pocket");
q.slot.dieOccupants("battle", "face");
// @ts-expect-error Die IDs cannot be passed as piece hosts.
q.slot.pieceOccupants("battle", "face");
// @ts-expect-error Slot IDs belong to the selected host.
q.slot.occupants({ kind: "piece", id: "pawn" }, "face");
// @ts-expect-error Unknown components cannot be moved.
const missingComponent: Parameters<typeof q.component.data>[0] = "missing";
void [space, playerSpace, supply, wrongSpace, target, missingComponent];
