import {
  DREAMBOARD_PLUGIN_PROTOCOL,
  DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
  HostToPluginEnvelopeSchema,
  type HostToPluginEnvelope,
  type PluginToHostPayload,
} from "@dreamboard-games/plugin-runtime-contract";
import type { PluginTransport } from "../core/types.js";

export interface PostMessagePluginTransportOptions {
  readonly targetWindow?: Window;
  readonly parentWindow?: Window;
  readonly onInvalidMessage?: (reason: string, value: unknown) => void;
}

export function createPostMessagePluginTransport(
  options: PostMessagePluginTransportOptions = {},
): PluginTransport {
  const targetWindow = options.targetWindow ?? window;
  const parentWindow = options.parentWindow ?? targetWindow.parent;
  let channel:
    | {
        readonly channelId: string;
        readonly hostOrigin: string;
        readonly hostWindow: Window;
      }
    | null = null;
  let outboundSequence = 0;

  return {
    start(onMessage) {
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== parentWindow) {
          return;
        }
        const parseResult = HostToPluginEnvelopeSchema.safeParse(event.data);
        if (!parseResult.success) {
          options.onInvalidMessage?.("invalid-envelope", event.data);
          return;
        }
        const envelope = parseResult.data;
        if (!channel) {
          if (envelope.payload.type !== "runtime.init") {
            return;
          }
          channel = {
            channelId: envelope.channelId,
            hostOrigin: event.origin,
            hostWindow: event.source as Window,
          };
        }
        if (
          envelope.channelId !== channel.channelId ||
          event.origin !== channel.hostOrigin ||
          event.source !== channel.hostWindow
        ) {
          options.onInvalidMessage?.("channel-mismatch", event.data);
          return;
        }
        onMessage(envelope as HostToPluginEnvelope);
      };

      targetWindow.addEventListener("message", handleMessage);
      return () => {
        targetWindow.removeEventListener("message", handleMessage);
        channel = null;
      };
    },
    send(payload: PluginToHostPayload) {
      if (!channel) {
        throw new Error("Plugin transport is not initialized.");
      }
      channel.hostWindow.postMessage(
        {
          protocol: DREAMBOARD_PLUGIN_PROTOCOL,
          version: DREAMBOARD_PLUGIN_PROTOCOL_VERSION,
          channelId: channel.channelId,
          sequence: ++outboundSequence,
          payload,
        },
        channel.hostOrigin,
      );
    },
  };
}
