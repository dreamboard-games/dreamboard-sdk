/** Reducer-native UI primitives for building game interfaces. */

// Presentational components (no hooks, receive data as props)
export { CardFace, type CardFaceProps, type ViewCard } from "./Card.js";
export { Hand, type HandProps } from "./Hand.js";
export { StagingZone, type StagingZoneProps } from "./StagingZone.js";
export {
  HandView,
  type HandViewProps,
  type HandLayoutKind,
  type HandLayoutPolicy,
} from "./HandView.js";
export {
  CardDragSurface,
  CardDropTargetView,
  useCardDragSurface,
  type CardDragSurfaceProps,
  type CardDragSurfaceController,
  type CardDragSurfaceContextValue,
  type CardDropTargetViewProps,
  type DragPhase,
} from "./card-drag/index.js";
export type { HandInteractionPolicy } from "./hand-pointer-engine.js";
export {
  HandDock,
  type HandDockMode,
  type HandDockPlacement,
  type HandDockPresentation,
  type HandDockProps,
  type HandDockToggleContext,
} from "./HandDock.js";
export {
  MobileHandTrayProvider,
  useRegisterMobileHand,
  useMobileHandTrayActive,
  type HandRole,
  type MobileHandRegistration,
} from "./MobileHandTray.js";
export { PlayArea, type PlayAreaProps } from "./PlayArea.js";
export {
  ChromeSuppressionProvider,
  useChromeSuppression,
} from "./ChromeSuppressionContext.js";

// Other UI components
export { GameSkeleton, type GameSkeletonProps } from "./GameSkeleton.js";
export {
  Toast,
  ToastActions,
  ToastProvider,
  type ToastActionsProps,
  type ToastActionsValue,
  type ToastNotification,
  type ToastType,
} from "./Toast.js";
export { ErrorBoundary, type ErrorBoundaryProps } from "./ErrorBoundary.js";
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./Drawer.js";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../internal/ui/dialog.js";
export { Input } from "../internal/ui/input.js";
export { Label } from "../internal/ui/label.js";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../internal/ui/select.js";

// Game UI primitives (SDK v0.1.0+)
export {
  ResourceCounter,
  ResourceCounterCount,
  ResourceCounterIcon,
  ResourceCounterItem,
  ResourceCounterLabel,
  ResourceCounterRoot,
  createResourceCounter,
  type BoundResourceCounterRootProps,
  type ResourceCounterComponents,
  type ResourceCounterItemState,
  type ResourceCounterPartProps,
  type ResourceCounterProps,
  type ResourceCounterRootProps,
  type ResourceDisplayConfig,
  type ResourceIconProps,
} from "./ResourceCounter.js";
export {
  CostDisplay,
  type CostDisplayProps,
  type ResourceDefinition,
} from "./CostDisplay.js";
export { ActionButton, type ActionButtonProps } from "./ActionButton.js";
export { PrimaryButton, type PrimaryButtonProps } from "./PrimaryButton.js";
export { ThemedButton, type ThemedButtonProps } from "./ThemedButton.js";
export {
  PrimaryActionButton,
  type PrimaryActionButtonProps,
  type PrimaryActionAttention,
} from "./PrimaryActionButton.js";
export {
  ActionPanel,
  ActionGroup,
  type ActionPanelProps,
  type ActionGroupProps,
} from "./ActionPanel.js";
export { MoreActions, type MoreActionsProps } from "./MoreActions.js";
export { DiceRoller, type DiceRollerProps } from "./DiceRoller.js";
export { PhaseIndicator, type PhaseIndicatorProps } from "./PhaseIndicator.js";
export {
  GameEndDisplay,
  type GameEndDisplayProps,
  type PlayerScore,
} from "./GameEndDisplay.js";

// Board primitives (SDK v0.2.0+)
export {
  NetworkGraph,
  DefaultNetworkNode,
  DefaultNetworkEdge,
  DefaultNetworkPiece,
  type NetworkGraphProps,
  type NetworkNode,
  type NetworkEdge,
  type NetworkPiece,
  type DefaultNetworkNodeProps,
  type DefaultNetworkEdgeProps,
  type DefaultNetworkPieceProps,
} from "./board/NetworkGraph.js";

export {
  ZoneMap,
  DefaultZone,
  DefaultZonePieces,
  DefaultZonePiece,
  type ZoneMapProps,
  type ZoneDefinition,
  type ZonePiece,
  type ZoneShape,
  type ZoneHighlightType,
  type DefaultZoneProps,
  type DefaultZonePiecesProps,
  type DefaultZonePieceProps,
} from "./board/ZoneMap.js";

export {
  TrackBoard,
  DefaultTrackSpace,
  DefaultTrackPiece,
  DefaultTrackConnection,
  DefaultTrackJump,
  type TrackBoardProps,
  type TrackSpace,
  type TrackPiece,
  type DefaultTrackSpaceProps,
  type DefaultTrackPieceProps,
  type DefaultTrackConnectionProps,
  type DefaultTrackJumpProps,
} from "./board/TrackBoard.js";

export {
  SlotSystem,
  DefaultSlotItem,
  DefaultSlotOccupant,
  DefaultEmptySlot,
  type SlotSystemProps,
  type SlotDefinition,
  type SlotOccupant,
  type DefaultSlotItemProps,
  type DefaultSlotOccupantProps,
  type DefaultEmptySlotProps,
} from "./board/SlotSystem.js";

export {
  SquareGrid,
  DefaultGridCell,
  DefaultGridPiece,
  DefaultChessPiece,
  toAlgebraic,
  toNumeric,
  type SquareGridBoardProps,
  type SquareGridProps,
  type InteractiveSquareEdge,
  type InteractiveSquareVertex,
  type SquareEdgePosition,
  type SquareVertexPosition,
  type DefaultGridCellProps,
  type DefaultGridPieceProps,
  type DefaultChessPieceProps,
} from "./board/SquareGrid.js";

export {
  HexGrid,
  hexUtils,
  DefaultHexTile,
  DefaultHexEdge,
  DefaultHexVertex,
  type HexGridBoardProps,
  type HexGridProps,
  type HexOrientation,
  type HexTileGeometry,
  type InteractiveHexEdge,
  type InteractiveHexVertex,
  type InteractiveTargetLayer,
  type InteractiveTargetRenderState,
  type EdgePosition,
  type DefaultHexTileProps,
  type DefaultHexEdgeProps,
  type DefaultHexVertexProps,
} from "./board/HexGrid.js";
export {
  createHexBoardView,
  type HexBoardView,
  type HexBoardViewTile,
} from "./board/hex-board-view.js";
export type {
  HexTileState,
  HexEdgeState,
  HexVertexState,
  SquareCellState,
  SquareEdgeState,
  SquarePieceState,
  SquareVertexState,
} from "../types/player-state.js";
export type { CardCollection, ViewSlotOccupant } from "@dreamboard-games/sdk-types";
