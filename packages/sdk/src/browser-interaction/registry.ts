import {
  GAMEPLAY_BROWSER_INTERACTION_EFFECT_KINDS,
  GAMEPLAY_BROWSER_INTERACTION_INTENTS,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "./constants.js";
import type {
  BrowserInteractionIntent,
  BrowserInteractionRegistry,
  BrowserInteractionSurface,
  BrowserInteractionSurfaceDefinition,
} from "./types.js";

export function defineBrowserInteractionSurface<
  Surface extends BrowserInteractionSurface,
  Intent extends BrowserInteractionIntent,
>(
  definition: BrowserInteractionSurfaceDefinition<Surface, Intent>,
): BrowserInteractionSurfaceDefinition<Surface, Intent> {
  const seen = new Set<string>();
  for (const intent of definition.intents) {
    if (seen.has(intent)) {
      throw new Error(
        `Browser interaction surface '${definition.surface}' declares duplicate intent '${intent}'.`,
      );
    }
    seen.add(intent);
  }
  return definition;
}

export const gameplayBrowserInteractionSurface =
  defineBrowserInteractionSurface({
    surface: GAMEPLAY_BROWSER_INTERACTION_SURFACE,
    intents: GAMEPLAY_BROWSER_INTERACTION_INTENTS,
    effectKinds: GAMEPLAY_BROWSER_INTERACTION_EFFECT_KINDS,
  });

export function createBrowserInteractionRegistry(
  definitions: readonly BrowserInteractionSurfaceDefinition[] = [
    gameplayBrowserInteractionSurface,
  ],
): BrowserInteractionRegistry {
  const surfaces = new Map<
    BrowserInteractionSurface,
    BrowserInteractionSurfaceDefinition
  >();
  for (const definition of definitions) {
    const existing = surfaces.get(definition.surface);
    if (existing) {
      const existingIntents = existing.intents.join(",");
      const nextIntents = definition.intents.join(",");
      const existingEffectKinds = (existing.effectKinds ?? []).join(",");
      const nextEffectKinds = (definition.effectKinds ?? []).join(",");
      if (
        existingIntents !== nextIntents ||
        existingEffectKinds !== nextEffectKinds
      ) {
        throw new Error(
          `Browser interaction surface '${definition.surface}' is already registered with a different intent vocabulary or effect vocabulary.`,
        );
      }
      continue;
    }
    surfaces.set(definition.surface, definition);
  }
  return { surfaces };
}

export const defaultBrowserInteractionRegistry =
  createBrowserInteractionRegistry();
