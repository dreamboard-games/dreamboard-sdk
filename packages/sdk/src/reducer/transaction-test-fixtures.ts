import { createReducerTransaction, createReducerEdit } from "./transaction";
import type { RuntimeTableRecord } from "./model";
import { createMutableRandomHelpers } from "./bundle/trusted/rng-sampler";

export const createTestRandom = (seed = 42) =>
  createMutableRandomHelpers({ seed, cursor: 0, trace: [], draws: [] });

export function createTestTransaction<
  State extends { table: RuntimeTableRecord },
>(state: State) {
  return createReducerTransaction(state, createTestRandom());
}

export function createTestEdit<State extends { table: RuntimeTableRecord }>() {
  const edit = createReducerEdit<State>();
  return <Draft extends State>(state: Draft) => edit(state, createTestRandom());
}
