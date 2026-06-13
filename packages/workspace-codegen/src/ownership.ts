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
  version: 29,
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

function normalizeProjectPath(filePath: string): string {
  return filePath.replace(/^\.\//, "").replace(/^\/+/, "").replace(/\\/g, "/");
}

export function isAllowedGamePath(filePath: string): boolean {
  const path = normalizeProjectPath(filePath);
  if (WORKSPACE_CODEGEN_OWNERSHIP.allowedPaths.rootFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.allowedPaths.directoryPrefixes.some(
    (prefix) => path.startsWith(prefix),
  );
}

export function isAuthoritativeGeneratedPath(filePath: string): boolean {
  const path = normalizeProjectPath(filePath);
  return WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles.includes(path);
}

export function isDynamicSeedPath(filePath: string): boolean {
  const path = normalizeProjectPath(filePath);
  if (WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.dynamic.seedFilePatterns.some(
    (pattern) =>
      path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix),
  );
}

export function isCliStaticPath(filePath: string): boolean {
  const path = normalizeProjectPath(filePath);
  if (WORKSPACE_CODEGEN_OWNERSHIP.cliStatic.exactFiles.includes(path)) {
    return true;
  }
  return WORKSPACE_CODEGEN_OWNERSHIP.cliStatic.directoryPrefixes.some(
    (prefix) => path.startsWith(prefix),
  );
}

export function isLibraryPath(filePath: string): boolean {
  const path = normalizeProjectPath(filePath);
  return isAuthoritativeGeneratedPath(path);
}
