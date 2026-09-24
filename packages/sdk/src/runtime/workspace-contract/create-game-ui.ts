import type { z } from "zod";
import type {
  ReducerGameContractLike,
  RuntimeCardData,
} from "../../reducer/model";
import {
  createGameUiContract,
  type GameUiGameRootState,
  type GameUiHandSurface,
} from "./game-ui-contract";

type GameWithManifest = { contract: ReducerGameContractLike };
type ManifestOf<G extends GameWithManifest> = G["contract"]["manifest"];
type Id<
  G extends GameWithManifest,
  K extends keyof ManifestOf<G>["ids"],
> = z.output<ManifestOf<G>["ids"][K]> & string;
type Table<G extends GameWithManifest> = z.output<ManifestOf<G>["tableSchema"]>;
type CardZone<
  G extends GameWithManifest,
  Scope extends "shared" | "perPlayer",
> = keyof ManifestOf<G>["literals"][Scope extends "shared"
  ? "cardSetIdsBySharedZoneId"
  : "cardSetIdsByPlayerZoneId"] &
  string;
export type GameUiManifestOf<G extends GameWithManifest> = {
  PlayerId: Id<G, "playerId">;
  ResourceId: Id<G, "resourceId">;
  ZoneId: Id<G, "zoneId">;
  CardId: Id<G, "cardId">;
  CardType: Id<G, "cardType">;
  CardProperties: Table<G>["cards"][keyof Table<G>["cards"]] extends RuntimeCardData
    ? Table<G>["cards"][keyof Table<G>["cards"]]["properties"]
    : Record<string, unknown>;
  BoardBaseId: Id<G, "boardBaseId">;
  SpaceId: Id<G, "spaceId">;
  EdgeId: Id<G, "edgeId">;
  VertexId: Id<G, "vertexId">;
  PlayerCardZoneId: CardZone<G, "perPlayer">;
  CardZoneId: CardZone<G, "shared"> | CardZone<G, "perPlayer">;
};
export type GameUiRootStateOf<G extends GameWithManifest> = GameUiGameRootState<
  G,
  GameUiManifestOf<G>
>;
export type GameUiHandSurfaceOf<G extends GameWithManifest> = GameUiHandSurface<
  GameUiManifestOf<G>
>;
/** Bind UI primitives directly to an authored game's inferred contract. */
export function createGameUi<const G extends GameWithManifest>(game: G) {
  const manifest = game.contract.manifest;
  return createGameUiContract<
    G,
    GameUiManifestOf<G>,
    NonNullable<ManifestOf<G>["staticBoards"]>["hex"],
    NonNullable<ManifestOf<G>["staticBoards"]>["square"]
  >({
    game,
    resourceIds: manifest.literals.resourceIds as readonly Id<
      G,
      "resourceId"
    >[],
    resourcePresentationById: manifest.literals
      .resourcePresentationById as Record<
      string,
      { label: string; icon?: string }
    >,
    hexStaticBoards: (manifest.staticBoards?.hex ?? {}) as NonNullable<
      ManifestOf<G>["staticBoards"]
    >["hex"],
    squareStaticBoards: (manifest.staticBoards?.square ?? {}) as NonNullable<
      ManifestOf<G>["staticBoards"]
    >["square"],
  });
}
