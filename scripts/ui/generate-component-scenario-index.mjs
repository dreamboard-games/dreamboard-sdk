#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";
import { format } from "prettier";
import {
  componentScenarioIndexPath,
  repoRelative,
  root,
  sortUnique,
  writeGeneratedText,
} from "./scenario-catalog-lib.mjs";

const componentOwnership = {
  CardDragSurface: {
    sourceFiles: [
      "packages/sdk/src/ui/components/card-drag/CardDragSurface.tsx",
      "packages/sdk/src/runtime/primitives/hand-surface.tsx",
      "packages/sdk/src/ui/stories/HandView.stories.tsx",
    ],
    storyIds: [
      "hands-handview--drag-to-target-surface-layout",
      "hands-handview--drag-to-target-pointer-drop",
    ],
  },
  CardDropTargetView: {
    sourceFiles: [
      "packages/sdk/src/ui/components/card-drag/CardDropTargetView.tsx",
      "packages/sdk/src/runtime/primitives/hand-surface.tsx",
      "packages/sdk/src/ui/stories/HandView.stories.tsx",
    ],
    storyIds: [
      "hands-handview--drag-to-target-surface-layout",
      "hands-handview--drag-to-target-pointer-drop",
    ],
  },
  CardFace: {
    sourceFiles: [
      "packages/sdk/src/ui/components/Card.tsx",
      "packages/sdk/src/ui/stories/CardFace.stories.tsx",
    ],
    storyIds: [
      "cards-cardface--default-content",
      "cards-cardface--interactive-controlled",
    ],
  },
  CostDisplay: {
    sourceFiles: [
      "packages/sdk/src/ui/components/CostDisplay.tsx",
      "packages/sdk/src/ui/stories/ResourceStatusPlayer.stories.tsx",
    ],
    storyIds: ["resource-status--cost"],
  },
  HandView: {
    sourceFiles: [
      "packages/sdk/src/ui/components/HandView.tsx",
      "packages/sdk/src/ui/components/hand-layout-math.ts",
      "packages/sdk/src/ui/components/hand-pointer-engine.ts",
      "packages/sdk/src/ui/stories/HandView.stories.tsx",
    ],
    storyIds: [
      "hands-handview--drag-to-target-selection-staging",
      "hands-handview--five-card-fan",
      "hands-handview--phone-portrait-thirteen",
    ],
  },
  InteractionSubmit: {
    sourceFiles: [
      "packages/sdk/src/runtime/primitives/interaction/controls.tsx",
    ],
    storyIds: [],
  },
  InteractionInput: {
    sourceFiles: [
      "packages/sdk/src/runtime/primitives/interaction/controls.tsx",
      "packages/sdk/src/runtime/hooks/useBoundInteractionHandle.ts",
    ],
    storyIds: [],
  },
  Panel: {
    sourceFiles: [
      "packages/sdk/src/ui/components/Panel.tsx",
      "packages/sdk/src/ui/stories/Panels.stories.tsx",
    ],
    storyIds: ["panels--compound-panel"],
  },
  PluginRuntime: {
    sourceFiles: [
      "packages/sdk/src/runtime/components/PluginRuntime.tsx",
      "packages/sdk/src/runtime/components/PluginRuntimeBoundary.tsx",
      "packages/sdk/src/runtime/core/create-plugin-runtime-client.ts",
    ],
    storyIds: [],
  },
  ResourceCounter: {
    sourceFiles: [
      "packages/sdk/src/ui/components/ResourceCounter.tsx",
      "packages/sdk/src/ui/stories/ResourceStatusPlayer.stories.tsx",
    ],
    storyIds: [
      "resource-status--resource-compact",
      "resource-status--resource-zero-hidden",
    ],
  },
  SlotSystem: {
    sourceFiles: [
      "packages/sdk/src/ui/components/board/SlotSystem.tsx",
      "packages/sdk/src/ui/stories/BoardTarget.stories.tsx",
    ],
    storyIds: [
      "board-targets--claimed-and-disabled",
      "board-targets--eligible-targets",
    ],
  },
};

function validateOwnershipSources() {
  const missing = [];
  for (const [componentName, ownership] of Object.entries(componentOwnership)) {
    for (const sourceFile of ownership.sourceFiles) {
      if (!existsSync(path.join(root, sourceFile))) {
        missing.push(`${componentName}: ${sourceFile}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Component scenario index has missing source files:\n\n${missing
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
}

export async function generateComponentScenarioIndex({
  check = false,
  entries,
} = {}) {
  validateOwnershipSources();
  if (!entries) {
    const { collectValidatedScenarioCatalog } =
      await import("./scenario-catalog-lib.mjs");
    entries = await collectValidatedScenarioCatalog();
  }

  const components = {};
  for (const entry of entries) {
    for (const componentName of entry.components) {
      const ownership = componentOwnership[componentName];
      if (!ownership) {
        throw new Error(
          `Missing component ownership mapping for '${componentName}'.`,
        );
      }
      const current = components[componentName] ?? {
        sourceFiles: ownership.sourceFiles,
        storyIds: ownership.storyIds,
        scenarioIds: [],
        capabilities: [],
      };
      current.scenarioIds.push(entry.id);
      current.capabilities.push(...entry.capabilities);
      components[componentName] = current;
    }
  }

  const index = {
    schemaVersion: 1,
    components: Object.fromEntries(
      Object.entries(components)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([componentName, value]) => [
          componentName,
          {
            sourceFiles: sortUnique(value.sourceFiles),
            storyIds: sortUnique(value.storyIds),
            scenarioIds: sortUnique(value.scenarioIds),
            capabilities: sortUnique(value.capabilities),
          },
        ]),
    ),
    sharedFallbacks: [
      "packages/sdk/src/browser-interaction.ts",
      "packages/sdk/src/runtime/**",
      "packages/sdk/src/testing/ui-fixture/**",
      "packages/sdk/src/ui/plugin-styles.css",
      "packages/sdk/src/ui/theme/**",
      "packages/ui-workbench/src/runtime/**",
    ],
  };

  return writeGeneratedText(
    componentScenarioIndexPath,
    await format(JSON.stringify(index), { parser: "json" }),
    { check },
  );
}

async function main() {
  const check = process.argv.includes("--check");
  await generateComponentScenarioIndex({ check });
  console.log(
    `${check ? "checked" : "generated"} ${repoRelative(
      componentScenarioIndexPath,
    )}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
