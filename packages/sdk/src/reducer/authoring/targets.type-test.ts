import { compileManifest } from "../manifest/compiler.js";
import { perPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import { z } from "zod";
import { createGame } from "./game";
import { boardInput, boardTarget } from "../inputs";
import type { CollectorState, CollectorValueOf } from "../model/spec";
import { createTableQueries } from "../table-queries";

const game = createGame({
  manifest: compileManifest({
    players: { minPlayers: 1, maxPlayers: 2 },
    cardSets: [],
    zones: [
      {
        id: "pocket",
        name: "Pocket",
        attachedTo: { pieceType: "worker" },
        visibility: "public",
      },
      {
        id: "face",
        name: "Face",
        attachedTo: { dieType: "combat" },
        visibility: "public",
      },
    ],
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
    pieceTypes: [{ id: "worker", name: "Worker" }],
    pieceSeeds: [{ id: "pawn", typeId: "worker" }],
    dieTypes: [{ id: "combat", name: "Combat", sides: 6 }],
    dieSeeds: [{ id: "battle", typeId: "combat" }],
  }),
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
  boardId: perPlayerInstanceId("board", "mat", "player-2"),
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
const q = createTableQueries(
  game.contract.manifest.createInitialTable({
    playerIds: ["player-1", "player-2"],
  }),
  game.contract.manifest,
);
q.zone("pocket", "pawn");
q.zone("face", "battle");
// @ts-expect-error Die IDs cannot be passed as piece-attached zone hosts.
q.zone("pocket", "battle");
// @ts-expect-error Host IDs belong to the selected attachment.
q.zone("face", "pawn");
// @ts-expect-error Unknown components cannot be moved.
const missingComponent: Parameters<typeof q.component.data>[0] = "missing";
void [space, playerSpace, supply, wrongSpace, target, missingComponent];
