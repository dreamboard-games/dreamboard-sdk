import type {
  InteractionDescriptor,
  PlayerId,
  PluginGameplayFrame,
  PluginSessionDescriptor,
} from "./frame.js";
import type { RuntimeJson } from "./json.js";

export const DREAMBOARD_PLUGIN_PROTOCOL = "dreamboard-plugin" as const;
export const DREAMBOARD_PLUGIN_PROTOCOL_VERSION = 3 as const;

export interface ValidationResult {
  readonly valid: boolean;
  readonly errorCode?: string;
  readonly message?: string;
}

export type SubmissionResult =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly errorCode: string;
      readonly message?: string;
    };

export interface PluginInteractionBasis {
  readonly gameVersion: number;
  readonly actionSetVersion: string;
  readonly perspectivePlayerId: PlayerId | null;
}

export interface ValidateInteractionCommand {
  readonly type: "interaction.validate";
  readonly requestId: string;
  readonly basis: PluginInteractionBasis;
  readonly interactionId: string;
  readonly params: RuntimeJson;
}

export interface SubmitInteractionCommand {
  readonly type: "interaction.submit";
  readonly requestId: string;
  readonly basis: PluginInteractionBasis;
  readonly interactionId: string;
  readonly params: RuntimeJson;
}

export type HostToPluginPayload =
  | {
      readonly type: "runtime.init";
      readonly session: PluginSessionDescriptor;
    }
  | {
      readonly type: "gameplay.frame";
      readonly frame: PluginGameplayFrame;
    }
  | {
      readonly type: "interaction.validation-result";
      readonly requestId: string;
      readonly result: ValidationResult;
    }
  | {
      readonly type: "interaction.submit-result";
      readonly requestId: string;
      readonly result: SubmissionResult;
    };

export type PluginToHostPayload =
  | { readonly type: "runtime.ready" }
  | {
      readonly type: "runtime.ack";
      /** Echoes the host envelope sequence. It is delivery order only. */
      readonly sequence: number;
      readonly clientReceivedAtMs?: number;
      readonly clientRenderedAtMs?: number;
    }
  | ValidateInteractionCommand
  | SubmitInteractionCommand
  | {
      readonly type: "runtime.error";
      readonly message: string;
      readonly code?: string;
    };

export interface PluginProtocolEnvelope<Payload> {
  readonly protocol: typeof DREAMBOARD_PLUGIN_PROTOCOL;
  readonly version: typeof DREAMBOARD_PLUGIN_PROTOCOL_VERSION;
  readonly channelId: string;
  /** Delivery order only. It is not a game revision. */
  readonly sequence: number;
  readonly payload: Payload;
}

export type HostToPluginEnvelope = PluginProtocolEnvelope<HostToPluginPayload>;
export type PluginToHostEnvelope = PluginProtocolEnvelope<PluginToHostPayload>;

export interface PluginProtocolFrame {
  readonly id: string;
  readonly frame: PluginGameplayFrame;
  readonly projectionDigest: string;
}

export interface PluginProtocolTape {
  readonly session: PluginSessionDescriptor;
  readonly frames: readonly PluginProtocolFrame[];
  readonly steps: readonly PluginProtocolStep[];
}

export type PluginProtocolStep =
  | {
      readonly id: string;
      readonly kind: "host.frame";
      readonly frameId: string;
    }
  | {
      readonly id: string;
      readonly kind: "client.validate";
      readonly fromFrameId: string;
      readonly requestDigest: string;
      readonly response: ValidationResult;
    }
  | {
      readonly id: string;
      readonly kind: "client.submit";
      readonly fromFrameId: string;
      readonly requestDigest: string;
      readonly response: SubmissionResult;
    };

export type ActionSetVersionInput = {
  readonly gameVersion: number;
  readonly availableInteractions: readonly InteractionDescriptor[];
};
