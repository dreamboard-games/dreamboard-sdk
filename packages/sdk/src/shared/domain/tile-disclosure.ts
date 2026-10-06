import * as z from "zod";
import { MAXIMUM_BOARD_COORDINATE } from "./board-coordinates.js";
import { PlayerIdSchema } from "./player-identity.js";

const coordinate = z
  .int()
  .min(-MAXIMUM_BOARD_COORDINATE)
  .max(MAXIMUM_BOARD_COORDINATE);
const backImage = z
  .string()
  .regex(
    /^assets\/(?:[\w-][\w.-]*\/)*[\w-][\w.-]*\.(?:avif|gif|jpe?g|png|svg|webp)$/i,
    { error: "Tile back image must be an image path under assets/." },
  );
export const PublicTileAppearanceSchema = z
  .discriminatedUnion("layout", [
    z.strictObject({
      layout: z.literal("hex"),
      cells: z
        .array(z.strictObject({ q: coordinate, r: coordinate }))
        .nonempty(),
      backImage: backImage.optional(),
    }),
    z.strictObject({
      layout: z.literal("square"),
      cells: z
        .array(z.strictObject({ col: coordinate, row: coordinate }))
        .nonempty(),
      backImage: backImage.optional(),
    }),
  ])
  .superRefine((appearance, ctx) => {
    const seen = new Set<string>();
    for (const [index, cell] of appearance.cells.entries()) {
      const key =
        "q" in cell ? `${cell.q},${cell.r}` : `${cell.col},${cell.row}`;
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["cells", index],
          message: "Public footprint coordinates must be unique.",
        });
      seen.add(key);
    }
  });
const publicFace = z.strictObject({ audience: z.literal("public") });
const ownerFace = z.strictObject({ audience: z.literal("owner") });
const noFace = z.strictObject({ audience: z.literal("none") });
export const AuthoredTileFaceAudienceSchema = z.discriminatedUnion("audience", [
  publicFace,
  ownerFace,
  noFace,
]);
export const TileFaceAudienceSchema = z.discriminatedUnion("audience", [
  publicFace,
  ownerFace,
  noFace,
  z
    .strictObject({
      audience: z.literal("seats"),
      playerIds: z.array(PlayerIdSchema).nonempty(),
    })
    .superRefine((face, ctx) => {
      if (new Set(face.playerIds).size !== face.playerIds.length)
        ctx.addIssue({
          code: "custom",
          path: ["playerIds"],
          message: "Face audience seats must be unique.",
        });
    }),
]);
export const AuthoredTileDisclosureSchema = z.strictObject({
  face: AuthoredTileFaceAudienceSchema,
  appearance: PublicTileAppearanceSchema.optional(),
});
export const TileDisclosureSchema = z.strictObject({
  face: TileFaceAudienceSchema,
  appearance: PublicTileAppearanceSchema.optional(),
});
export type PublicTileAppearance = z.infer<typeof PublicTileAppearanceSchema>;
export type TileFaceAudience = z.infer<typeof TileFaceAudienceSchema>;
export type AuthoredTileFaceAudience = z.infer<
  typeof AuthoredTileFaceAudienceSchema
>;
export type TileDisclosure = z.infer<typeof TileDisclosureSchema>;
export type AuthoredTileDisclosure = z.infer<
  typeof AuthoredTileDisclosureSchema
>;
