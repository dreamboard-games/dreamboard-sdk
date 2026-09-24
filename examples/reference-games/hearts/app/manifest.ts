import { compileManifest } from "@dreamboard-games/sdk/reducer";
import type { z } from "zod";
import manifest from "../manifest";
export const manifestContract = compileManifest(manifest);
export const { ids, literals, staticBoards } = manifestContract;
export type { PlayerId } from "@dreamboard-games/sdk/reducer";
export type CardId = z.infer<typeof ids.cardId>;
export type CardType = z.infer<typeof ids.cardType>;
export type PieceId = z.infer<typeof ids.pieceId>;
export type ResourceId = z.infer<typeof ids.resourceId>;
export type SpaceId = z.infer<typeof ids.spaceId>;
export type EdgeId = z.infer<typeof ids.edgeId>;
export type VertexId = z.infer<typeof ids.vertexId>;
export type PlayingCardsCardProperties = ReturnType<
  typeof manifestContract.createInitialTable
>["cards"][CardId]["properties"];
