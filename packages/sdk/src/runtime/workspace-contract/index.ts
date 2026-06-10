import { createElement } from "react";
import type { ReactNode } from "react";
import {
  ClientParamSchemaProvider,
  type ClientParamSchemaMap,
} from "../context/ClientParamSchemaContext.js";
import {
  createResourceCounter,
  type ResourceCounterComponents,
  type ResourceDisplayConfig,
} from "../../ui.js";
import { MobileHandTrayProvider } from "../../ui/components.js";
import { ToastProvider } from "../../ui.js";
import {
  createDreamboardUI,
  type DreamboardUI,
  type TypedGame,
  type UIContract,
} from "../ui-contract.js";
import type {
  BoardHexGridProps,
  BoardHexViewProps,
  InteractionDialogProps,
  InteractionFormPrimitiveProps,
  InteractionStateProps,
  InteractionSubmitProps,
  InteractionTriggerProps,
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
  UIRootProps,
  ZoneCardRenderItem,
} from "../primitives/index.js";
import type { ZoneListProps } from "../primitives/zone.js";
import type {
  RuntimeBoard,
  RuntimeInteraction,
  RuntimeZone,
  WorkspaceContractContext,
  WorkspaceContractOptions,
} from "./types.js";
import { createBoardNamespace } from "./board.js";
import { createInteractionForms } from "./forms.js";
import { createSurfaceResolvers } from "./surfaces.js";
import { createZoneNamespace } from "./zones.js";

export type { BoardSpaceTargetProps } from "../primitives/board.js";
export type { HandRole } from "../../ui/components.js";
export type {
  WorkspaceInteractionSlotComponent,
  WorkspaceFormInputSlot,
  WorkspaceCardInputSlot,
  WorkspaceBoardTargetInputSlot,
  WorkspaceBoardSurface,
  WorkspaceZoneCardsComponent,
  WorkspaceZoneCardComponent,
  WorkspaceZoneStagingComponent,
  WorkspaceHandSurface,
  WorkspaceHandOptions,
  WorkspacePileSurface,
  WorkspaceCardCollectionSurface,
  WorkspaceBoardSurfaceDescriptor,
  WorkspaceHandSurfaceDescriptor,
  WorkspacePileSurfaceDescriptor,
  WorkspacePilesSurfaceDescriptor,
  WorkspaceCardCollectionSurfaceDescriptor,
  WorkspaceInteractionFormsDescriptor,
  WorkspaceInteractionFormDescriptor,
  WorkspaceSurfaceDescriptor,
  WorkspaceSurfaceSpec,
  WorkspaceContractOptions,
} from "./types.js";

export function createWorkspaceUIContract<
  WorkspaceUI,
  Contract extends UIContract,
  Resource extends string,
  Card,
  HexBoards extends Record<string, unknown>,
>(
  options: WorkspaceContractOptions<Contract, Resource, Card, HexBoards>,
): WorkspaceUI {
  const baseUI = createDreamboardUI(options.uiContract);
  const runtimeInteraction = baseUI.Interaction as RuntimeInteraction;
  const runtimeBoard = baseUI.Board as RuntimeBoard;
  const runtimeZone = baseUI.Zone as RuntimeZone<Card>;

  const ctx: WorkspaceContractContext<Card> = {
    options,
    // The context carries the contract-erased view of the UI: every consumer
    // already neutralizes key genericity (`as never` inputs/zones), exactly as
    // the original single-file factory did with its `Runtime*` casts.
    baseUI: baseUI as unknown as DreamboardUI,
    runtimeInteraction,
    runtimeBoard,
    runtimeZone,
    withInteractionRoot: (interaction: string, children: ReactNode) =>
      createElement(runtimeInteraction.Root, {
        interaction,
        children,
      }),
  };

  const resourceDisplayConfig = options.resourceIds.map((resource) => {
    const presentation = options.resourcePresentationById?.[resource];
    return {
      type: resource,
      label: presentation?.label ?? resource,
      icon: presentation?.icon ?? resource,
    };
  }) satisfies ReadonlyArray<ResourceDisplayConfig<Resource>>;
  const resourceCounter = createResourceCounter<Resource>(
    resourceDisplayConfig,
  );

  const { Interaction, useInteractionFormSurface } =
    createInteractionForms(ctx);
  const Board = createBoardNamespace(ctx);
  const Zone = createZoneNamespace(ctx);
  const { defineSurfaces } = createSurfaceResolvers({
    Board,
    Zone,
    useInteractionFormSurface,
  });

  const UI = {
    ...baseUI,
    Root: ({ children, ...props }: UIRootProps) =>
      createElement(ClientParamSchemaProvider, {
        schemas: options.clientParamSchemasByPhase,
        children: createElement(ToastProvider, {
          children: createElement(MobileHandTrayProvider, {
            children: createElement(baseUI.Root, { ...props, children }),
          }),
        }),
      }),
    defineSurfaces,
    Interaction,
    Board,
    Zone,
    ResourceCounter: resourceCounter,
  };

  return UI as WorkspaceUI;
}

export type {
  BoardHexGridProps,
  BoardHexViewProps,
  ClientParamSchemaMap,
  DreamboardUI,
  GameMeState,
  GamePlayersState,
  GameRenderState,
  GameTurnState,
  InteractionDialogProps,
  InteractionFormPrimitiveProps,
  InteractionStateProps,
  InteractionSubmitProps,
  InteractionTriggerProps,
  ResourceCounterComponents,
  TypedGame,
  UIContract,
  UIRootProps,
  ZoneCardRenderItem,
  ZoneListProps,
};
