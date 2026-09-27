import { createStore } from "@tanstack/store";
import { z } from "zod";
import type { ViewCard } from "../../shared/domain/cards.js";
import {
  PluginGameplayFrameSchema,
  PluginSessionDescriptorSchema,
  InteractionResultSchema,
  PluginToHostPayloadSchema,
} from "../../shared/protocol/schema.js";
import type {
  GameplayBasis,
  PluginGameplayFrame,
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

const CardImageViewSchema = z.looseObject({
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
}) satisfies z.ZodType<Pick<ViewCard, "frontImage" | "backImage">>;

/** Adapter-private lifecycle. Transport callbacks must belong to this lifetime. */
export function createSourceLifecycle(options: {
  context?: SourceContext;
  send(command: SourceCommand): void;
  recover(): void;
  close(): void;
  timeoutMs?: number;
}) {
  let context = options.context ? immutableCopy(options.context) : null;
  const store = createStore<SourceState>(
    Object.freeze({
      snapshot: null,
      connection: "connecting",
      request: null,
      failure: null,
    }),
  );
  let session: Omit<PluginSessionDescriptor, "assets"> | null = null;
  let assetUrls: Readonly<Record<string, string>> | null = null;
  let basis: GameplayBasis | null = null;
  let pending: Pending | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recovered = false;
  let closed = false;
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const publish = (state: SourceState) => {
    if (state.request) Object.freeze(state.request);
    store.setState(() => Object.freeze(state));
  };
  const recovering = () => {
    if (closed) return;
    publish({ ...store.get(), connection: "recovering", failure: null });
  };
  const close = (failure: Error | null) => {
    if (closed) return;
    closed = true;
    clearTimer();
    for (const url of Object.values(assetUrls ?? {})) URL.revokeObjectURL(url);
    pending?.reject(failure ?? new Error("Gameplay source disposed."));
    pending = null;
    options.close();
    const snapshot = store.get().snapshot;
    publish(
      failure
        ? {
            connection: "failed",
            snapshot,
            request: null,
            failure: Object.freeze(failure),
          }
        : { connection: "closed", snapshot, request: null, failure: null },
    );
  };
  const fail = (error: Error) => close(error);
  const arm = () => {
    clearTimer();
    timer = setTimeout(() => {
      if (recovered) {
        fail(new Error("Gameplay source recovery timed out."));
        return;
      }
      recovered = true;
      recovering();
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
    publish({
      snapshot: frame,
      request: null,
      connection: "ready",
      failure: null,
    });
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
    publish({
      ...state,
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
    dispose: () => close(null),
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
    recovering,
    session(value: unknown) {
      if (closed) return;
      const { assets, ...parsed } = PluginSessionDescriptorSchema.parse(value);
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
      // Hosts repeat initialization until ready; the first delivery wins.
      assetUrls ??= Object.fromEntries(
        Object.entries(assets ?? {}).map(([path, blob]) => [
          path,
          URL.createObjectURL(blob),
        ]),
      );
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
      const { basis: nextBasis, ...frame } = immutableCopy(
        withCardImageUrls(parsed, assetUrls),
      );
      basis = nextBasis;
      publish({
        failure: null,
        request: store.get().request,
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
        publish({
          snapshot: store.get().snapshot!,
          request: null,
          connection: "ready",
          failure: null,
        });
        return;
      }
      pending.accepted = true;
      recovered = false;
      const state = store.get();
      // A pending command was submitted from ready, so its snapshot exists.
      publish({
        connection: state.connection === "recovering" ? "recovering" : "ready",
        snapshot: state.snapshot!,
        failure: null,
        request: { ...state.request!, phase: "awaiting-frame" },
      });
      arm();
      finishBarrier();
    },
  };
}
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Replaces card image paths in encoded card views with delivered URLs. */
function withCardImageUrls(
  frame: PluginGameplayFrame,
  urls: Readonly<Record<string, string>> | null,
): PluginGameplayFrame {
  if (urls === null || Object.keys(urls).length === 0) return frame;
  const resolve = (encoded: string) => {
    const card = CardImageViewSchema.parse(JSON.parse(encoded) as unknown);
    for (const key of ["frontImage", "backImage"] as const) {
      const path = card[key];
      const url = path === undefined ? undefined : urls[path];
      if (url !== undefined) card[key] = url;
    }
    return JSON.stringify(card);
  };
  return {
    ...frame,
    zones: Object.fromEntries(
      Object.entries(frame.zones).map(([zoneId, zone]) => [
        zoneId,
        {
          ...zone,
          cardViewsById: Object.fromEntries(
            Object.entries(zone.cardViewsById).map(([cardId, encoded]) => [
              cardId,
              resolve(encoded),
            ]),
          ),
        },
      ]),
    ),
  };
}
