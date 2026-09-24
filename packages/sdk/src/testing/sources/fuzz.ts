import { nextRandomInt } from "../../reducer/rng.js";
import type { RuntimeRngState } from "../../reducer/model/runtime.js";
import type { ScenarioDefinitionGameLike } from "../scenario-definition-validation.js";
import type { ScenarioCommandOf } from "../definitions.js";
import { localSource } from "./local-source.js";
import type { LocalCheckpoint } from "./types.js";

export interface FuzzResult<Game> {
  readonly commands: readonly ScenarioCommandOf<Game>[];
  readonly checkpoint: LocalCheckpoint;
  readonly error?: Error;
}
/** Deterministic testing choice RNG is independent from the game's authoritative RNG. */
export async function fuzz<const Game extends ScenarioDefinitionGameLike>(
  game: Game,
  options: {
    seed: number;
    steps: number;
    players?: number;
    maxEvaluations?: number;
  },
): Promise<FuzzResult<Game>> {
  if (!Number.isSafeInteger(options.steps) || options.steps < 0)
    throw new Error("Fuzz steps must be a nonnegative integer.");
  const players =
    options.players ?? game.contract.manifest.normalSetup?.minPlayers;
  if (!players) throw new Error("Game manifest does not expose normal setup.");
  const source = await localSource(game, { players, seed: options.seed });
  let rng: RuntimeRngState = {
    seed: options.seed,
    cursor: 0,
    draws: [],
    trace: [],
  };
  const commands: ScenarioCommandOf<Game>[] = [];
  try {
    for (
      let step = 0;
      step < options.steps && !source.checkpoint().terminal;
      step++
    ) {
      const actors: string[] = [];
      for (const player of source.inspect().players) {
        source.switchSeat(player.playerId);
        if (
          source
            .inspect()
            .frame.availableInteractions.some(
              (interaction) => interaction.availability.status === "available",
            )
        )
          actors.push(player.playerId);
      }
      if (actors.length === 0) break;
      const [actorIndex, actorRng] = nextRandomInt(actors.length, rng);
      rng = actorRng;
      source.switchSeat(actors[actorIndex]);
      const choices = await source.explore({
        maxEvaluations: options.maxEvaluations ?? 5000,
      });
      if (choices.length === 0) break;
      const [index, next] = nextRandomInt(choices.length, rng);
      rng = next;
      const command = choices[index];
      commands.push(command);
      const result = await source.apply(command);
      if (!result.accepted)
        throw new Error(`Explored command rejected: ${result.errorCode}`);
    }
    return { commands, checkpoint: source.checkpoint() };
  } catch (error) {
    return {
      commands,
      checkpoint: source.checkpoint(),
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    source.dispose();
  }
}
