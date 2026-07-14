import { SOLO_DRAW_COMMANDS } from "./commands.ts";
import { defineSoloResultScenario } from "./solo-result.ts";

export default defineSoloResultScenario({
  id: "river-guild.complete-game-solo-draw",
  result: "draw",
  commands: SOLO_DRAW_COMMANDS,
  teamScore: 12,
  rivalProgress: 12,
});
