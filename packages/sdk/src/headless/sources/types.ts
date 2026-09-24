import type { Store } from "@tanstack/store";
import type {
  CancelInteractionCommand,
  SubmitInteractionCommand,
} from "../../shared/protocol/protocol.js";
import type {
  PluginGameplayFrame,
  PluginPlayerSummary,
} from "../../shared/protocol/frame.js";
import type { RuntimeJson } from "../../shared/runtime-json.js";

export type SourceCommand = SubmitInteractionCommand | CancelInteractionCommand;
export interface SourceContext {
  readonly sessionId: string;
  readonly playerId: string;
}
export interface SourceSnapshot {
  readonly me: string;
  readonly players: readonly PluginPlayerSummary[];
  readonly frame: Omit<PluginGameplayFrame, "basis">;
  readonly version: number;
}
export type SubmitResult =
  | { readonly accepted: true }
  | {
      readonly accepted: false;
      readonly errorCode: string;
      readonly message?: string;
    };
export interface SourceState {
  readonly snapshot: SourceSnapshot | null;
  readonly connection: "connecting" | "ready" | "recovering" | "closed";
  readonly request: {
    readonly interactionId: string;
    readonly operation: "submit" | "cancel";
    readonly phase: "awaiting-result" | "awaiting-frame";
  } | null;
}
export interface GameSource {
  readonly store: Pick<Store<SourceState>, "get" | "subscribe">;
  dispose(): void;
}
export interface CommandSource extends GameSource {
  submit(interactionId: string, params: RuntimeJson): Promise<SubmitResult>;
  cancel(interactionId: string): Promise<SubmitResult>;
}
/** Testing-owned sources can add local actions without widening hosted sources. */
export interface ApplySource<Action, Result = void> extends GameSource {
  apply(action: Action): Result;
}
