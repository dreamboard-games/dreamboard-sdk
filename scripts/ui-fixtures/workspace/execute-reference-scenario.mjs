import {
  compilePluginProtocolTape,
  createReducerScenarioRunner,
} from "../../../packages/sdk/dist/testing.js";

export async function executeReferenceGameAuthority({
  reducerBundle,
  behaviorScenario,
  viewer,
}) {
  const runner = createReducerScenarioRunner({
    scenarioId: behaviorScenario.id,
    gameId: behaviorScenario.gameId,
    initialState: behaviorScenario.initialState,
    bundle: reducerBundle,
    viewer: {
      seatId: viewer.seatId,
      playerId: viewer.playerId ?? viewer.seatId,
    },
    playerIds: behaviorScenario.playerIds,
  });
  const trace = await runner.run(behaviorScenario.operations);
  const playerId = viewer.playerId ?? viewer.seatId;
  return compilePluginProtocolTape({
    trace,
    session: {
      sessionId: `${behaviorScenario.id}.fixture-session`,
      players: [{ playerId, displayName: playerId }],
    },
  });
}
