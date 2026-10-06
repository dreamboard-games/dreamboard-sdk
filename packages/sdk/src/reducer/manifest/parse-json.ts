import type { GameTopologyManifest } from "../../shared/domain/manifest";
import { GameTopologyManifestSchema } from "../../shared/domain/manifest-schema.js";
import { assertValidManifest } from "./manifest-validation";

/** Admit an external JSON document using the SDK's structural and semantic contract. */
export function parseTopologyManifestJson(
  value: unknown,
): GameTopologyManifest {
  const result = GameTopologyManifestSchema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `Invalid topology manifest:\n${result.error.issues
        .map((issue) => {
          const path = issue.path
            .map((segment) =>
              typeof segment === "number"
                ? `[${segment}]`
                : `.${String(segment)}`,
            )
            .join("");
          return `manifest${path}: ${issue.message}`;
        })
        .join("\n")}`,
    );
  }
  const manifest = result.data;
  assertValidManifest(manifest);
  return manifest;
}
