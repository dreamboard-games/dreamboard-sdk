import type { AnyReducerGameDefinition } from "../reducer/model.js";

/** Local testing convenience creates the explicit roster used by the session. */
export function resolvePlayerRoster(
  game: Pick<AnyReducerGameDefinition, "contract">,
  count: number,
): string[] {
  const setup = game.contract.manifest.normalSetup;
  if (
    !Number.isSafeInteger(count) ||
    count < setup.minPlayers ||
    count > setup.maxPlayers
  )
    throw new Error("Player count is outside manifest limits.");
  return Array.from({ length: count }, (_, seat) => `player-${seat + 1}`);
}
