import type {
  GamePlayers,
  GameTurn,
  GameView,
  PhaseName,
} from "../shared/generated/ui-contract.ts";
import type { SketchbookSurfaces } from "./surfaces";

export type { SketchbookSurfaces } from "./surfaces";

export type SketchbookSurfaceProps = {
  view: GameView;
  players: GamePlayers;
  turn: Pick<GameTurn, "isMine" | "currentPlayerId" | "order">;
  phase: PhaseName;
};

export type SketchbookLayoutProps = SketchbookSurfaceProps & SketchbookSurfaces;
