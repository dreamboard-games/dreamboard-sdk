import game from "../app/game";
import {
  createGameUi,
  type GameUiManifestOf,
  type GameUiRootStateOf,
  type GameUiHandSurface,
  type GameUiPhaseName,
  type GameUiView,
  type GameUiInteractionRoutes,
  type GameUiBoardSurface,
} from "@dreamboard-games/sdk/runtime/workspace-contract";
const contract = createGameUi(game);
export const { UI, uiContract } = contract;
export const {
  Board,
  Zone,
  Game,
  Interaction,
  PlayerRoster,
  Dice,
  Phase,
  ResourceCounter,
} = UI;
export type PhaseName = GameUiPhaseName<typeof game>;
export type GameRootState = GameUiRootStateOf<typeof game>;
export type HandSurface<
  Zones extends readonly GameUiManifestOf<typeof game>["ZoneId"][] =
    readonly GameUiManifestOf<typeof game>["ZoneId"][],
> = GameUiHandSurface<GameUiManifestOf<typeof game>, Zones>;
export type BoardSurface<
  Board extends GameUiManifestOf<typeof game>["BoardBaseId"] = GameUiManifestOf<
    typeof game
  >["BoardBaseId"],
> = GameUiBoardSurface<GameUiManifestOf<typeof game>, Board>;
export type GameView = GameUiView<typeof game>;
export type InteractionRoutes = GameUiInteractionRoutes<typeof game>;
declare module "@dreamboard-games/sdk/runtime" {
  interface DreamboardUIRegister {
    contract: typeof game;
    ui: typeof uiContract;
  }
}
