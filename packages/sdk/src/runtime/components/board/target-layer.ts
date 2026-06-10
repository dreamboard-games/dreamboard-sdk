/**
 * Runtime extension of the ui target-layer types. The base shapes and the
 * render-state computation live in `src/ui/components/board/target-layer.ts`;
 * this module only widens the per-target state with the interaction metadata
 * the runtime layer attaches (interaction keys, conflict tracking, gameplay
 * browser attributes).
 */
import type { BoardTargetKind } from "../../utils/interaction-inputs.js";
import type { BrowserInteractionAttributeMap } from "../../../browser-interaction/index.js";
import type { InteractiveTargetState as BaseInteractiveTargetState } from "../../../ui/components/board/target-layer.js";

export interface InteractiveTargetState extends BaseInteractiveTargetState {
  kind?: BoardTargetKind;
  interactionKey?: string;
  interactionId?: string;
  inputKey?: string;
  conflictInteractionKeys?: readonly string[];
  browserAttributes?: BrowserInteractionAttributeMap;
}

export interface InteractiveTargetLayer {
  enabled?: boolean;
  eligible?: ReadonlySet<string>;
  selectTargetId?: (targetId: string) => unknown | Promise<unknown>;
  targetState?: (targetId: string) => Partial<InteractiveTargetState>;
}
