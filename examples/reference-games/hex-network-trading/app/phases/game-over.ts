import { gameOverAuthoring } from "../authoring";

export const gameOver = gameOverAuthoring.define({
  kind: "auto",
  initialState: () => ({}),
});
