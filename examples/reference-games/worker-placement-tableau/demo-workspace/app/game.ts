import {
  defineGame,
  type ReducerGameDefinition,
} from "@dreamboard-games/sdk/reducer";
import {
  records,
  type CardId,
  type SpaceId,
} from "../shared/manifest-contract";
import { boardStatic } from "./board-static";
import { gameContract, type GameContract, type ItemId } from "./game-contract";
import { phases } from "./phases";
import setupProfiles from "./setup-profiles";
import { playerView } from "./player-view";

const views = {
  player: playerView,
};

const game: ReducerGameDefinition<GameContract, typeof phases, typeof views> =
  defineGame({
    contract: gameContract,
    initial: {
      public: ({ playerIds }) => {
        // Per-player initial counters.
        const apprenticeRosterSize: Record<string, number> = {};
        const pendingApprenticeBuysByPlayer: Record<string, number> = {};
        const playedPersistentApprentices: Record<string, CardId[]> = {};
        const playerVP: Record<string, number> = {};
        const matOccupancyByPlayer: Record<
          (typeof playerIds)[number],
          Partial<Record<SpaceId, ItemId>>
        > = {} as Record<
          (typeof playerIds)[number],
          Partial<Record<SpaceId, ItemId>>
        >;
        for (const pid of playerIds) {
          apprenticeRosterSize[pid] = 2;
          pendingApprenticeBuysByPlayer[pid] = 0;
          playedPersistentApprentices[pid] = [];
          playerVP[pid] = 0;
          matOccupancyByPlayer[pid] = {};
        }
        return {
          enabledActionSpaces: [],
          setupVariablePoolDraw: [],
          // Every authored piece starts unplaced. Setup attaches initial
          // workers; the rest stay null until Training Hall promotes them.
          workerLocations: records.pieceIds(() => null),
          apprenticeRosterSize,
          pendingApprenticeBuysByPlayer,
          matOccupancyByPlayer,
          playedPersistentApprentices,
          wakeUpSelections: {},
          seasonNumber: 1,
          turnOrderThisSeason: [...playerIds],
          playerVP,
          winnerPlayerId: null,
        };
      },
      private: () => ({}),
      hidden: () => ({}),
    },
    initialPhase: "setup",
    setupProfiles,
    phases,
    views,
    staticView: boardStatic,
  });

export default game;
