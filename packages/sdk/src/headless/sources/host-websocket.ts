import type { PluginSessionDescriptor } from "../../shared/protocol/frame.js";
import {
  ClientGameplayFrameSchema,
  ServerGameplayFrameSchema,
  GameplayCloseCode,
  type ClientGameplayFrame,
  type GameplayCredential,
} from "../../shared/protocol/gameplay-wire.js";
import { createSourceLifecycle } from "./lifecycle.js";
import type { CommandSource, SourceCommand } from "./types.js";

export function hostSource(options: {
  url: string;
  session: PluginSessionDescriptor;
  playerId: string;
  getCredential(): Promise<GameplayCredential>;
  timeoutMs?: number;
}): CommandSource {
  const { url, playerId, getCredential } = options;
  const sessionId = options.session.sessionId;
  let socket: WebSocket | null = null;
  let generation = 0;
  let disposed = false;
  let authenticated = false;
  let queued: SourceCommand | null = null;
  let reconnects = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let snapshotTimer: ReturnType<typeof setTimeout> | undefined;
  let openTimer: ReturnType<typeof setTimeout> | undefined;
  let cleanup = () => {};
  const timeoutMs = options.timeoutMs ?? 10_000;
  const send = (frame: ClientGameplayFrame) => {
    if (!socket || socket.readyState !== WebSocket.OPEN)
      throw new Error("Gameplay socket is not open.");
    socket.send(JSON.stringify(ClientGameplayFrameSchema.parse(frame)));
  };
  const resume = () =>
    send({
      type: "session.resume",
      lastSeenLogCursor: null,
      unacknowledgedClientActionIds: queued ? [queued.clientActionId] : [],
    });
  const lifecycle = createSourceLifecycle({
    context: {
      sessionId,
      playerId,
    },
    timeoutMs,
    send(command) {
      if (!authenticated) {
        queued = command;
        return;
      }
      send(command);
    },
    recover() {
      if (authenticated) resume();
      else if (!openTimer) void connect();
    },
    close() {
      disposed = true;
      generation++;
      clearTimeout(refreshTimer);
      clearTimeout(openTimer);
      clearTimeout(snapshotTimer);
      cleanup();
      socket?.close();
      socket = null;
      queued = null;
    },
  });
  lifecycle.session(options.session);
  async function connect() {
    if (disposed) return;
    const current = ++generation;
    authenticated = false;
    clearTimeout(refreshTimer);
    clearTimeout(openTimer);
    clearTimeout(snapshotTimer);
    cleanup();
    socket?.close();
    socket = null;
    openTimer = setTimeout(
      () =>
        lifecycle.fail(new Error("Gameplay socket authentication timed out.")),
      timeoutMs,
    );
    try {
      const credential = await getCredential();
      if (disposed || current !== generation) return;
      const next = new WebSocket(url);
      socket = next;
      const active = () => !disposed && current === generation;
      const onOpen = () => {
        if (!active()) return;
        try {
          send({
            type: "auth.connect",
            credential,
            sessionId,
            playerId,
          });
        } catch (error) {
          lifecycle.fail(asError(error));
        }
      };
      const onMessage = (event: MessageEvent) => {
        if (!active()) return;
        try {
          const value: unknown = JSON.parse(String(event.data));
          if (typeof value !== "object" || value === null || !("type" in value))
            throw new Error("Invalid gameplay frame.");
          if (
            ![
              "auth.accepted",
              "session.snapshot",
              "interaction.result",
              "gameplay.backpressure",
            ].includes(String(value.type))
          )
            return;
          const frame = ServerGameplayFrameSchema.parse(value);
          if (frame.type === "auth.accepted") {
            clearTimeout(openTimer);
            openTimer = undefined;
            const first = !authenticated;
            authenticated = true;
            if (first) {
              snapshotTimer = setTimeout(
                () => lifecycle.fail(new Error("Gameplay snapshot timed out.")),
                timeoutMs,
              );
              resume();
              if (queued) {
                send(queued);
                queued = null;
              }
            }
            clearTimeout(refreshTimer);
            if (credential.kind === "user") {
              const ttl = Date.parse(frame.expiresAt) - Date.now();
              if (ttl <= 0)
                throw new Error("Gameplay credential is already expired.");
              refreshTimer = setTimeout(
                () => {
                  openTimer = setTimeout(
                    () =>
                      lifecycle.fail(
                        new Error("Gameplay credential refresh timed out."),
                      ),
                    timeoutMs,
                  );
                  void getCredential()
                    .then((updated) => {
                      if (active())
                        send({ type: "auth.refresh", credential: updated });
                    })
                    .catch((error) => {
                      if (active()) lifecycle.fail(asError(error));
                    });
                },
                Math.max(0, ttl - Math.min(60_000, ttl * 0.2)),
              );
            }
          } else if (!authenticated)
            throw new Error("Gameplay frame arrived before authentication.");
          else if (frame.type === "session.snapshot") {
            clearTimeout(snapshotTimer);
            snapshotTimer = undefined;
            reconnects = 0;
            lifecycle.frame(frame.frame);
          } else if (frame.type === "interaction.result")
            lifecycle.result(frame);
          else lifecycle.fail(new Error(frame.message));
        } catch (error) {
          lifecycle.fail(asError(error));
        }
      };
      const onClose = (event: CloseEvent) => {
        if (!active()) return;
        authenticated = false;
        lifecycle.recovering();
        if (
          new Set<number>([
            GameplayCloseCode.CredentialInvalid,
            GameplayCloseCode.RefreshContextMismatch,
            GameplayCloseCode.PermissionDenied,
            GameplayCloseCode.ProtocolViolation,
            GameplayCloseCode.FrameBeforeAuth,
          ]).has(event.code) ||
          reconnects++ > 0
        ) {
          lifecycle.fail(new Error(`Gameplay socket closed (${event.code}).`));
          return;
        }
        void connect();
        lifecycle.retry();
      };
      const onError = () => {
        if (active()) next.close();
      };
      next.addEventListener("open", onOpen);
      next.addEventListener("message", onMessage);
      next.addEventListener("close", onClose);
      next.addEventListener("error", onError);
      cleanup = () => {
        next.removeEventListener("open", onOpen);
        next.removeEventListener("message", onMessage);
        next.removeEventListener("close", onClose);
        next.removeEventListener("error", onError);
      };
    } catch (error) {
      if (!disposed && current === generation) lifecycle.fail(asError(error));
    }
  }
  void connect();
  return lifecycle.source;
}
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
