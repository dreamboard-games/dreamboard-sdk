import { defineScenario } from "../testing-types.ts";
import { readyForCharterCard } from "../scenario-helpers.ts";

export default defineScenario({
  id: "charter-survey-grant-ready",
  description: "Materializes a browser-ready state with Survey Grant playable",
  from: "charter-verification",
  when: async (ctx) => {
    await readyForCharterCard(ctx, ctx.seat(0), "surveyGrant");
  },
  then: ({ expect, interactions, seat }) => {
    expect(
      interactions(seat(0)).some(
        (descriptor) => descriptor.interactionId === "playSurveyGrant",
      ),
    ).toBe(true);
  },
});
