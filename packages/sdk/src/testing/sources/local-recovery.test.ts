import { afterEach, expect, it, vi } from "vitest";
import hearts from "../../../../../examples/reference-games/hearts/app/game.js";
import completeHearts from "../../../../../examples/reference-games/hearts/test/scenarios/complete-game.scenario.js";
import * as testingRuntime from "../reducer-runtime.js";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { localSource } from "./local-source.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("coalesces recovery retries while local execution is in flight and acknowledges once committed", async () => {
  vi.useFakeTimers();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const createRuntime = testingRuntime.createReducerTestingRuntime;
  const dispatches = vi.fn();
  vi.spyOn(testingRuntime, "createReducerTestingRuntime").mockImplementation(
    (game) => {
      const runtime = createRuntime(game);
      const dispatch = runtime.dispatchClient;
      runtime.dispatchClient = async (input) => {
        dispatches();
        await gate;
        return dispatch(input);
      };
      return runtime;
    },
  );
  const source = await localSource(hearts, { players: 4, seed: 1 });
  const version = source.inspect().version;
  const pending = source.submit(
    "submit",
    RuntimeJsonSchema.parse(completeHearts.given[0].params),
  );
  const id = source.store.get().request!.clientActionId;
  await expect(source.cancel("submit")).rejects.toThrow("already pending");
  await vi.advanceTimersByTimeAsync(10_000);
  expect(dispatches).toHaveBeenCalledOnce();
  expect(source.store.get().request?.clientActionId).toBe(id);
  release();
  await expect(pending).resolves.toEqual({ accepted: true });
  expect(source.store.get().request).toBeNull();
  expect(source.inspect().version).toBe(version + 1);
  expect(source.inspect().causedBy).toBe(id);
  source.dispose();
});
