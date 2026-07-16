import { describe, expect, test } from "bun:test";
import {
  WORKSPACE_CODEGEN_OWNERSHIP,
  WORKSPACE_OWNERSHIP_VERSION,
  isAllowedGamePath,
  isAuthoritativeGeneratedPath,
  isCliStaticPath,
  isDynamicSeedPath,
  isLibraryPath,
  normalizeOwnedProjectPath,
} from "./ownership.js";

describe("workspace ownership path classification", () => {
  test("normalizes valid nested project paths without stripping ownership boundaries", () => {
    expect(normalizeOwnedProjectPath("app/phases/setup.ts")).toBe(
      "app/phases/setup.ts",
    );
    expect(normalizeOwnedProjectPath("ui\\components\\Panel.tsx")).toBe(
      "ui/components/Panel.tsx",
    );
  });

  test("rejects unsafe project path forms on every platform", () => {
    const unsafePaths = [
      "../escape.ts",
      "src/../../escape.ts",
      "/tmp/escape.ts",
      "C:\\temp\\escape.ts",
      "C:/temp/escape.ts",
      "\\\\server\\share\\escape.ts",
      "//server/share/escape.ts",
      "./src/index.ts",
      "src//index.ts",
      "src/./index.ts",
      "src/\0index.ts",
    ];

    for (const unsafePath of unsafePaths) {
      expect(normalizeOwnedProjectPath(unsafePath)).toBeNull();
      expect(isAllowedGamePath(unsafePath)).toBe(false);
      expect(isAuthoritativeGeneratedPath(unsafePath)).toBe(false);
      expect(isDynamicSeedPath(unsafePath)).toBe(false);
      expect(isCliStaticPath(unsafePath)).toBe(false);
      expect(isLibraryPath(unsafePath)).toBe(false);
    }
  });

  test("fails closed without changing valid ownership decisions", () => {
    expect(isAllowedGamePath("app/game.ts")).toBe(true);
    expect(isAllowedGamePath("manifest.ts")).toBe(true);
    expect(isAuthoritativeGeneratedPath("shared/manifest-types.ts")).toBe(true);
    expect(isDynamicSeedPath("app/phases/main.ts")).toBe(true);
    expect(isCliStaticPath("ui/index.tsx")).toBe(true);
    expect(isLibraryPath("shared/manifest-runtime.ts")).toBe(true);
  });

  test("publishes ownership contract version 32", () => {
    expect(WORKSPACE_CODEGEN_OWNERSHIP.version).toBe(32);
    expect(WORKSPACE_OWNERSHIP_VERSION).toBe(32);
  });
});
