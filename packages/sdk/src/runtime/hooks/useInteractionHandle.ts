import type { InteractionDescriptor } from "../types/plugin-state.js";
import { useBoundInteractionHandle } from "./useBoundInteractionHandle.js";

/**
 * Anything that can be used as a submit params object. Subset of TS
 * objects so generic defaults and `keyof Params & string` hold.
 */
export type InteractionParamsShape = Record<string, unknown>;

export type InteractionHandleStatus = "open" | "submitting" | "submitted";

export type DraftValidation<
  Params extends InteractionParamsShape = InteractionParamsShape,
> =
  | {
      ok: true;
      params: Params;
      fieldErrors: Partial<Record<keyof Params & string, readonly string[]>>;
      formErrors: readonly string[];
      missing: ReadonlyArray<keyof Params & string>;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof Params & string, readonly string[]>>;
      formErrors: readonly string[];
      missing: ReadonlyArray<keyof Params & string>;
    };

/**
 * Bound handle around an {@link InteractionDescriptor}. Surfaces call into
 * this hook to submit/validate an interaction, track draft input state for
 * multi-step prompts, and arm/disarm themselves on a surface.
 *
 * Availability flags are mirrored from the authoritative descriptor; UI
 * MUST NOT recompute eligibility locally.
 *
 * When the surrounding workspace knows the concrete params shape (e.g.
 * obtained from the generated `InteractionParamsOf<Id>` alias), parameterise
 * this handle on `Params` so `submit`, `draft`, and `setInput` are all
 * statically typed. The default `Record<string, unknown>` preserves the
 * loosely-typed fallback for generic infrastructure.
 */
export interface InteractionHandle<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
> {
  descriptor: InteractionDescriptor;
  /** Draft commit policy projected by the reducer. */
  commit: InteractionDescriptor["commit"];
  /**
   * Submit the interaction. When `params` is omitted the current draft (as
   * mutated by {@link InteractionHandle.setInput}) is used instead, which is
   * the common case for multi-input prompts.
   */
  submit: (params?: Params) => Promise<void>;
  /** Run server validation using `params` (or the current draft by default). */
  validate: (params?: Params) => Promise<void>;
  /** Run local generated client-schema validation against the current draft. */
  validateDraft: () => DraftValidation<Params>;
  /** Run server validation against the current draft. */
  validateDraftServer: () => Promise<void>;
  /**
   * Validate the current draft locally, submit parsed params, then clear the
   * draft only when submission succeeds.
   */
  submitDraft: () => Promise<void>;
  /** Derived from `descriptor.availability`. */
  available: boolean;
  /** Derived from `descriptor.availability`. */
  unavailableReason?: string;
  /** Local/authoritative progress for this interaction. */
  status: InteractionHandleStatus;

  // --- Draft state --------------------------------------------------------

  /** Live draft values for this interaction. Empty object when unset. */
  draft: Readonly<Partial<Params>>;
  /**
   * Draft values with authored input defaults applied. Fields with declared
   * defaults are typed as present; other draft fields remain partial.
   */
  values: Readonly<Partial<Params> & Pick<Params, DefaultedKeys>>;
  /** Set a single input on the draft. */
  setInput: <K extends keyof Params & string>(key: K, value: Params[K]) => void;
  /** Clear a single input (or the whole draft when `key` is omitted). */
  clearInput: (key?: keyof Params & string) => void;
  /**
   * True when every key declared on `descriptor.inputs` has a value in
   * the draft. Falls back to `true` when the descriptor declares no inputs.
   */
  isReady: boolean;
  /**
   * True when this interaction is the currently armed one on its surface.
   * Armed interactions are the ones that board primitives use
   * to highlight eligible targets and route clicks.
   */
  isArmed: boolean;
  /** Arm this interaction on its surface (disarms any previously armed). */
  arm: () => void;
  /** Disarm this interaction (if it was armed). */
  disarm: () => void;
}

/**
 * Bind an {@link InteractionDescriptor} to submit/validate helpers plus
 * draft + arming state. Use this from any surface; draft state is shared
 * across components through {@link InteractionUiProvider}, which
 * `PluginRuntime` auto-mounts.
 *
 * Example:
 * ```tsx
 * const handle = useInteractionHandle(placeThing);
 * handle.setInput("cardId", card.id);
 * handle.setInput("ringId", ring.id);
 * if (handle.isReady) await handle.submit();
 * ```
 */
export function useInteractionHandle<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(descriptor: InteractionDescriptor): InteractionHandle<Params, DefaultedKeys> {
  return useBoundInteractionHandle<Params, DefaultedKeys>(descriptor)!;
}
