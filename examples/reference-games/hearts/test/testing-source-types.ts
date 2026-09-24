import { localSource } from "@dreamboard-games/sdk/testing";
import game from "../app/game.ts";

export async function verifyHeartsSourceCommands() {
  const source = await localSource(game, {
    players: 4,
    seed: 1,
    as: "player-1",
  });
  source.apply({
    actor: { seat: 0 },
    interactionId: "playCard",
    params: { cardId: "clubs-2" },
  });
  source.apply({
    actor: { seat: 0 },
    // @ts-expect-error Misspelled interaction names cannot enter local apply.
    interactionId: "playCrad",
    params: { cardId: "clubs-2" },
  });
  source.apply({
    actor: { seat: 0 },
    interactionId: "playCard",
    // @ts-expect-error Real Hearts card input remains string-typed.
    params: { cardId: 42 },
  });
}
