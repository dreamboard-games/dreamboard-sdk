import type {
  GameMe,
  GamePlayers,
  GameTurn,
  GameView,
  PhaseName,
} from "../shared/generated/ui-contract";
import type { LanternMarketSurfaces } from "./surfaces";

export type { LanternMarketSurfaces } from "./surfaces";

export type LanternMarketSurfaceProps = {
  view: GameView;
  players: GamePlayers;
  turn: GameTurn;
  me: GameMe;
  phase: PhaseName | null;
};

export type LanternMarketLayoutProps = LanternMarketSurfaceProps &
  LanternMarketSurfaces;
