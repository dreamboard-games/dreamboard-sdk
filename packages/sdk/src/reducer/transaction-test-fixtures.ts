import { createReducerTransaction, createReducerEdit } from "./transaction";
import type { RuntimeTableRecord, ZoneDefinitions } from "./model";
import { createMutableRandomHelpers } from "./bundle/trusted/rng-sampler";

export const createTestRandom = (seed = 42) =>
  createMutableRandomHelpers({ seed, cursor: 0, trace: [], draws: [] });

export function createTestTransaction<
  State extends { table: RuntimeTableRecord },
>(state: State, definitions: ZoneDefinitions = { zoneDefinitions: {} }) {
  return createReducerTransaction(state, createTestRandom(), definitions);
}

export function createTestEdit<State extends { table: RuntimeTableRecord }>(
  definitions: ZoneDefinitions = { zoneDefinitions: {} },
) {
  const edit = createReducerEdit<State>(definitions);
  return <Draft extends State>(state: Draft) => edit(state, createTestRandom());
}
