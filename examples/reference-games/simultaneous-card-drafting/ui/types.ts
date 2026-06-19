import type {
  GamePlayers,
  GameTurn,
  GameView,
  PhaseName,
} from "../shared/generated/ui-contract.ts";
import type { PlayerId } from "../shared/manifest-contract";
import type { SushiGoSurfaces } from "./surfaces";

export type { SushiGoSurfaces } from "./surfaces";

export type SushiGoSurfaceProps = {
  view: GameView;
  players: GamePlayers;
  turn: Pick<GameTurn, "isMine" | "currentPlayerId" | "order">;
  me: { playerId: PlayerId };
  phase: PhaseName;
};

export type SushiGoLayoutProps = SushiGoSurfaceProps & SushiGoSurfaces;
