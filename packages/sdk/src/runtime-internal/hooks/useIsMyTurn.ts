import { usePluginSession } from "../context/PluginSessionContext.js";
import { useActivePlayers } from "./useActivePlayers.js";

/**
 * Returns whether the currently controlled player is one of the active players
 * for the current gameplay snapshot. Uses {@link useActivePlayers}, so this is
 * correct for `simultaneousPlayer` phases too (a seat that still owes an action
 * counts as active until it submits).
 */
export function useIsMyTurn(): boolean {
  const { controllingPlayerId } = usePluginSession();
  const activePlayers = useActivePlayers();

  return (
    controllingPlayerId !== null &&
    activePlayers.includes(
      controllingPlayerId as (typeof activePlayers)[number],
    )
  );
}
