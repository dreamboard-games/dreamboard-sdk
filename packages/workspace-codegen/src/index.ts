import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import {
  generateManifestContractSources,
  materializeManifestTable,
} from "./manifest-contract.js";
import { validateManifestAuthoring } from "./manifest-validation.js";
import {
  AUTHORITATIVE_GENERATED_FILES,
  isAllowedGamePath,
  isAuthoritativeGeneratedPath,
  isCliStaticPath,
  isDynamicSeedPath,
  isLibraryPath,
  PRESERVED_USER_FILES,
  SEED_FILES,
  SEED_FILE_PATTERNS,
  WORKSPACE_CODEGEN_OWNERSHIP,
} from "./ownership.js";
import {
  generateFrameworkFiles,
  generateSeedFiles,
  isFrameworkOwnedSetupProfilesSeed,
  SETUP_PROFILES_SEED_MARKER,
} from "./seeds.js";
export {
  materializeCardSet,
  materializePresetCardSet,
} from "./preset-card-sets.js";
export { materializeManifestTable };

export {
  AUTHORITATIVE_GENERATED_FILES,
  isAllowedGamePath,
  isAuthoritativeGeneratedPath,
  isCliStaticPath,
  isDynamicSeedPath,
  isLibraryPath,
  PRESERVED_USER_FILES,
  SEED_FILES,
  SEED_FILE_PATTERNS,
  WORKSPACE_CODEGEN_OWNERSHIP,
};

export function generateAuthoritativeFiles(
  manifest: GameTopologyManifest,
): Record<string, string> {
  return {
    ...generateManifestContractSources(manifest),
    ...generateFrameworkFiles(manifest),
  };
}

export { generateSeedFiles };
export { isFrameworkOwnedSetupProfilesSeed, SETUP_PROFILES_SEED_MARKER };
export { validateManifestAuthoring };

export function generateDynamicGeneratedFiles(
  manifest: GameTopologyManifest,
): Record<string, string> {
  return {
    ...generateAuthoritativeFiles(manifest),
    ...generateSeedFiles(manifest),
  };
}
