import { createStore } from "@tanstack/store";
import {
  PluginGameplayFrameSchema,
  PluginSessionDescriptorSchema,
  InteractionResultSchema,
  PluginToHostPayloadSchema,
} from "../../shared/protocol/schema.js";
import type {
  GameplayBasis,
  PluginSessionDescriptor,
} from "../../shared/protocol/frame.js";
import { immutableCopy } from "./immutable.js";
import type {
  CommandSource,
  SourceCommand,
  SourceContext,
  SourceState,
  SubmitResult,
} from "./types.js";

interface Pending {
  readonly command: SourceCommand;
  readonly resolve: (result: SubmitResult) => void;
  readonly reject: (error: Error) => void;
  accepted: boolean;
}
/** Adapter-private lifecycle. Transport callbacks must belong to this lifetime. */
export function createSourceLifecycle(options: {
  context?: SourceContext;
  send(command: SourceCommand): void;
  recover(): void;
  close(): void;
  timeoutMs?: number;
}) {
  let context = options.context ? immutableCopy(options.context) : null;
  const store = createStore<SourceState>({
    snapshot: null,
    connection: "connecting",
    request: null,
  });
  let session: PluginSessionDescriptor | null = null;
  let basis: GameplayBasis | null = null;
  let pending: Pending | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recovered = false;
  let closed = false;
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const patch = (update: Partial<SourceState>) =>
    store.setState((state) => Object.freeze({ ...state, ...update }));
  const fail = (error: Error) => {
    if (closed) return;
    closed = true;
    clearTimer();
    pending?.reject(error);
    pending = null;
    options.close();
    patch({ connection: "closed", request: null });
  };
  const arm = () => {
    clearTimer();
    timer = setTimeout(() => {
      if (recovered) {
        fail(new Error("Gameplay source recovery timed out."));
        return;
      }
      recovered = true;
      patch({ connection: "recovering" });
      try {
        options.recover();
        if (pending && !pending.accepted) options.send(pending.command);
        arm();
      } catch (error) {
        fail(asError(error));
      }
    }, options.timeoutMs ?? 10_000);
  };
  const finishBarrier = () => {
    if (!pending?.accepted) return;
    const frame = store.get().snapshot;
    if (!frame || frame.version <= pending.command.basis.version) return;
    clearTimer();
    pending = null;
    patch({ request: null, connection: "ready" });
  };
  const start = async (
    operation: "submit" | "cancel",
    interactionId: string,
    params?: unknown,
  ) => {
    const state = store.get();
    if (closed || state.connection !== "ready" || !basis)
      return Promise.reject(new Error("Gameplay source is not open."));
    if (pending)
      return Promise.reject(
        new Error("A gameplay interaction is already pending."),
      );
    const command = immutableCopy(
      PluginToHostPayloadSchema.parse({
        type:
          operation === "cancel" ? "interaction.cancel" : "interaction.submit",
        clientActionId: crypto.randomUUID(),
        basis,
        interactionId,
        ...(operation === "cancel" ? {} : { params }),
      }) as SourceCommand,
    );
    recovered = false;
    const promise = new Promise<SubmitResult>((resolve, reject) => {
      pending = { command, resolve, reject, accepted: false };
    });
    patch({
      request: {
        interactionId,
        operation,
        phase: "awaiting-result",
      },
    });
    arm();
    try {
      options.send(command);
    } catch (error) {
      fail(asError(error));
    }
    return promise;
  };
  const source: CommandSource = {
    store: {
      get: () => store.get(),
      subscribe: (listener) => store.subscribe(listener),
    },
    submit: (interactionId, params) => start("submit", interactionId, params),
    cancel: (interactionId) => start("cancel", interactionId),
    dispose: () => fail(new Error("Gameplay source disposed.")),
  };
  return {
    source,
    retry() {
      if (closed || !pending) return;
      try {
        if (pending.accepted) options.recover();
        else options.send(pending.command);
      } catch (error) {
        fail(asError(error));
      }
    },
    fail,
    recovering() {
      if (!closed) patch({ connection: "recovering" });
    },
    session(value: unknown) {
      if (closed) return;
      const parsed = PluginSessionDescriptorSchema.parse(value);
      if (
        (context?.sessionId ?? session?.sessionId) &&
        parsed.sessionId !== (context?.sessionId ?? session?.sessionId)
      ) {
        fail(new Error("Gameplay session changed."));
        return;
      }
      if (
        context &&
        !parsed.players.some((player) => player.playerId === context!.playerId)
      ) {
        fail(new Error("Gameplay seat is absent from session."));
        return;
      }
      session = immutableCopy(parsed);
    },
    frame(value: unknown) {
      if (closed) return;
      const parsed = PluginGameplayFrameSchema.parse(value);
      if (!session) {
        fail(new Error("Gameplay frame arrived before session metadata."));
        return;
      }
      context ??= {
        sessionId: session.sessionId,
        playerId: parsed.basis.perspectivePlayerId,
      };
      if (parsed.basis.perspectivePlayerId !== context.playerId) {
        fail(new Error("Gameplay perspective changed."));
        return;
      }
      if (
        !session.players.some((player) => player.playerId === context!.playerId)
      ) {
        fail(new Error("Gameplay seat is absent from session."));
        return;
      }
      if (basis && parsed.basis.version < basis.version) return;
      const { basis: nextBasis, ...frame } = immutableCopy(parsed);
      basis = nextBasis;
      patch({
        snapshot: Object.freeze({
          me: context.playerId,
          players: session.players,
          frame: Object.freeze(frame),
          version: basis.version,
        }),
        connection: "ready",
      });
      finishBarrier();
    },
    result(value: unknown) {
      if (closed) return;
      const result = InteractionResultSchema.parse(value);
      if (
        !pending ||
        result.clientActionId !== pending.command.clientActionId ||
        pending.accepted
      )
        return;
      pending.resolve(
        immutableCopy(
          result.accepted
            ? { accepted: true }
            : {
                accepted: false,
                errorCode: result.errorCode,
                ...(result.message === undefined
                  ? {}
                  : { message: result.message }),
              },
        ),
      );
      if (!result.accepted) {
        clearTimer();
        pending = null;
        patch({ request: null, connection: "ready" });
        return;
      }
      pending.accepted = true;
      recovered = false;
      patch({ request: { ...store.get().request!, phase: "awaiting-frame" } });
      arm();
      finishBarrier();
    },
  };
}
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
