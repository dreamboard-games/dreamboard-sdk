import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
} from "../../shared/protocol/protocol.js";
import { HostToPluginEnvelopeSchema } from "../../shared/protocol/schema.js";
import type { PluginToHostPayload } from "../../shared/protocol/protocol.js";
import { createSourceLifecycle } from "./lifecycle.js";
import type { CommandSource } from "./types.js";

/** Pins its parent window, origin and channel at the first valid initialization. */
export function iframeSource(
  options: {
    timeoutMs?: number;
  } = {},
): CommandSource {
  const target = window;
  const parent = target.parent;
  let channel: { id: string; origin: string } | null = null;
  let sequence = 0;
  let receivedSequence = -1;
  const send = (payload: PluginToHostPayload) => {
    if (!channel) throw new Error("Iframe source is not initialized.");
    parent.postMessage(
      {
        protocol: DREAMBOARD_PLUGIN_PROTOCOL,
        version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
        channelId: channel.id,
        sequence: ++sequence,
        payload,
      },
      channel.origin,
    );
  };
  const lifecycle = createSourceLifecycle({
    timeoutMs: options.timeoutMs,
    send,
    recover: () => send({ type: "runtime.resume" }),
    close: () => target.removeEventListener("message", receive),
  });
  function receive(event: MessageEvent) {
    if (event.source !== parent) return;
    const parsed = HostToPluginEnvelopeSchema.safeParse(event.data);
    if (!parsed.success) {
      const data: unknown = event.data;
      if (
        channel &&
        event.origin === channel.origin &&
        typeof data === "object" &&
        data !== null &&
        "channelId" in data &&
        data.channelId === channel.id
      ) {
        try {
          send({
            type: "runtime.error",
            code: "host-runtime-protocol-mismatch",
            message: "Iframe source received an invalid host envelope.",
          });
        } finally {
          lifecycle.fail(new Error("Invalid iframe host envelope."));
        }
      }
      return;
    }
    const envelope = parsed.data;
    if (!channel) {
      if (envelope.payload.type !== "runtime.init") return;
      channel = { id: envelope.channelId, origin: event.origin };
    }
    if (
      channel.id !== envelope.channelId ||
      channel.origin !== event.origin ||
      envelope.sequence <= receivedSequence
    )
      return;
    receivedSequence = envelope.sequence;
    const payload = envelope.payload;
    if (payload.type === "runtime.init") {
      lifecycle.session(payload.session);
      if (lifecycle.source.store.get().connection !== "closed")
        send({ type: "runtime.ready" });
    } else if (payload.type === "gameplay.frame")
      lifecycle.frame(payload.frame);
    else lifecycle.result(payload);
    if (lifecycle.source.store.get().connection !== "closed")
      send({ type: "runtime.ack", sequence: envelope.sequence });
  }
  target.addEventListener("message", receive);
  return lifecycle.source;
}
