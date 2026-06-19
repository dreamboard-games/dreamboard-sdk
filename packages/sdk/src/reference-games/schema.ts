import { z } from "zod";

import { computeReferenceGameSourceDigest } from "./canonical.js";

export const REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION = 1;

export const referenceGameSha256DigestSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/);

export const referenceGameSourceObjectSchema = z
  .object({
    path: z.string().min(1),
    sha256: referenceGameSha256DigestSchema,
    byteLength: z.number().int().nonnegative(),
  })
  .strict();

export const referenceGameSourceEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    root: z.string().regex(/^examples\/reference-games\/[a-z0-9-]+$/),
    sourceSha256: referenceGameSha256DigestSchema,
    packageJsonSha256: referenceGameSha256DigestSchema,
    lockfileSha256: referenceGameSha256DigestSchema,
    sdkSpecifier: z.string().min(1),
    manifest: z.string().min(1),
    reducer: z.string().min(1),
    ui: z.string().min(1),
    behaviorScenarios: z.array(z.string().min(1)).min(1),
    uiScenarios: z.array(z.string().min(1)).min(1),
    mechanics: z.array(z.string().min(1)).min(1),
    readFirst: z.array(z.string().min(1)).min(1),
    publishToDemoGallery: z.boolean(),
  })
  .strict();

export const referenceGameSourceManifestPayloadSchema = z
  .object({
    games: z.array(referenceGameSourceEntrySchema).min(1),
    objects: z.array(referenceGameSourceObjectSchema).min(1),
  })
  .strict();

export const referenceGameSourceProvenanceSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("worktree") }).strict(),
    z
      .object({
        kind: z.literal("git"),
        repository: z.literal("dreamboard-games/dreamboard-sdk"),
        revision: z.string().regex(/^[a-f0-9]{40}$/),
      })
      .strict(),
  ],
);

export const referenceGameSourceManifestSchema = z
  .object({
    schemaVersion: z.literal(REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION),
    manifestType: z.literal("dreamboard.reference-game-source"),
    bundleDigest: referenceGameSha256DigestSchema,
    payload: referenceGameSourceManifestPayloadSchema,
    provenance: referenceGameSourceProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const digest = computeReferenceGameSourceDigest(value.payload);
    if (value.bundleDigest !== digest) {
      context.addIssue({
        code: "custom",
        path: ["bundleDigest"],
        message: "bundleDigest must match the canonical payload digest",
      });
    }
  });

export type ReferenceGameSourceObject = z.infer<
  typeof referenceGameSourceObjectSchema
>;
export type ReferenceGameSourceEntry = z.infer<
  typeof referenceGameSourceEntrySchema
>;
export type ReferenceGameSourceManifestPayload = z.infer<
  typeof referenceGameSourceManifestPayloadSchema
>;
export type ReferenceGameSourceProvenance = z.infer<
  typeof referenceGameSourceProvenanceSchema
>;
export type ReferenceGameSourceManifest = z.infer<
  typeof referenceGameSourceManifestSchema
>;

export function parseReferenceGameSourceManifest(
  value: unknown,
): ReferenceGameSourceManifest {
  return referenceGameSourceManifestSchema.parse(value);
}
