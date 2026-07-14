import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "sketchbook.technique-eraser-zero",
  description:
    "Eraser enters an exclusive pending selection and accepts the deliberate zero-card branch.",
  setup: { players: 2, seed: 1 },
  given: COMPLETE_GAME_COMMANDS.slice(0, 85),
  when: COMPLETE_GAME_COMMANDS.slice(85, 86),
  then: ({ expect, state }) => {
    expect(state().phase.step).toBe("action");
    expect(state().phase.pendingTechnique).toBeNull();
  },
});
