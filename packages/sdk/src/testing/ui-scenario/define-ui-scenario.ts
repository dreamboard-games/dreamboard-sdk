import type {
  ReferenceGameUIScenarioDefinition,
  UIScenarioDefinition,
} from "./types.js";

export function defineUIScenario<const TScenario extends UIScenarioDefinition>(
  scenario: TScenario,
): Readonly<TScenario> {
  return Object.freeze(scenario);
}

export function defineReferenceGameUIScenario<
  const TScenario extends ReferenceGameUIScenarioDefinition,
>(scenario: TScenario): Readonly<TScenario> {
  return Object.freeze(scenario);
}
