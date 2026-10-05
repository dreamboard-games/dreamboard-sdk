import { createReducerTransaction, createReducerEdit } from "./transaction";
import type { RuntimeTableRecord, ZoneDefinitions } from "./model";
import { createMutableRandomHelpers } from "./bundle/trusted/rng-sampler";

export const createTestRandom = (seed = 42) =>
  createMutableRandomHelpers({ seed, cursor: 0, trace: [], draws: [] });

export function createTestTransaction<
  State extends { table: RuntimeTableRecord },
  Definitions extends ZoneDefinitions,
>(state: State, definitions: Definitions) {
  return createReducerTransaction(state, createTestRandom(), definitions);
}

export function createTestEdit<
  State extends { table: RuntimeTableRecord },
  Definitions extends ZoneDefinitions,
>(definitions: Definitions) {
  const edit = createReducerEdit<State, Definitions>(definitions);
  return <Draft extends State>(state: Draft) => edit(state, createTestRandom());
}
