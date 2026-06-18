import type {
  GameMe,
  GamePlayers,
  GameTurn,
  GameView,
  PhaseName,
} from "#dreamboard/ui-contract";
import type { ArtisansSurfaces } from "./surfaces";
import type { PlayerId } from "../shared/manifest-contract";

export type { ArtisansSurfaces } from "./surfaces";

export type ArtisansSurfaceProps = {
  view: GameView;
  players: GamePlayers;
  me: Pick<GameMe, "playerId"> & { playerId: PlayerId };
  turn: Pick<GameTurn, "isMine" | "currentPlayerId" | "order">;
  phase: PhaseName;
};

export type ArtisansLayoutProps = ArtisansSurfaceProps & ArtisansSurfaces;
