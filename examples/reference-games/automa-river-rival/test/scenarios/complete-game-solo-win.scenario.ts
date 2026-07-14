import { SOLO_WIN_COMMANDS } from "./commands.ts";
import { defineSoloResultScenario } from "./solo-result.ts";

export default defineSoloResultScenario({
  id: "river-guild.complete-game-solo-win",
  result: "win",
  commands: SOLO_WIN_COMMANDS,
  teamScore: 13,
  rivalProgress: 12,
});
