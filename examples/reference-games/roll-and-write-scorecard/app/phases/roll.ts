import { definePhase } from "@dreamboard-games/sdk/reducer";
import { rollPhaseStateSchema, type GameContract } from "../game-contract";
import { createInitialPublicState, publishWeatherReading } from "../model";
import { edit } from "../reducer-support";

export const roll = definePhase<GameContract>()({
  kind: "auto",
  state: rollPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx, q, random }) {
    const playerIds = q.player.order();
    const firstPlayer = playerIds[0];
    if (!firstPlayer) {
      throw new Error("Cloudline Survey requires at least one player.");
    }

    const publicState =
      state.publicState.playerIds.length === 0
        ? createInitialPublicState(playerIds)
        : state.publicState;
    const firstDie = random.integer({ minInclusive: 1, maxInclusive: 6 });
    const secondDie = random.integer({ minInclusive: 1, maxInclusive: 6 });
    const reading = publishWeatherReading(publicState, [firstDie, secondDie]);

    const tx = edit(state);
    tx.patchPublicState(reading);
    tx.setActivePlayers([firstPlayer]);
    return accept(tx.state, {
      instructions: [fx.transition("markSurvey")],
      events: [
        {
          kind: "systemAction",
          procedureId: "weather-reading",
          title: `Weather reading for round ${reading.round}`,
          summary: `${firstDie} + ${secondDie} = ${reading.roll?.total ?? 0}`,
          details: [
            { label: "Round", value: reading.round },
            { label: "First die", value: firstDie },
            { label: "Second die", value: secondDie },
            { label: "Total", value: reading.roll?.total ?? 0 },
          ],
        },
      ],
    });
  },
});
