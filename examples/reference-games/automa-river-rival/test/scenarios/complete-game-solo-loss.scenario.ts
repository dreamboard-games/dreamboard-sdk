import { SOLO_LOSS_COMMANDS } from "./commands.ts";
import { defineSoloResultScenario } from "./solo-result.ts";

export default defineSoloResultScenario({
  id: "river-guild.complete-game-solo-loss",
  result: "loss",
  commands: SOLO_LOSS_COMMANDS,
  teamScore: 9,
  rivalProgress: 15,
});
