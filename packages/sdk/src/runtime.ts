import type {
  DreamboardUI as RuntimeDreamboardUI,
  TypedGame as RuntimeTypedGame,
  UIContract as RuntimeUIContract,
} from "./runtime/index.js";

export { PluginRuntime } from "./runtime/index.js";
export { createPluginRuntimeClient } from "./runtime/index.js";
export { createPostMessagePluginTransport } from "./runtime/index.js";

export interface DreamboardUIRegister {
  readonly __dreamboardUIRegister?: never;
}

export type UIContract = RuntimeUIContract;

type RegisteredUIContract = DreamboardUIRegister extends {
  ui: infer Registered extends UIContract;
}
  ? Registered
  : UIContract;

export type RegisteredUI = RegisteredUIContract;

export type DreamboardUI<Contract extends UIContract = RegisteredUI> =
  RuntimeDreamboardUI<Contract>;

export type TypedGame<
  Contract extends UIContract,
  View = unknown,
  Player extends string = string,
  Phase extends string = string,
> = RuntimeTypedGame<Contract, View, Player, Phase>;

export type {
  InteractionDescriptor,
  PluginRuntimeClient,
  PluginRuntimeClientOptions,
  PluginTransport,
  PluginRuntimeProps,
  PostMessagePluginTransportOptions,
  RuntimeClock,
  RuntimeIdFactory,
} from "./runtime/index.js";

// Workspace contract surface. Generated game UIs import these from
// `@dreamboard-games/sdk/runtime` (the `declare module` augmentation target
// for `DreamboardUIRegister` lives on this subpath as well).
export { createWorkspaceUIContract } from "./runtime/workspace-contract.js";
export type {
  BoardHexGridProps,
  BoardHexViewProps,
  BoardSpaceTargetProps,
  ClientParamSchemaMap,
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
  ResourceCounterComponents,
  UIRootProps,
  WorkspaceBoardSurface,
  WorkspaceBoardSurfaceDescriptor,
  WorkspaceBoardTargetInputSlot,
  WorkspaceCardCollectionSurface,
  WorkspaceCardCollectionSurfaceDescriptor,
  WorkspaceCardInputSlot,
  WorkspaceFormInputSlot,
  WorkspaceHandSurface,
  WorkspaceHandSurfaceDescriptor,
  WorkspaceInteractionFormDescriptor,
  WorkspaceInteractionFormsDescriptor,
  WorkspaceInteractionSlotComponent,
  WorkspacePileSurface,
  WorkspacePileSurfaceDescriptor,
  WorkspacePilesSurfaceDescriptor,
  WorkspaceSurfaceSpec,
  ZoneCardRenderItem,
  ZoneListProps,
} from "./runtime/workspace-contract.js";
