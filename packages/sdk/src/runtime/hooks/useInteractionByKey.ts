import { useEffect, useMemo, useRef } from "react";
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
} from "../../ui/errors/ValidationError.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  applyInteractionInputDefaults,
  hasInteractionFieldErrors,
  inputByKey,
  isInputValueReady,
  interactionArmScope,
  interactionInputKeys,
  mergeInteractionFieldErrors,
  validateInteractionInputDomains,
} from "../utils/interaction-inputs.js";
import type {
  DraftValidation,
  InteractionHandle,
  InteractionHandleStatus,
  InteractionParamsShape,
} from "./useInteractionHandle.js";
import {
  interactionUnavailableReason,
  isInteractionAvailable,
} from "../utils/interaction-status.js";
import { shouldAutoSubmitInteraction } from "../utils/interaction-router.js";

/**
 * Look up an interaction descriptor by phase-qualified key on the controlling seat's
 * inbox and return a bound {@link InteractionHandle}. Returns `null`
 * when no matching descriptor is currently projected.
 *
 * Prefer this over manual `inbox.bySurface.panel?.find(...)` + sentinel
 * descriptor patterns — it keeps hook-call order stable and guarantees
 * the handle reflects the freshest descriptor.
 *
 * Types:
 * - `Key` narrows the key literal. When called from the workspace-local
 *   `useInteractionByKey` re-export generated in `ui-contract.ts`, `Key` is
 *   constrained to the generated `InteractionKey` union so typos become
 *   compile errors.
 * - `Params` is the params shape (`InteractionParamsOf<Key>` in the
 *   generated re-export). It flows through to `draft`, `submit`,
 *   `validate`, and `setInput` for compile-time safety.
 *
 * ```tsx
 * // from the generated workspace re-export
 * const handle = useInteractionByKey("play.placeThingCard");
 * if (!handle) return <Waiting/>;
 * handle.setInput("cardId", card.id); // typed to ThingsDeckCardId
 * await handle.submit();
 * ```
 */
export function useInteractionByKey<
  Key extends string = string,
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  interactionKey: Key | null | undefined,
): InteractionHandle<Params, DefaultedKeys> | null {
  const runtime = useRuntimeContext();
  const { controllingPlayerId } = usePluginSession();
  const store = useInteractionUiStore();
  const submittingRef = useRef(false);
  const autoSubmitSignatureRef = useRef<string | null>(null);

  const descriptors = usePluginState(
    (state) => state.gameplay.availableInteractions ?? [],
  );
  const simultaneousPhase = usePluginState(
    (state) => state.gameplay.simultaneousPhase,
  );

  const descriptor = useMemo<InteractionDescriptor | null>(() => {
    if (!interactionKey) return null;
    return descriptors.find((d) => d.interactionKey === interactionKey) ?? null;
  }, [descriptors, interactionKey]);

  const armScope = descriptor
    ? interactionArmScope(descriptor)
    : "interaction:missing";
  const resolvedPhaseName = descriptor?.phaseName;
  const resolvedInteractionId = descriptor?.interactionId ?? "";
  const resolvedInteractionKey = descriptor?.interactionKey ?? "";
  const paramsSchema = useClientParamSchema(
    resolvedPhaseName,
    resolvedInteractionId,
  );
  const draft = useInteractionDraft(resolvedInteractionKey);
  const armedId = useArmedInteraction(armScope);
  const submitting = useInteractionSubmitting(resolvedInteractionKey);

  const handle = useMemo<InteractionHandle<
    Params,
    DefaultedKeys
  > | null>(() => {
    if (!descriptor) return null;
    const typedDraft = draft as Readonly<Partial<Params>>;
    const typedValues = applyInteractionInputDefaults<Params>(
      descriptor,
      typedDraft,
    ) as Readonly<Partial<Params> & Pick<Params, DefaultedKeys>>;
    const inputKeys = interactionInputKeys(descriptor);
    const isReady =
      inputKeys.length === 0
        ? true
        : inputKeys.every((key) => {
            const input = inputByKey(descriptor, key);
            const value = (typedValues as Record<string, unknown>)[key];
            return input
              ? isInputValueReady(input, value)
              : value !== null && value !== undefined;
          });
    const isArmed = armedId === descriptor.interactionKey;
    const submitted =
      controllingPlayerId !== null &&
      simultaneousPhase?.phaseName === descriptor.phaseName &&
      simultaneousPhase.interactionId === descriptor.interactionId &&
      simultaneousPhase.sealedPlayerIds.includes(controllingPlayerId);
    const status: InteractionHandleStatus = submitted
      ? "submitted"
      : submitting
        ? "submitting"
        : "open";

    const requirePlayer = () => {
      if (!controllingPlayerId) {
        throw new Error("useInteractionByKey: no controlling player available");
      }
      return controllingPlayerId;
    };

    const submit = async (params?: Params) => {
      if (status !== "open" || submittingRef.current) {
        throw new ValidationError(
          status === "submitted" ? "ALREADY_SUBMITTED" : "SUBMITTING",
          status === "submitted"
            ? "Interaction has already been submitted."
            : "Interaction submission is already in progress.",
        );
      }
      submittingRef.current = true;
      store.setSubmitting(descriptor.interactionKey, true);
      const finalParams = applyInteractionInputDefaults<Params>(
        descriptor,
        params ?? typedValues,
      ) as Params;
      try {
        await runtime.submitInteraction(
          requirePlayer(),
          descriptor.interactionId,
          finalParams as Record<string, unknown>,
        );
        store.clearInput(descriptor.interactionKey);
        if (store.getArmed(armScope) === descriptor.interactionKey) {
          store.arm(armScope, null);
        }
      } catch (error) {
        throw validationErrorFromUnknown(error);
      } finally {
        submittingRef.current = false;
        store.setSubmitting(descriptor.interactionKey, false);
      }
    };

    const validate = async (params?: Params) => {
      const finalParams = applyInteractionInputDefaults<Params>(
        descriptor,
        params ?? typedValues,
      ) as Params;
      const result = await runtime.validateInteraction(
        requirePlayer(),
        descriptor.interactionId,
        finalParams as Record<string, unknown>,
      );
      if (!result.valid) {
        throw new ValidationError(result.errorCode, result.message);
      }
    };

    const validateDraft = (): DraftValidation<Params> => {
      const rawDraft = { ...typedValues } as Record<string, unknown>;
      const missing = inputKeys.filter((key) => {
        const input = inputByKey(descriptor, key);
        const value = rawDraft[key];
        return input
          ? !isInputValueReady(input, value)
          : value === null || value === undefined;
      }) as Array<keyof Params & string>;
      const domainFieldErrors = validateInteractionInputDomains(
        descriptor,
        rawDraft,
      ) as Partial<Record<keyof Params & string, readonly string[]>>;

      if (!paramsSchema) {
        if (
          missing.length > 0 ||
          hasInteractionFieldErrors(domainFieldErrors)
        ) {
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
      for (const issue of result.error.issues) {
        const [first] = issue.path;
        if (typeof first === "string" && inputKeys.includes(first)) {
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
    };

    const validateDraftServer = async () => {
      await validate({ ...typedValues } as Params);
    };

    const submitDraft = async () => {
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
    };

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
      draft: typedDraft,
      values: typedValues,
      setInput: <K extends keyof Params & string>(key: K, value: Params[K]) =>
        store.setInput(descriptor.interactionKey, key, value as unknown),
      clearInput: (key?: keyof Params & string) =>
        store.clearInput(descriptor.interactionKey, key),
      isReady,
      isArmed,
      arm: () => store.arm(armScope, descriptor.interactionKey),
      disarm: () => {
        if (store.getArmed(armScope) === descriptor.interactionKey) {
          store.arm(armScope, null);
        }
      },
    };
  }, [
    descriptor,
    draft,
    armedId,
    armScope,
    runtime,
    store,
    controllingPlayerId,
    paramsSchema,
    simultaneousPhase,
    submitting,
  ]);

  useEffect(() => {
    if (!handle) {
      autoSubmitSignatureRef.current = null;
      return;
    }
    if (!shouldAutoSubmitInteraction(handle.descriptor)) {
      autoSubmitSignatureRef.current = null;
      return;
    }
    if (!handle.available || handle.status !== "open" || !handle.isReady) {
      if (!handle.isReady) autoSubmitSignatureRef.current = null;
      return;
    }
    const validation = handle.validateDraft();
    if (!validation.ok) return;
    const signature = `${handle.descriptor.interactionKey}:${JSON.stringify(
      validation.params,
    )}`;
    if (autoSubmitSignatureRef.current === signature) return;
    autoSubmitSignatureRef.current = signature;
    void handle.submit(validation.params).catch(() => {
      // Runtime error channels surface the failure. Keep the draft intact and
      // suppress repeated attempts until the player changes the draft.
    });
  }, [handle]);

  return handle;
}
