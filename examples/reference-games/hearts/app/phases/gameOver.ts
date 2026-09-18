import { hearts } from "../game-model";

const gameOver = hearts.phase("gameOver");

export default gameOver.define({
  kind: "auto",
  initialState: () => ({}),
});
