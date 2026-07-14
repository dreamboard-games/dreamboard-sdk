import { z } from "zod";

import { computeReferenceGameSourceFingerprint } from "./canonical.js";

export const REFERENCE_GAME_SOURCE_MANIFEST_SCHEMA_VERSION = 3;
export const REFERENCE_GAME_MANIFEST_SCHEMA_VERSION = 4;

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
  })
  .strict();

export const referenceGameSourceInventoryPolicySchema = z
  .object({
    schemaVersion: z.literal(1),
    workspaceOwnershipVersion: z.number().int().positive(),
    excludedGameRelativePaths: z.array(z.string().min(1)),
    excludedGameRelativePrefixes: z.array(z.string().min(1)),
  })
  .strict();

export const referenceGameSourceManifestPayloadSchema = z
  .object({
    inventoryPolicy: referenceGameSourceInventoryPolicySchema,
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
    sourceFingerprint: referenceGameSha256DigestSchema,
    payload: referenceGameSourceManifestPayloadSchema,
    provenance: referenceGameSourceProvenanceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const fingerprint = computeReferenceGameSourceFingerprint(value.payload);
    if (value.sourceFingerprint !== fingerprint) {
      context.addIssue({
        code: "custom",
        path: ["sourceFingerprint"],
        message:
          "sourceFingerprint must match the canonical authored-object inventory",
      });
    }
  });

const referenceGameIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const referenceGameWorkspacePathSchema = z.string().min(1);
const referenceGameAssetPathSchema = z
  .string()
  .regex(/^assets\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/)
  .refine(
    (value) =>
      value.split("/").every((segment) => segment !== "." && segment !== ".."),
    { message: "asset path must stay inside the game assets directory" },
  );

export const referenceGameWorkspaceSchema = z
  .object({
    manifest: referenceGameWorkspacePathSchema,
    reducer: referenceGameWorkspacePathSchema,
    ui: referenceGameWorkspacePathSchema,
  })
  .strict();

export const referenceGameTeachingSchema = z
  .object({
    whatThisTeaches: z.array(z.string().min(1)).min(1),
    whenToCopyThisPattern: z.array(z.string().min(1)).min(1),
    readFirst: z.array(referenceGameWorkspacePathSchema).min(1),
  })
  .strict();

export const referenceGameDemoReleaseSchema = z
  .object({
    slug: referenceGameIdSchema,
    name: z.string().min(1),
    description: z.string().min(1),
    overview: z.string().min(1),
    creator: z.string().min(1),
    minPlayers: z.number().int().positive(),
    maxPlayers: z.number().int().positive(),
    playTimeMinMinutes: z.number().int().positive(),
    playTimeMaxMinutes: z.number().int().positive(),
    difficulty: z.number().int().min(1).max(5),
    mechanics: z.array(z.string().min(1)).min(1),
    categories: z.array(z.string().min(1)).min(1),
    thumbnailPath: referenceGameAssetPathSchema,
    estimatedMinutes: z.number().int().positive(),
    demoPlayerCount: z.number().int().positive(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.maxPlayers < value.minPlayers) {
      context.addIssue({
        code: "custom",
        path: ["maxPlayers"],
        message: "maxPlayers must be greater than or equal to minPlayers",
      });
    }
    if (value.playTimeMaxMinutes < value.playTimeMinMinutes) {
      context.addIssue({
        code: "custom",
        path: ["playTimeMaxMinutes"],
        message:
          "playTimeMaxMinutes must be greater than or equal to playTimeMinMinutes",
      });
    }
  });

export const referenceGameRightsSchema = z
  .object({
    mechanicsProvenance: z.string().min(1),
    sourceCode: z.string().min(1),
    codeLicense: z.string().min(1),
    ruleText: z.string().min(1),
    artwork: z.string().min(1),
    assetLicenseManifest: z.string().min(1),
    thirdPartyMarks: z.array(z.string()),
    reviewStatus: z.literal("approved"),
    reviewedBy: z.string().min(1),
    reviewedAt: z.string().min(1),
  })
  .strict();

export const referenceGameSdkPolicySchema = z
  .object({
    dependency: z.literal("@dreamboard-games/sdk"),
    versionPolicy: z.literal("exact"),
  })
  .strict();

export const referenceGameManifestV4Schema = z
  .object({
    schemaVersion: z.literal(REFERENCE_GAME_MANIFEST_SCHEMA_VERSION),
    id: referenceGameIdSchema,
    displayName: z.string().min(1),
    workspace: referenceGameWorkspaceSchema,
    teaching: referenceGameTeachingSchema,
    demoRelease: referenceGameDemoReleaseSchema.optional(),
    mechanics: z.array(z.string().min(1)).min(1),
    uiPatterns: z.array(z.string().min(1)).min(1),
    rights: referenceGameRightsSchema,
    sdk: referenceGameSdkPolicySchema,
  })
  .strict();

export type ReferenceGameSourceObject = z.infer<
  typeof referenceGameSourceObjectSchema
>;
export type ReferenceGameSourceEntry = z.infer<
  typeof referenceGameSourceEntrySchema
>;
export type ReferenceGameSourceManifestPayload = z.infer<
  typeof referenceGameSourceManifestPayloadSchema
>;
export type ReferenceGameSourceInventoryPolicy = z.infer<
  typeof referenceGameSourceInventoryPolicySchema
>;
export type ReferenceGameSourceProvenance = z.infer<
  typeof referenceGameSourceProvenanceSchema
>;
export type ReferenceGameSourceManifest = z.infer<
  typeof referenceGameSourceManifestSchema
>;
export type ReferenceGameWorkspace = z.infer<
  typeof referenceGameWorkspaceSchema
>;
export type ReferenceGameTeaching = z.infer<typeof referenceGameTeachingSchema>;
export type ReferenceGameDemoRelease = z.infer<
  typeof referenceGameDemoReleaseSchema
>;
export type ReferenceGameRights = z.infer<typeof referenceGameRightsSchema>;
export type ReferenceGameSdkPolicy = z.infer<
  typeof referenceGameSdkPolicySchema
>;
export type ReferenceGameManifestV4 = z.infer<
  typeof referenceGameManifestV4Schema
>;

export function parseReferenceGameSourceManifest(
  value: unknown,
): ReferenceGameSourceManifest {
  return referenceGameSourceManifestSchema.parse(value);
}

export function parseReferenceGameManifestV4(
  value: unknown,
): ReferenceGameManifestV4 {
  return referenceGameManifestV4Schema.parse(value);
}

export function isPackageableReferenceGame(
  game: ReferenceGameManifestV4,
): boolean {
  return game.demoRelease !== undefined;
}
