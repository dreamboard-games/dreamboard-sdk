import { playerSeatColor } from "../../shared/protocol/players.js";
import { createStore } from "@tanstack/store";
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
  PluginPlayerSummary,
} from "../../shared/protocol/frame.js";
import { immutableCopy } from "../../shared/immutable.js";
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
}

/** Adapter-private lifecycle. Transport callbacks must belong to this lifetime. */
export function createSourceLifecycle(options: {
  context?: SourceContext;
  send(command: SourceCommand): void;
  recover(pendingClientActionId?: string): void;
  close(): void;
  timeoutMs?: number;
  followHostSeat?: boolean;
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
  const playerSummaries = new Map<string, PluginPlayerSummary>();
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
        options.recover(pending?.command.clientActionId);
        if (pending) options.send(pending.command);
        if (pending) arm();
      } catch (error) {
        fail(asError(error));
      }
    }, options.timeoutMs ?? 10_000);
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
      pending = { command, resolve, reject };
    });
    publish({
      ...state,
      request: {
        clientActionId: command.clientActionId,
        interactionId,
        operation,
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
        options.send(pending.command);
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
      session ??= immutableCopy(parsed);
      // Hosts repeat initialization until ready; the first delivery wins.
      assetUrls ??= Object.fromEntries(
        Object.entries(assets ?? {}).map(([path, blob]) => [
          path,
          URL.createObjectURL(blob),
        ]),
      );
    },
    frame(value: unknown, acknowledgedClientActionId?: string) {
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
      if (parsed.basis.sessionId !== context.sessionId) {
        fail(new Error("Gameplay authority session changed."));
        return;
      }
      const changedSeat = parsed.basis.perspectivePlayerId !== context.playerId;
      if (changedSeat && !options.followHostSeat) {
        fail(new Error("Gameplay perspective changed."));
        return;
      }
      if (!parsed.players.includes(parsed.basis.perspectivePlayerId)) {
        fail(new Error("Gameplay seat is absent from session."));
        return;
      }
      if (changedSeat) {
        clearTimer();
        pending?.reject(new Error("Gameplay perspective changed."));
        pending = null;
        recovered = false;
        context = { ...context, playerId: parsed.basis.perspectivePlayerId };
      }
      const confirmed =
        pending && pending.command.clientActionId === acknowledgedClientActionId
          ? pending
          : null;
      if (confirmed) {
        clearTimer();
        pending = null;
        recovered = false;
      }
      if (!changedSeat && basis && parsed.basis.version <= basis.version) {
        if (confirmed || store.get().connection === "recovering") {
          publish({
            ...store.get(),
            snapshot: store.get().snapshot!,
            request: confirmed ? null : store.get().request,
            connection: "ready",
            failure: null,
          });
        }
        confirmed?.resolve({ accepted: true });
        return;
      }
      const { basis: nextBasis, ...frame } = immutableCopy(
        withCardImageUrls(parsed, assetUrls),
      );
      basis = nextBasis;
      publish({
        failure: null,
        request: changedSeat || confirmed ? null : store.get().request,
        snapshot: Object.freeze({
          me: context.playerId,
          players: Object.freeze(
            frame.players.map((playerId, index) => {
              let summary = playerSummaries.get(playerId);
              if (!summary) {
                const metadata = session!.players.find(
                  (player) => player.playerId === playerId,
                );
                summary = Object.freeze({
                  playerId,
                  displayName: metadata?.displayName ?? `Player ${index + 1}`,
                  color: metadata?.color ?? playerSeatColor(index),
                });
                playerSummaries.set(playerId, summary);
              }
              return summary;
            }),
          ),
          ...(frame.causedBy === undefined ? {} : { causedBy: frame.causedBy }),
          frame: Object.freeze(frame),
          version: basis.version,
        }),
        connection: "ready",
      });
      confirmed?.resolve({ accepted: true });
    },
    result(value: unknown) {
      if (closed) return;
      const result = InteractionResultSchema.parse(value);
      if (!pending || result.clientActionId !== pending.command.clientActionId)
        return;
      const rejected = pending;
      clearTimer();
      pending = null;
      publish({
        snapshot: store.get().snapshot!,
        request: null,
        connection: "ready",
        failure: null,
      });
      rejected.resolve(
        immutableCopy({
          accepted: false,
          errorCode: result.errorCode,
          ...(result.message === undefined ? {} : { message: result.message }),
        }),
      );
    },
  };
}
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Replaces card image paths in card views and hidden card backs with delivered URLs. */
function withCardImageUrls(
  frame: PluginGameplayFrame,
  urls: Readonly<Record<string, string>> | null,
): PluginGameplayFrame {
  if (urls === null || Object.keys(urls).length === 0) return frame;
  return {
    ...frame,
    zones: Object.fromEntries(
      Object.entries(frame.zones).map(([zoneId, hosts]) => [
        zoneId,
        Object.fromEntries(
          Object.entries(hosts).map(([hostId, zone]) => [
            hostId,
            {
              ...zone,
              cardViewsById: Object.fromEntries(
                Object.entries(zone.cardViewsById).map(([cardId, card]) => [
                  cardId,
                  {
                    ...card,
                    frontImage:
                      card.frontImage === undefined
                        ? undefined
                        : (urls[card.frontImage] ?? card.frontImage),
                    backImage:
                      card.backImage === undefined
                        ? undefined
                        : (urls[card.backImage] ?? card.backImage),
                  },
                ]),
              ),
              cardBacksById: Object.fromEntries(
                Object.entries(zone.cardBacksById).map(([cardId, path]) => [
                  cardId,
                  urls[path] ?? path,
                ]),
              ),
            },
          ]),
        ),
      ]),
    ),
  };
}
