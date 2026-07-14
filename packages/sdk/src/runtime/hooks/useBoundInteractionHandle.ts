import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useArmedInteraction,
  useInteractionDraft,
  useInteractionSubmitting,
  useInteractionUiStore,
} from "../context/InteractionDraftContext.js";
import { useClientParamSchema } from "../context/ClientParamSchemaContext.js";
import { usePluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import { usePluginSession } from "../context/PluginSessionContext.js";
import { useRuntimeContext } from "../context/RuntimeContext.js";
import {
  ValidationError,
  validationErrorFromUnknown,
} from "../../ui/errors/ValidationError.js";
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
import type {
  DraftValidation,
  InteractionHandle,
  InteractionHandleStatus,
  InteractionParamsShape,
} from "./useInteractionHandle.js";

const MISSING_INTERACTION_KEY = "__dreamboard_missing_interaction__";
const MISSING_INTERACTION_SCOPE = "interaction:missing";

export function useBoundInteractionHandle<
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  descriptor: InteractionDescriptor | null,
): InteractionHandle<Params, DefaultedKeys> | null {
  const runtime = useRuntimeContext();
  const { controllingPlayerId } = usePluginSession();
  const store = useInteractionUiStore();
  const autoSubmitSignatureRef = useRef<string | null>(null);
  const simultaneousPhase = usePluginGameplayFrameSelector(
    (frame) => frame.flow.simultaneousPhase,
  );

  const interactionId = descriptor?.interactionId ?? "";
  const interactionKey = descriptor?.interactionKey ?? MISSING_INTERACTION_KEY;
  const phaseName = descriptor?.phaseName;
  const armScope = descriptor
    ? interactionArmScope(descriptor)
    : MISSING_INTERACTION_SCOPE;
  const inputKeys = useMemo(
    () => (descriptor ? interactionInputKeys(descriptor) : []),
    [descriptor],
  );
  const paramsSchema = useClientParamSchema(phaseName, interactionId);
  const draft = useInteractionDraft(interactionKey) as Readonly<
    Partial<Params>
  >;
  const values = useMemo(() => {
    if (!descriptor) {
      return {} as Readonly<Partial<Params> & Pick<Params, DefaultedKeys>>;
    }
    return applyInteractionInputDefaults<Params>(descriptor, draft) as Readonly<
      Partial<Params> & Pick<Params, DefaultedKeys>
    >;
  }, [descriptor, draft]);
  const armedId = useArmedInteraction(armScope);
  const isArmed = descriptor ? armedId === interactionKey : false;
  const submitting = useInteractionSubmitting(interactionKey);
  const submitted =
    descriptor !== null &&
    controllingPlayerId !== null &&
    simultaneousPhase?.phaseName === descriptor.phaseName &&
    simultaneousPhase.interactionId === descriptor.interactionId &&
    simultaneousPhase.sealedPlayerIds.includes(controllingPlayerId);
  const status: InteractionHandleStatus = submitted
    ? "submitted"
    : submitting
      ? "submitting"
      : "open";

  const readiness = useMemo(() => {
    if (!descriptor) {
      return null;
    }
    return getInteractionDraftReadiness(
      descriptor,
      values as Record<string, unknown>,
    );
  }, [descriptor, values]);
  const isReady = readiness?.ready ?? false;

  const requireDescriptor = useCallback(() => {
    if (!descriptor) {
      throw new Error(
        "useInteractionHandle: interaction descriptor unavailable",
      );
    }
    return descriptor;
  }, [descriptor]);

  const submit = useCallback(
    async (params?: Params) => {
      const activeDescriptor = requireDescriptor();
      if (status !== "open") {
        throw new ValidationError(
          status === "submitted" ? "ALREADY_SUBMITTED" : "SUBMITTING",
          status === "submitted"
            ? "Interaction has already been submitted."
            : "Interaction submission is already in progress.",
        );
      }
      if (!claimInteractionSubmit(store, activeDescriptor)) {
        throw new ValidationError(
          "SUBMITTING",
          "Interaction submission is already in progress.",
        );
      }
      const finalParams = applyInteractionInputDefaults<Params>(
        activeDescriptor,
        params ?? values,
      ) as Params;
      try {
        await runtime.submitInteraction(
          activeDescriptor.interactionId,
          finalParams as Record<string, unknown>,
        );
        clearInteractionRoute(store, activeDescriptor);
      } catch (error) {
        throw validationErrorFromUnknown(error);
      } finally {
        store.setSubmitting(activeDescriptor.interactionKey, false);
      }
    },
    [requireDescriptor, status, store, values, runtime],
  );

  const validate = useCallback(
    async (params?: Params) => {
      const activeDescriptor = requireDescriptor();
      const finalParams = applyInteractionInputDefaults<Params>(
        activeDescriptor,
        params ?? values,
      ) as Params;
      const result = await runtime.validateInteraction(
        activeDescriptor.interactionId,
        finalParams as Record<string, unknown>,
      );
      if (!result.valid) {
        throw new ValidationError(result.errorCode, result.message);
      }
    },
    [requireDescriptor, values, runtime],
  );

  const validateDraft = useCallback((): DraftValidation<Params> => {
    const activeDescriptor = requireDescriptor();
    const rawDraft = { ...values } as Record<string, unknown>;
    const required = inputKeys;
    const missing = getInteractionDraftReadiness(activeDescriptor, rawDraft)
      .missingInputs as Array<keyof Params & string>;
    const domainFieldErrors = validateInteractionInputDomains(
      activeDescriptor,
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
  }, [requireDescriptor, values, inputKeys, paramsSchema]);

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
    if (!descriptor) {
      autoSubmitSignatureRef.current = null;
      return;
    }
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
    const signature = `${descriptor.interactionKey}:${JSON.stringify(
      validation.params,
    )}`;
    if (autoSubmitSignatureRef.current === signature) return;
    autoSubmitSignatureRef.current = signature;
    void submit(validation.params).catch(() => {
      // Runtime error channels surface the failure. Keep the draft intact and
      // suppress repeated attempts until the player changes the draft.
    });
  }, [
    descriptor,
    descriptor?.availability,
    descriptor?.commit.mode,
    descriptor?.inputs,
    descriptor?.interactionKey,
    isReady,
    status,
    submit,
    validateDraft,
  ]);

  const setInput = useCallback(
    <K extends keyof Params & string>(key: K, value: Params[K]) => {
      const activeDescriptor = requireDescriptor();
      applyInteractionDraftMutation(store, activeDescriptor, [{ key, value }]);
    },
    [store, requireDescriptor],
  );

  const clearInput = useCallback(
    (key?: keyof Params & string) => {
      const activeDescriptor = requireDescriptor();
      store.clearInput(activeDescriptor.interactionKey, key);
    },
    [store, requireDescriptor],
  );

  const arm = useCallback(() => {
    const activeDescriptor = requireDescriptor();
    store.arm(
      interactionArmScope(activeDescriptor),
      activeDescriptor.interactionKey,
    );
  }, [store, requireDescriptor]);

  const disarm = useCallback(() => {
    const activeDescriptor = requireDescriptor();
    const activeArmScope = interactionArmScope(activeDescriptor);
    if (store.getArmed(activeArmScope) === activeDescriptor.interactionKey) {
      store.arm(activeArmScope, null);
    }
  }, [store, requireDescriptor]);

  if (!descriptor) {
    return null;
  }

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
