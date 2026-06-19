export type ScenarioDefinition = {
  id: string;
  description: string;
  tags: readonly string[];
  claimId: string;
};

export function defineScenario<const Definition extends ScenarioDefinition>(
  definition: Definition,
): Definition {
  return definition;
}
