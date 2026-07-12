import { discardBarrier } from "./discard-barrier";
import { gameOver } from "./game-over";
import { main } from "./main";
import { moveBanditsPhase } from "./move-bandits";
import { pendingTrade } from "./pending-trade";
import { roll } from "./roll";
import { setupCamp } from "./setup-camp";
import { setupTrail } from "./setup-trail";

export const phases = {
  setupCamp,
  setupTrail,
  roll,
  discardBarrier,
  moveBandits: moveBanditsPhase,
  main,
  pendingTrade,
  gameOver,
};
