export type OwnershipPattern = {
  prefix: string;
  suffix: string;
};

export type ScaffoldingOwnership = {
  version: number;
  allowedPaths: {
    rootFiles: string[];
    directoryPrefixes: string[];
  };
  dynamic: {
    generatedFiles: string[];
    seedFiles: string[];
    seedFilePatterns: OwnershipPattern[];
  };
  cliStatic: {
    exactFiles: string[];
    directoryPrefixes: string[];
  };
  preservedUserFiles: string[];
};

export const WORKSPACE_CODEGEN_OWNERSHIP: ScaffoldingOwnership = {
  version: 32,
  allowedPaths: {
    rootFiles: [
      ".npmrc",
      "package.json",
      "pnpm-lock.yaml",
      "package-lock.json",
      "manifest.ts",
      "manifest.tsconfig.json",
      "rule.md",
    ],
    directoryPrefixes: ["app/", "manifest/", "ui/", "shared/", "test/"],
  },
  dynamic: {
    generatedFiles: [
      "shared/manifest-literals.ts",
      "shared/manifest-types.ts",
      "shared/manifest-static.json",
      "shared/manifest-runtime.ts",
      "shared/manifest-contract.ts",
      "shared/generated/ui-contract.ts",
      "app/index.ts",
      "app/tsconfig.framework.json",
      "ui/tsconfig.framework.json",
    ],
    seedFiles: [
      "app/README.md",
      "ui/App.tsx",
      "app/game-contract.ts",
      "app/authoring.ts",
      "app/game.ts",
      "app/setup-profiles.ts",
      "app/reducer-support.ts",
      "app/derived.ts",
      "ui/interaction-routes.tsx",
      "ui/setup-screen.tsx",
      "ui/styles.ts",
      "ui/ui-contract-typing-smoke.tsx",
    ],
    seedFilePatterns: [{ prefix: "app/phases/", suffix: ".ts" }],
  },
  cliStatic: {
    exactFiles: [
      ".npmrc",
      "package.json",
      "app/tsconfig.json",
      "ui/index.tsx",
      "ui/package.json",
      "ui/style.css",
      "ui/tsconfig.json",
    ],
    directoryPrefixes: [],
  },
  preservedUserFiles: [],
} as const;

export const AUTHORITATIVE_GENERATED_FILES =
  WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles;
export const SEED_FILES = WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFiles;
export const SEED_FILE_PATTERNS =
  WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFilePatterns;
export const PRESERVED_USER_FILES = new Set(
  WORKSPACE_CODEGEN_OWNERSHIP.preservedUserFiles,
);

const WINDOWS_DRIVE_PATH = /^[A-Za-z]:[\\/]/;
const WINDOWS_UNC_PATH = /^(?:\\\\|\/\/)/;

export const WORKSPACE_OWNERSHIP_VERSION = WORKSPACE_CODEGEN_OWNERSHIP.version;

export function normalizeOwnedProjectPath(input: string): string | null {
  if (
    input.length === 0 ||
    input.includes("\0") ||
    input.startsWith("/") ||
    WINDOWS_DRIVE_PATH.test(input) ||
    WINDOWS_UNC_PATH.test(input)
  ) {
    return null;
  }

  const normalized = input.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  return segments.join("/");
}

export function isAllowedGamePath(filePath: string): boolean {
  const path = normalizeOwnedProjectPath(filePath);
  if (path === null) return false;
  if (WORKSPACE_CODEGEN_OWNERSHIP.allowedPaths.rootFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.allowedPaths.directoryPrefixes.some(
    (prefix) => path.startsWith(prefix),
  );
}

export function isAuthoritativeGeneratedPath(filePath: string): boolean {
  const path = normalizeOwnedProjectPath(filePath);
  if (path === null) return false;
  return WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles.includes(path);
}

export function isDynamicSeedPath(filePath: string): boolean {
  const path = normalizeOwnedProjectPath(filePath);
  if (path === null) return false;
  if (WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFilePatterns.some(
    (pattern) =>
      path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix),
  );
}

export function isCliStaticPath(filePath: string): boolean {
  const path = normalizeOwnedProjectPath(filePath);
  if (path === null) return false;
  if (WORKSPACE_CODEGEN_OWNERSHIP.cliStatic.exactFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.cliStatic.directoryPrefixes.some(
    (prefix) => path.startsWith(prefix),
  );
}

export function isLibraryPath(filePath: string): boolean {
  const path = normalizeOwnedProjectPath(filePath);
  if (path === null) return false;
  return isAuthoritativeGeneratedPath(path);
}
