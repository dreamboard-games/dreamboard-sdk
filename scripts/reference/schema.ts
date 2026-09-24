import { z } from "zod";

export const REFERENCE_GAME_MANIFEST_SCHEMA_VERSION = 5;

const referenceGameIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

const referenceGamePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      value
        .split("/")
        .every(
          (segment) =>
            segment.length > 0 &&
            segment !== "." &&
            segment !== ".." &&
            /^[A-Za-z0-9._-]+$/.test(segment),
        ),
    { message: "path must stay inside the reference game workspace" },
  );

const referenceGameWorkspaceSchema = z
  .object({
    manifest: referenceGamePathSchema,
    reducer: referenceGamePathSchema,
    ui: referenceGamePathSchema,
  })
  .strict();

const referenceGameTeachingSchema = z
  .object({
    whatThisTeaches: z.array(z.string().min(1)).min(1),
    whenToCopyThisPattern: z.array(z.string().min(1)).min(1),
    readFirst: z.array(referenceGamePathSchema).min(1),
  })
  .strict();

const referenceGameRightsSchema = z
  .object({
    mechanicsProvenance: z.string().min(1),
    sourceCode: z.string().min(1),
    codeLicense: z.string().min(1),
    ruleText: z.string().min(1),
    thirdPartyMarks: z.array(z.string()),
  })
  .strict();

export const referenceGameManifestSchema = z
  .object({
    schemaVersion: z.literal(REFERENCE_GAME_MANIFEST_SCHEMA_VERSION),
    id: referenceGameIdSchema,
    displayName: z.string().min(1),
    workspace: referenceGameWorkspaceSchema,
    teaching: referenceGameTeachingSchema,
    mechanics: z.array(z.string().min(1)).min(1),
    uiPatterns: z.array(z.string().min(1)).min(1),
    rights: referenceGameRightsSchema,
  })
  .strict();

export type ReferenceGameManifest = z.infer<typeof referenceGameManifestSchema>;

export function parseReferenceGameManifest(
  value: unknown,
): ReferenceGameManifest {
  return referenceGameManifestSchema.parse(value);
}
