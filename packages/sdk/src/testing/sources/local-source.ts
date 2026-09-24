import { resolvePlayerRoster } from "../player-roster.js";
import { createStore } from "@tanstack/store";
import { z } from "zod";
import { createSourceLifecycle } from "../../headless/sources/lifecycle.js";
import { immutableCopy } from "../../headless/sources/immutable.js";
import type {
  SourceState,
  SubmitResult,
} from "../../headless/sources/types.js";
import {
  ReducerSessionStateSchema,
  GameOutcomeSchema,
} from "../../shared/runtime-schema.js";
import type {
  GameInput,
  ReducerSessionState,
} from "../../shared/runtime-types.js";
import type { RuntimeJson } from "../../shared/runtime-json.js";
import { materializePluginGameplayFrame } from "../../shared/protocol/projection.js";
import { computePluginActionSetVersion } from "../../shared/protocol/digest.js";
import { createReducerTestingRuntime } from "../reducer-runtime.js";
import type { ScenarioDefinitionGameLike } from "../scenario-definition-validation.js";
import type { OptionsOfContract } from "../../reducer/model/extract.js";
import type { ScenarioCommandOf } from "../definitions.js";
import {
  projectScenarioCommandParams,
  resolveScenarioCommandParams,
  resolveScenarioSeatRef,
} from "../scenario-player-refs.js";
import type { LocalCheckpoint, LocalSource } from "./types.js";

const checkpointSchema = z
  .object({
    state: ReducerSessionStateSchema,
    terminal: GameOutcomeSchema.nullable(),
  })
  .strict();
type Runtime = ReturnType<typeof createReducerTestingRuntime>;
export async function localSource<
  const Game extends ScenarioDefinitionGameLike,
>(
  game: Game,
  options: {
    players: number;
    seed: number;
    as?: string;
    options?: OptionsOfContract<Game["contract"]>;
  },
): Promise<LocalSource<Game>> {
  const setup = game.contract.manifest.normalSetup;
  if (!setup) throw new Error("Game manifest does not expose normal setup.");
  const playerIds = resolvePlayerRoster(game, options.players);
  const runtime = createReducerTestingRuntime(game as never);
  const initial = await runtime.initialize({
    table: setup.createInitialTable({ playerIds }) as RuntimeJson,
    playerIds,
    rngSeed: options.seed,
    options: options.options,
  });
  return createLocalProvider(
    game,
    runtime,
    playerIds,
    { state: initial.state, terminal: initial.terminal ?? null },
    options.as ?? playerIds[0],
  );
}

/** Scenario materialization enters here without initializing/replaying on restore. */
export function createLocalProvider<Game extends ScenarioDefinitionGameLike>(
  game: Game,
  runtime: Runtime,
  playerIds: readonly string[],
  initial: LocalCheckpoint,
  selectedPlayerId: string,
): LocalSource<Game> {
  let checkpoint = immutableCopy(checkpointSchema.parse(initial));
  let revision = 1;
  let playerId = selectedPlayerId;
  let epoch = 0;
  let disposed = false;
  let inFlight = false;
  let disconnect = () => {};
  const session = {
    sessionId: crypto.randomUUID(),
    players: playerIds.map((id) => ({ playerId: id, displayName: id })),
  };
  const store = createStore<SourceState>({
    snapshot: null,
    connection: "connecting",
    request: null,
  });
  let lifecycle: ReturnType<typeof createSourceLifecycle>;
  function assertOpen() {
    if (disposed) throw new Error("Local source disposed.");
  }
  function assertIdle() {
    assertOpen();
    if (inFlight || store.get().request)
      throw new Error("A gameplay interaction is already pending.");
  }
  function makeFrame(state: ReducerSessionState = checkpoint.state) {
    const projection = runtime.project({ state, playerIds: [playerId] });
    const provisional = materializePluginGameplayFrame({
      currentPhase: state.domain.flow.currentPhase,
      activePlayers: projection.schedulerFlow?.activePlayerIds ?? [],
      dynamicProjection: projection,
      staticProjection: runtime.boardStatic(),
      perspectivePlayerId: playerId,
      version: revision,
      actionSetVersion: "pending",
    });
    return {
      ...provisional,
      basis: {
        ...provisional.basis,
        actionSetVersion: computePluginActionSetVersion({
          version: revision,
          availableInteractions: provisional.availableInteractions,
        }),
      },
    };
  }
  function publish() {
    lifecycle.frame(makeFrame());
  }
  async function execute(input: GameInput): Promise<SubmitResult> {
    assertOpen();
    if (inFlight) throw new Error("A gameplay interaction is already pending.");
    if (checkpoint.terminal)
      return { accepted: false, errorCode: "game-ended" };
    inFlight = true;
    const generation = epoch;
    try {
      const result = await runtime.dispatch({ state: checkpoint.state, input });
      if (disposed || generation !== epoch)
        throw new Error("Local source lifetime changed.");
      if (result.kind === "reject")
        return {
          accepted: false,
          errorCode: result.errorCode,
          ...(result.message === undefined ? {} : { message: result.message }),
        };
      checkpoint = immutableCopy({
        state: result.state,
        terminal: result.terminal ?? null,
      });
      revision++;
      publish();
      return { accepted: true };
    } finally {
      if (generation === epoch) inFlight = false;
    }
  }
  function replaceLifetime() {
    if (!playerIds.includes(playerId))
      throw new Error("Unknown local source seat.");
    epoch++;
    inFlight = false;
    disconnect();
    lifecycle?.source.dispose();
    const generation = epoch;
    lifecycle = createSourceLifecycle({
      context: { sessionId: session.sessionId, playerId },
      send(command) {
        const current = lifecycle;
        void execute(
          command.type === "interaction.cancel"
            ? {
                kind: "interaction.cancel",
                playerId,
                interactionId: command.interactionId,
              }
            : {
                kind: "interaction",
                playerId,
                interactionId: command.interactionId,
                params: command.params,
              },
        )
          .then((result) => {
            if (generation === epoch)
              current.result({
                ...result,
                type: "interaction.result",
                clientActionId: command.clientActionId,
              });
          })
          .catch((error) => {
            if (generation === epoch)
              current.fail(
                error instanceof Error ? error : new Error(String(error)),
              );
          });
      },
      recover: publish,
      close() {},
    });
    lifecycle.session(session);
    publish();
    store.setState(() => lifecycle.source.store.get());
    const subscription = lifecycle.source.store.subscribe(() =>
      store.setState(() => lifecycle.source.store.get()),
    );
    disconnect = () => subscription.unsubscribe();
  }
  replaceLifetime();
  return {
    store: {
      get: () => store.get(),
      subscribe: (listener) => store.subscribe(listener),
    },
    async submit(interactionId, params) {
      assertIdle();
      return lifecycle.source.submit(interactionId, params);
    },
    async cancel(interactionId) {
      assertIdle();
      return lifecycle.source.cancel(interactionId);
    },
    async apply(command: ScenarioCommandOf<Game>) {
      assertIdle();
      const actor = resolveScenarioSeatRef({
        ref: command.actor,
        playerIds,
        path: "command.actor",
      });
      const currentSchema = runtime.currentClientParamSchema({
        state: checkpoint.state,
        playerId: actor,
        interactionId: command.interactionId,
      }) as z.ZodTypeAny | null;
      const params = resolveScenarioCommandParams({
        game,
        currentSchema,
        phase: checkpoint.state.domain.flow.currentPhase,
        interactionId: command.interactionId,
        params: command.params,
        playerIds,
        path: "command",
      });
      return execute({
        kind: "interaction",
        playerId: actor,
        interactionId: command.interactionId,
        params: params as RuntimeJson,
      });
    },
    switchSeat(next) {
      assertOpen();
      if (!playerIds.includes(next))
        throw new Error("Unknown local source seat.");
      if (next === playerId) return;
      playerId = next;
      replaceLifetime();
    },
    checkpoint() {
      assertOpen();
      return structuredClone(checkpoint);
    },
    restore(value) {
      assertOpen();
      const next = checkpointSchema.parse(value);
      runtime.project({ state: next.state, playerIds: [...playerIds] });
      // Production projection validates the game-specific table before this read.
      const restoredRoster = (
        next.state.domain.table as { playerOrder: string[] }
      ).playerOrder;
      if (
        restoredRoster.length !== playerIds.length ||
        restoredRoster.some((id, index) => id !== playerIds[index])
      )
        throw new Error("Checkpoint roster does not match the local session.");
      checkpoint = immutableCopy(next);
      revision++;
      replaceLifetime();
    },
    inspect() {
      assertOpen();
      return store.get().snapshot!;
    },
    async explore({ maxEvaluations }) {
      assertOpen();
      if (!Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1)
        throw new Error("Enumeration budget must be a positive integer.");
      if (checkpoint.terminal) return [];
      const commands: ScenarioCommandOf<Game>[] = [];
      let remaining = maxEvaluations;
      const capturedState = checkpoint.state;
      const capturedEpoch = epoch;
      const capturedRevision = revision;
      for (const descriptor of store.get().snapshot!.frame
        .availableInteractions) {
        if (remaining <= 0) break;
        const result = runtime.enumerateInteractionParams({
          state: checkpoint.state,
          playerId,
          interactionId: descriptor.interactionId,
          maxEvaluations: remaining,
        });
        if (!result.found || !result.visible || !result.enumeration) continue;
        remaining -= result.enumeration.evaluated;
        for (const params of result.enumeration.assignments) {
          const probe = await runtime.dispatch({
            state: structuredClone(capturedState),
            input: {
              kind: "interaction",
              playerId,
              interactionId: descriptor.interactionId,
              params: params as RuntimeJson,
            },
          });
          if (
            disposed ||
            capturedEpoch !== epoch ||
            capturedRevision !== revision
          )
            throw new Error("Source changed during exploration.");
          if (probe.kind === "reject") continue;
          const projected = projectScenarioCommandParams({
            game,
            currentSchema: runtime.currentClientParamSchema({
              state: checkpoint.state,
              playerId,
              interactionId: descriptor.interactionId,
            }) as z.ZodTypeAny | null,
            phase: checkpoint.state.domain.flow.currentPhase,
            interactionId: descriptor.interactionId,
            params,
            playerIds,
            path: "explore",
          });
          commands.push({
            actor: { seat: playerIds.indexOf(playerId) },
            interactionId: descriptor.interactionId,
            params: projected,
          } as ScenarioCommandOf<Game>);
        }
      }
      return commands;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      epoch++;
      lifecycle.source.dispose();
      disconnect();
    },
  };
}
