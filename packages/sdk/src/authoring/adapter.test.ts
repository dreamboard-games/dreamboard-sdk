import { describe, expect, test } from "bun:test";
import {
  diagnosticCodesForValidationErrors,
  projectAuthoringAdapter,
  sha256,
  stableJson,
} from "./adapter.js";

const REQUIRED_CASE_IDS = [
  "manual-default-detached",
  "manual-default-shared-zone",
  "preset-default-shared-zone",
  "manual-per-card-detached-override",
  "manual-per-card-shared-zone-override",
  "manual-compatible-zones-no-inference",
  "manual-per-player-zone-rejected",
  "manual-space-home",
  "manual-container-home",
  "manual-slot-home",
  "manual-edge-home",
  "manual-vertex-home",
  "manual-invalid-target-id",
  "manual-count-order",
  "manual-generated-scenario-base",
  "manual-default-required",
] as const;

function conformanceCase(id: (typeof REQUIRED_CASE_IDS)[number]) {
  const found = projectAuthoringAdapter.manifestConformanceCases.find(
    (entry) => entry.id === id,
  );
  if (!found) {
    throw new Error(`Missing conformance case '${id}'.`);
  }
  return found;
}

function isDeepFrozen(value: unknown): boolean {
  if (!value || typeof value !== "object" || !Object.isFrozen(value)) {
    return false;
  }
  return Object.values(value).every(
    (entry) => !entry || typeof entry !== "object" || isDeepFrozen(entry),
  );
}

function pathIsDeclared(path: string): boolean {
  return (
    projectAuthoringAdapter.generatedPaths.includes(path) ||
    projectAuthoringAdapter.generatedPathPatterns.some(
      (pattern) =>
        path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix),
    )
  );
}

describe("projectAuthoringAdapter conformance", () => {
  test("publishes the complete immutable fixture matrix", () => {
    expect(
      projectAuthoringAdapter.manifestConformanceCases.map((entry) => entry.id),
    ).toEqual(REQUIRED_CASE_IDS);
    expect(isDeepFrozen(projectAuthoringAdapter.manifestConformanceCases)).toBe(
      true,
    );
  });

  for (const id of REQUIRED_CASE_IDS) {
    test(`${id} matches its hard-coded semantic expectation`, () => {
      const fixture = conformanceCase(id);
      const validation = projectAuthoringAdapter.validateManifest(
        fixture.manifest,
      );
      expect(validation.valid).toBe(fixture.expected.valid);

      if (fixture.expected.valid) {
        const materialized = projectAuthoringAdapter.materializeManifest(
          fixture.manifest,
        );
        expect(sha256(stableJson(materialized))).toBe(
          fixture.expected.materializedSha256,
        );
      } else {
        expect(diagnosticCodesForValidationErrors(validation.errors)).toEqual(
          fixture.expected.diagnosticCodes,
        );
      }
    });
  }

  test("emits deterministic, sorted, declared, hash-checked artifacts", () => {
    const fixture = conformanceCase("manual-generated-scenario-base");
    const workspaceFirst = projectAuthoringAdapter.generateWorkspaceArtifacts(
      fixture.manifest,
    );
    const workspaceSecond = projectAuthoringAdapter.generateWorkspaceArtifacts(
      fixture.manifest,
    );
    expect(workspaceFirst).toEqual(workspaceSecond);
    expect(workspaceFirst.map((artifact) => artifact.path)).toEqual(
      [...workspaceFirst]
        .map((artifact) => artifact.path)
        .sort((left, right) => left.localeCompare(right)),
    );

    const allArtifacts = [...workspaceFirst];
    expect(new Set(allArtifacts.map((artifact) => artifact.path)).size).toBe(
      allArtifacts.length,
    );
    for (const artifact of allArtifacts) {
      expect(pathIsDeclared(artifact.path)).toBe(true);
      expect(artifact.contentSha256).toBe(sha256(artifact.content));
    }

    const materialized = projectAuthoringAdapter.materializeManifest(
      fixture.manifest,
    );
    const staticManifest = workspaceFirst.find(
      (artifact) => artifact.path === "shared/manifest-static.json",
    );
    expect(staticManifest).toBeDefined();
    expect(JSON.parse(staticManifest!.content).initialTable).toEqual(
      JSON.parse(stableJson(materialized)),
    );
  });

  test("materializes every location discriminator with strict equality", () => {
    const expectations = {
      "manual-space-home": {
        cardId: "space-card",
        location: {
          type: "OnSpace",
          boardId: "square-board",
          spaceId: "a1",
          position: 0,
        },
      },
      "manual-container-home": {
        cardId: "container-card",
        location: {
          type: "InContainer",
          boardId: "square-board",
          containerId: "display-row",
          position: 0,
        },
      },
      "manual-slot-home": {
        cardId: "slot-card",
        location: {
          type: "InSlot",
          host: { kind: "piece", id: "holder-a" },
          slotId: "pocket",
          position: 0,
        },
      },
      "manual-edge-home": {
        cardId: "edge-card",
        location: {
          type: "OnEdge",
          boardId: "square-board",
          edgeId: "square-edge:1,0::1,1",
          position: 0,
        },
      },
      "manual-vertex-home": {
        cardId: "vertex-card",
        location: {
          type: "OnVertex",
          boardId: "square-board",
          vertexId: "square-vertex:1,1",
          position: 0,
        },
      },
    } as const;

    for (const [id, expectation] of Object.entries(expectations)) {
      const materialized = projectAuthoringAdapter.materializeManifest(
        conformanceCase(id as keyof typeof expectations).manifest,
      ) as Record<string, unknown>;
      const locations = materialized.componentLocations as Record<
        string,
        unknown
      >;
      expect(locations[expectation.cardId]).toEqual(expectation.location);
    }
  });

  test("does not infer a home from compatible zones", () => {
    const materialized = projectAuthoringAdapter.materializeManifest(
      conformanceCase("manual-compatible-zones-no-inference").manifest,
    ) as Record<string, unknown>;
    const locations = materialized.componentLocations as Record<
      string,
      unknown
    >;
    expect(locations.token).toEqual({ type: "Detached" });
  });

  test("preserves deterministic count expansion and zone positions", () => {
    const materialized = projectAuthoringAdapter.materializeManifest(
      conformanceCase("manual-count-order").manifest,
    ) as Record<string, unknown>;
    const decks = materialized.decks as Record<string, string[]>;
    expect(decks["shared-zone"]).toEqual([
      "first-1",
      "first-2",
      "first-3",
      "second-1",
      "second-2",
    ]);
  });
});
