import { stormtrail } from "../game-model";

const gameOver = stormtrail.phase("gameOver");

export default gameOver.define({
  kind: "auto",
  initialState: () => ({}),
});
