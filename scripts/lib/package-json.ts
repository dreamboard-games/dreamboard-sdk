import { z } from "zod";
import { readJson } from "./files.ts";

const packageExportTargetSchema = z.union([
  z.string(),
  z.looseObject({
    types: z.string().optional(),
    import: z.string().optional(),
    default: z.string().optional(),
  }),
]);
const dependencyMapSchema = z.record(z.string(), z.string());

/** Validate fields consumed by repository tooling; retain other npm metadata on rewrite. */
export const packageJsonSchema = z.looseObject({
  name: z.string().optional(),
  version: z.string().optional(),
  private: z.boolean().optional(),
  packageManager: z.string().optional(),
  scripts: dependencyMapSchema.optional(),
  publishConfig: z.looseObject({ access: z.string().optional() }).optional(),
  files: z.array(z.string()).optional(),
  exports: z.record(z.string(), packageExportTargetSchema).optional(),
  dependencies: dependencyMapSchema.optional(),
  devDependencies: dependencyMapSchema.optional(),
  peerDependencies: dependencyMapSchema.optional(),
  optionalDependencies: dependencyMapSchema.optional(),
});
export type PackageJson = z.infer<typeof packageJsonSchema>;
export type PackageExportTarget = z.infer<typeof packageExportTargetSchema>;

export async function readPackageJson(filePath: string): Promise<PackageJson> {
  return packageJsonSchema.parse(await readJson(filePath));
}
