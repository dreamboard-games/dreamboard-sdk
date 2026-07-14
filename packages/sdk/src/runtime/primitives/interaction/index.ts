import { InteractionRoot } from "./context.js";
import { InteractionState } from "./state.js";
import { InteractionRoutes, InteractionSwitch } from "./routes.js";
import { InteractionDialog } from "./dialog.js";
import {
  InteractionInput,
  InteractionSubmit,
  InteractionTrigger,
} from "./controls.js";
import {
  InteractionDescription,
  InteractionLabel,
  InteractionUnavailableMessage,
  InteractionValidationMessage,
} from "./parts.js";
import { InteractionFieldPrimitive, InteractionFormPrimitive } from "./form.js";
import { InteractionCardInput } from "./card-input.js";

export {
  InteractionRoot,
  useInteractionPrimitiveContext,
  useResolvedCardTargetValue,
  type InteractionRootProps,
} from "./context.js";
export {
  InteractionRoutes,
  InteractionSwitch,
  type InteractionRoute,
  type InteractionRoutesMap,
  type InteractionRoutesProps,
  type InteractionSwitchProps,
  type InteractionSwitchRenderState,
  type InteractionSwitchRouteMap,
} from "./routes.js";
export {
  InteractionDialog,
  type InteractionDialogProps,
  type InteractionDialogRenderState,
  type InteractionDialogState,
} from "./dialog.js";
export {
  InteractionDescription,
  InteractionLabel,
  InteractionUnavailableMessage,
  InteractionValidationMessage,
  type InteractionPartProps,
} from "./parts.js";
export {
  InteractionInput,
  InteractionSubmit,
  InteractionTrigger,
  type InteractionInputProps,
  type InteractionSubmitProps,
  type InteractionTriggerProps,
} from "./controls.js";
export {
  InteractionState,
  type InteractionStateProps,
  type InteractionStateSnapshot,
} from "./state.js";
export {
  InteractionFieldPrimitive,
  InteractionFormPrimitive,
  type InteractionFieldPrimitiveProps,
  type InteractionFormPrimitiveProps,
} from "./form.js";
export {
  InteractionCardInput,
  type InteractionCardInputProps,
  type InteractionCardInputRenderState,
} from "./card-input.js";

export const Interaction = {
  Root: InteractionRoot,
  State: InteractionState,
  Switch: InteractionSwitch,
  Routes: InteractionRoutes,
  Dialog: InteractionDialog,
  Trigger: InteractionTrigger,
  Label: InteractionLabel,
  Description: InteractionDescription,
  UnavailableMessage: InteractionUnavailableMessage,
  ValidationMessage: InteractionValidationMessage,
  Input: InteractionInput,
  Field: InteractionFieldPrimitive,
  CardInput: InteractionCardInput,
  Form: InteractionFormPrimitive,
  Submit: InteractionSubmit,
};
