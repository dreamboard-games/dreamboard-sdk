import type { UIScenarioDefinition } from "./types.js";

export function defineUIScenario<const TScenario extends UIScenarioDefinition>(
  scenario: TScenario,
): Readonly<TScenario> {
  return Object.freeze(scenario);
}
