import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useArmedInteraction,
  useInteractionDraft,
  useInteractionSubmitting,
  useInteractionUiStore,
} from "../context/InteractionDraftContext.js";
import { useClientParamSchema } from "../context/ClientParamSchemaContext.js";
import { usePluginState } from "../context/PluginStateContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import {
  ValidationError,
  validationErrorFromUnknown,
} from "../errors/ValidationError.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  applyInteractionInputDefaults,
  hasInteractionFieldErrors,
  interactionArmScope,
  interactionInputKeys,
  mergeInteractionFieldErrors,
  validateInteractionInputDomains,
} from "../utils/interaction-inputs.js";
import {
  applyInteractionDraftMutation,
  claimInteractionSubmit,
  clearInteractionRoute,
  getInteractionDraftReadiness,
  shouldAutoSubmitInteraction,
} from "../utils/interaction-router.js";
import {
  interactionUnavailableReason,
  isInteractionAvailable,
} from "../utils/interaction-status.js";

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
  const runtime = useRuntimeContext();
  const { controllingPlayerId } = usePluginSession();
  const store = useInteractionUiStore();
  const submittingRef = useRef(false);
  const autoSubmitSignatureRef = useRef<string | null>(null);
  const simultaneousPhase = usePluginState(
    (state) => state.gameplay.simultaneousPhase,
  );

  const { interactionId, interactionKey, phaseName } = descriptor;
  const armScope = interactionArmScope(descriptor);
  const inputKeys = useMemo(
    () => interactionInputKeys(descriptor),
    [descriptor],
  );
  const paramsSchema = useClientParamSchema(phaseName, interactionId);
  const draft = useInteractionDraft(interactionKey) as Readonly<
    Partial<Params>
  >;
  const values = useMemo(
    () =>
      applyInteractionInputDefaults<Params>(descriptor, draft) as Readonly<
        Partial<Params> & Pick<Params, DefaultedKeys>
      >,
    [descriptor, draft],
  );
  const armedId = useArmedInteraction(armScope);
  const isArmed = armedId === interactionKey;
  const submitting = useInteractionSubmitting(interactionKey);
  const submitted =
    controllingPlayerId !== null &&
    simultaneousPhase?.phaseName === phaseName &&
    simultaneousPhase.interactionId === interactionId &&
    simultaneousPhase.sealedPlayerIds.includes(controllingPlayerId);
  const status: InteractionHandleStatus = submitted
    ? "submitted"
    : submitting
      ? "submitting"
      : "open";

  const isReady = useMemo(() => {
    return getInteractionDraftReadiness(
      descriptor,
      values as Record<string, unknown>,
    ).ready;
  }, [descriptor, values]);

  const requirePlayer = useCallback(() => {
    if (!controllingPlayerId) {
      throw new Error("useInteractionHandle: no controlling player available");
    }
    return controllingPlayerId;
  }, [controllingPlayerId]);

  const submit = useCallback(
    async (params?: Params) => {
      if (status !== "open" || submittingRef.current) {
        throw new ValidationError(
          status === "submitted" ? "ALREADY_SUBMITTED" : "SUBMITTING",
          status === "submitted"
            ? "Interaction has already been submitted."
            : "Interaction submission is already in progress.",
        );
      }
      if (!claimInteractionSubmit(store, descriptor)) {
        throw new ValidationError(
          "SUBMITTING",
          "Interaction submission is already in progress.",
        );
      }
      submittingRef.current = true;
      const finalParams = applyInteractionInputDefaults<Params>(
        descriptor,
        params ?? values,
      ) as Params;
      try {
        await runtime.submitInteraction(
          requirePlayer(),
          interactionId,
          finalParams as Record<string, unknown>,
        );
        clearInteractionRoute(store, descriptor);
      } catch (error) {
        throw validationErrorFromUnknown(error);
      } finally {
        submittingRef.current = false;
        store.setSubmitting(interactionKey, false);
      }
    },
    [
      descriptor,
      values,
      runtime,
      requirePlayer,
      interactionId,
      interactionKey,
      store,
      status,
    ],
  );

  const validate = useCallback(
    async (params?: Params) => {
      const finalParams = applyInteractionInputDefaults<Params>(
        descriptor,
        params ?? values,
      ) as Params;
      const result = await runtime.validateInteraction(
        requirePlayer(),
        interactionId,
        finalParams as Record<string, unknown>,
      );
      if (!result.valid) {
        throw new ValidationError(result.errorCode, result.message);
      }
    },
    [descriptor, values, runtime, requirePlayer, interactionId],
  );

  const validateDraft = useCallback((): DraftValidation<Params> => {
    const rawDraft = { ...values } as Record<string, unknown>;
    const required = inputKeys;
    const missing = getInteractionDraftReadiness(descriptor, rawDraft)
      .missingInputs as Array<keyof Params & string>;
    const domainFieldErrors = validateInteractionInputDomains(
      descriptor,
      rawDraft,
    ) as Partial<Record<keyof Params & string, readonly string[]>>;

    if (!paramsSchema) {
      if (missing.length > 0 || hasInteractionFieldErrors(domainFieldErrors)) {
        return {
          ok: false,
          fieldErrors: domainFieldErrors,
          formErrors: [],
          missing,
        };
      }
      return {
        ok: true,
        params: rawDraft as Params,
        fieldErrors: {},
        formErrors: [],
        missing: [],
      };
    }

    const result = paramsSchema.safeParse(rawDraft);
    if (result.success) {
      if (hasInteractionFieldErrors(domainFieldErrors)) {
        return {
          ok: false,
          fieldErrors: domainFieldErrors,
          formErrors: [],
          missing,
        };
      }
      return {
        ok: true,
        params: result.data as Params,
        fieldErrors: {},
        formErrors: [],
        missing: [],
      };
    }

    const fieldErrors: Partial<
      Record<keyof Params & string, readonly string[]>
    > = {};
    const formErrors: string[] = [];
    const missingSet = new Set<PropertyKey>(missing);
    for (const issue of result.error.issues) {
      const [first] = issue.path;
      if (typeof first === "string" && required.includes(first)) {
        if (missingSet.has(first)) continue;
        const key = first as keyof Params & string;
        fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
      } else {
        formErrors.push(issue.message);
      }
    }
    return {
      ok: false,
      fieldErrors: mergeInteractionFieldErrors(
        fieldErrors,
        domainFieldErrors,
      ) as Partial<Record<keyof Params & string, readonly string[]>>,
      formErrors,
      missing,
    };
  }, [descriptor, values, inputKeys, paramsSchema]);

  const validateDraftServer = useCallback(async () => {
    await validate({ ...values } as Params);
  }, [values, validate]);

  const submitDraft = useCallback(async () => {
    const validation = validateDraft();
    if (!validation.ok) {
      const message =
        validation.formErrors[0] ??
        Object.values(validation.fieldErrors).flat()[0] ??
        (validation.missing.length > 0
          ? "Required inputs are missing"
          : "Draft validation failed");
      throw new ValidationError("INVALID_DRAFT", message);
    }
    await submit(validation.params);
  }, [submit, validateDraft]);

  useEffect(() => {
    if (!shouldAutoSubmitInteraction(descriptor)) {
      autoSubmitSignatureRef.current = null;
      return;
    }
    if (!isInteractionAvailable(descriptor) || status !== "open" || !isReady) {
      if (!isReady) autoSubmitSignatureRef.current = null;
      return;
    }
    const validation = validateDraft();
    if (!validation.ok) return;
    const signature = `${interactionKey}:${JSON.stringify(validation.params)}`;
    if (autoSubmitSignatureRef.current === signature) return;
    autoSubmitSignatureRef.current = signature;
    void submit(validation.params).catch(() => {
      // Runtime error channels surface the failure. Keep the draft intact and
      // suppress repeated attempts until the player changes the draft.
    });
  }, [
    descriptor.availability,
    descriptor.commit.mode,
    descriptor.inputs,
    interactionKey,
    isReady,
    status,
    submit,
    validateDraft,
  ]);

  const setInput = useCallback(
    <K extends keyof Params & string>(key: K, value: Params[K]) => {
      applyInteractionDraftMutation(store, descriptor, [{ key, value }]);
    },
    [store, descriptor],
  );

  const clearInput = useCallback(
    (key?: keyof Params & string) => {
      store.clearInput(interactionKey, key);
    },
    [store, interactionKey],
  );

  const arm = useCallback(() => {
    store.arm(armScope, interactionKey);
  }, [store, armScope, interactionKey]);

  const disarm = useCallback(() => {
    if (store.getArmed(armScope) === interactionKey) {
      store.arm(armScope, null);
    }
  }, [store, armScope, interactionKey]);

  return {
    descriptor,
    commit: descriptor.commit,
    available: isInteractionAvailable(descriptor),
    unavailableReason: interactionUnavailableReason(descriptor),
    status,
    submit,
    validate,
    validateDraft,
    validateDraftServer,
    submitDraft,
    draft,
    values,
    setInput,
    clearInput,
    isReady,
    isArmed,
    arm,
    disarm,
  };
}
