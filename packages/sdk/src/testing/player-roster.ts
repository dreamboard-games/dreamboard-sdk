import type { ScenarioDefinitionGameLike } from "./scenario-definition-validation.js";

/** Authored manifest roster is the authority for both replay and local sources. */
export function resolvePlayerRoster(
  game: ScenarioDefinitionGameLike,
  count: number,
): string[] {
  const setup = game.contract.manifest.normalSetup;
  if (!setup) throw new Error("Game manifest does not expose normal setup.");
  if (
    !Number.isSafeInteger(count) ||
    count < setup.minPlayers ||
    count > setup.maxPlayers
  )
    throw new Error("Player count is outside manifest limits.");
  const declared = game.contract.manifest.literals.playerIds;
  if (declared.length < count)
    throw new Error("Manifest roster does not contain enough players.");
  return declared.slice(0, count);
}
