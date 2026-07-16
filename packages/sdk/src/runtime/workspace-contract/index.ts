import { Fragment, createElement } from "react";
import type { ComponentType, ReactNode } from "react";
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
  BoardGridInteractionFilter,
  BoardHexGridProps,
  BoardHexViewProps,
  BoardSquareGridInteractionFilter,
  BoardSquareGridProps,
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
export type { WorkspaceInteractionFormDialogProps } from "./forms.js";
import { createSurfaceResolvers } from "./surfaces.js";
import { createZoneNamespace } from "./zones.js";

export {
  createGameUiContract,
  type CreateGameUiContractOptions,
  type GameUiBoardSurface,
  type GameUiCardCollectionSurface,
  type GameUiContract,
  type GameUiGameRootState,
  type GameUiHandSurface,
  type GameUiInteractionDescriptor,
  type GameUiInteractionFormSurface,
  type GameUiInteractionKey,
  type GameUiInteractionParamsOf,
  type GameUiInteractionRoutes,
  type GameUiManifestTypes,
  type GameUiMe,
  type GameUiPhaseName,
  type GameUiPileSurface,
  type GameUiPlayers,
  type GameUiTurn,
  type GameUiView,
  type GameUiViewName,
  type GameWorkspaceUI,
} from "./game-ui-contract.js";

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

export interface DefineGameUIConfig<GameState, Surfaces> {
  useSurfaces: () => Surfaces;
  interactionRoutes?: (context: {
    game: GameState;
    surfaces: Surfaces;
  }) => Record<string, { collect: Record<string, unknown> }>;
  phases: Record<
    string,
    (context: { game: GameState; surfaces: Surfaces }) => ReactNode
  >;
  renderInteractions?: (context: {
    game: GameState;
    surfaces: Surfaces;
  }) => ReactNode;
  fallback?: ReactNode | ((phase: string | null) => ReactNode);
  includeUnavailableInteractions?: boolean | null;
}

export function createWorkspaceUIContract<
  WorkspaceUI,
  Contract extends UIContract,
  Resource extends string,
  Card,
  HexBoards extends Record<string, unknown>,
  SquareBoards extends Record<string, unknown> = Record<string, unknown>,
>(
  options: WorkspaceContractOptions<
    Contract,
    Resource,
    Card,
    HexBoards,
    SquareBoards
  >,
): WorkspaceUI {
  const baseUI = createDreamboardUI(options.uiContract);
  const runtimeInteraction = baseUI.Interaction as RuntimeInteraction;
  const runtimeBoard = baseUI.Board as RuntimeBoard;
  const runtimeZone = baseUI.Zone as RuntimeZone<Card>;
  const runtimeGameRoot = baseUI.Game.Root as ComponentType<{
    children: (game: unknown) => ReactNode;
  }>;
  const runtimePhaseSwitch = baseUI.Phase.Switch as ComponentType<{
    routes: Record<string, () => ReactNode>;
    fallback?: ReactNode | ((phase: string | null) => ReactNode);
  }>;

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
    defineGameUI<GameState, Surfaces>({
      useSurfaces,
      interactionRoutes,
      phases,
      renderInteractions,
      fallback,
      includeUnavailableInteractions,
    }: DefineGameUIConfig<GameState, Surfaces>) {
      function DefinedGameUIFrame({ game }: { game: GameState }) {
        const surfaces = useSurfaces();
        const phaseRoutes = Object.fromEntries(
          Object.entries(phases).map(([phase, render]) => [
            phase,
            () => render({ game, surfaces }),
          ]),
        );
        const routeMap = interactionRoutes?.({ game, surfaces });
        return createElement(
          Fragment,
          null,
          routeMap
            ? createElement(runtimeInteraction.Routes, {
                routes: routeMap,
                includeUnavailable: includeUnavailableInteractions,
              })
            : null,
          createElement(runtimePhaseSwitch, {
            routes: phaseRoutes,
            fallback,
          }),
          renderInteractions?.({ game, surfaces }) ?? null,
        );
      }

      return function DefinedGameUI(props: Omit<UIRootProps, "children">) {
        return createElement(UI.Root, {
          ...props,
          children: createElement(runtimeGameRoot, {
            children: (rawGame: unknown) =>
              createElement(DefinedGameUIFrame, {
                game: rawGame as GameState,
              }),
          }),
        });
      };
    },
    Interaction,
    Board,
    Zone,
    ResourceCounter: resourceCounter,
  };

  return UI as WorkspaceUI;
}

export type {
  BoardGridInteractionFilter,
  BoardHexGridProps,
  BoardHexViewProps,
  BoardSquareGridInteractionFilter,
  BoardSquareGridProps,
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
