import type {
  HostToPluginEnvelope,
  PluginGameplayFrame,
  PluginSessionDescriptor,
  PluginToHostPayload,
  SubmissionResult,
  ValidationResult,
} from "@dreamboard-games/plugin-runtime-contract";

export interface RuntimeClock {
  now(): number;
}

export interface RuntimeIdFactory {
  nextId(prefix: string): string;
}

export interface PluginTransport {
  start(onMessage: (message: HostToPluginEnvelope) => void): () => void;
  send(message: PluginToHostPayload): void;
}

export interface PluginRuntimeClient {
  getSession(): PluginSessionDescriptor | null;
  subscribeSession(listener: () => void): () => void;
  getFrame(): PluginGameplayFrame | null;
  subscribeFrame(listener: () => void): () => void;
  validateInteraction(
    interactionId: string,
    params: unknown,
  ): Promise<ValidationResult>;
  submitInteraction(interactionId: string, params: unknown): Promise<void>;
  disconnect(): void;
}

export interface PluginRuntimeClientOptions {
  transport: PluginTransport;
  idFactory?: RuntimeIdFactory;
  clock?: RuntimeClock;
  requestTimeoutMs?: number;
}
