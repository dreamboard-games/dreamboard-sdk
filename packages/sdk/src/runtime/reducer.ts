export {
  type ClientParamSchema,
  type ClientParamSchemaMap,
} from "./context/ClientParamSchemaContext.js";

export type {
  GameplayPromptOption,
  GameplaySnapshot,
} from "./types/reducer-state.js";
export type {
  InteractionDescriptor,
  InteractionContext,
  InteractionContextOption,
  ZoneHandlesSnapshot,
} from "./types/plugin-state.js";
export type { Player } from "./hooks/useMe.js";
export type { SeatInbox } from "./hooks/useSeatInbox.js";
export type {
  DraftValidation,
  InteractionHandle,
  InteractionHandleStatus,
  InteractionParamsShape,
} from "./hooks/useInteractionHandle.js";
export type {
  CardCollection,
  ViewCard,
  ViewSlotOccupant,
} from "@dreamboard-games/sdk-types";
