import {
  createContext,
  useContext,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import {
  createHexBoardView,
  HexGrid,
  type AnyHexBoardInput,
  type BoardSpaceIdOf,
  type HexBoardView,
  type HexGridBoardProps,
} from "../../ui.js";
import {
  useBoardInteractions,
  type BoardInteractionsContext,
  type BoardSelectionResult,
  type BoardTargetLayerOptions,
} from "../hooks/useBoardInteractions.js";
import { usePluginState } from "../context/PluginStateContext.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import type { BoardTargetKey } from "../ui-contract.js";
import {
  eligibleTargetsForInput,
  inputByKey,
  inputKeyForTarget,
  isResolvedTargetDomain,
  resolveInputDomain,
  type BoardTargetKind,
} from "../utils/interaction-inputs.js";
import {
  composeEventHandlers,
  renderPrimitive,
  type PrimitiveCommonProps,
} from "./primitive-props.js";
import { runInteractionAction } from "./interaction-submit.js";
import { useGameActionError } from "./game.js";
import { isInteractionAvailable } from "../utils/interaction-status.js";
import { useInteractionUiStore } from "../context/InteractionDraftContext.js";

type BoardContextValue = BoardInteractionsContext;

const BoardContext = createContext<BoardContextValue | null>(null);
const warnedAmbiguousBoardTargets = new Set<string>();

function warnAmbiguousBoardTarget({
  kind,
  value,
  interactionKeys,
}: {
  kind: BoardTargetKind;
  value: string;
  interactionKeys: readonly string[];
}): void {
  const key = `${kind}:${value}:${interactionKeys.join("|")}`;
  if (warnedAmbiguousBoardTargets.has(key)) return;
  warnedAmbiguousBoardTargets.add(key);
  console.error(
    `[dreamboard] Ambiguous Board.${kind} target "${value}" matched multiple available interactions: ${interactionKeys.join(
      ", ",
    )}. Declare the real initiating collector in Interaction.Routes (for example, a card or form input), arm one interaction before collecting this board target, or render an explicit Board.Target interaction prop.`,
  );
}

export function useBoardPrimitiveContext(): BoardContextValue {
  const value = useContext(BoardContext);
  if (!value) {
    throw new Error("Board primitives must be rendered inside <Board.Root>.");
  }
  return value;
}

export interface BoardRootProps extends PrimitiveCommonProps {
  children: ReactNode;
  targetKinds?: readonly BoardTargetKind[];
}

export function BoardRoot({ children, targetKinds, ...props }: BoardRootProps) {
  const board = useBoardInteractions({ targetKinds });
  return (
    <BoardContext.Provider value={board}>
      {renderPrimitive("div", {
        ...props,
        "data-dreamboard-board-root": "",
        children,
      })}
    </BoardContext.Provider>
  );
}

export interface BoardStateProps {
  children: (board: BoardInteractionsContext) => ReactNode;
}

export function BoardState({ children }: BoardStateProps) {
  return <>{children(useBoardPrimitiveContext())}</>;
}

export interface BoardHexViewProps<
  TBoard extends AnyHexBoardInput,
  TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
> {
  board: TBoard;
  spaces: readonly TSpaceView[];
  children: (view: HexBoardView<TBoard, TSpaceView>) => ReactNode;
}

export function BoardHexView<
  const TBoard extends AnyHexBoardInput,
  const TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
>({ board, spaces, children }: BoardHexViewProps<TBoard, TSpaceView>) {
  const view = useMemo(
    () => createHexBoardView<TBoard, TSpaceView>(board, { spaces }),
    [board, spaces],
  );
  return <>{children(view)}</>;
}

export interface BoardHexGridInteractions {
  edge?: BoardTargetLayerOptions;
  vertex?: BoardTargetLayerOptions;
  space?: BoardTargetLayerOptions;
}

export type BoardHexGridInteractionFilter =
  | "auto"
  | false
  | {
      edge?: readonly string[];
      vertex?: readonly string[];
      space?: readonly string[];
    };

type BoardHexGridView<
  TBoard extends AnyHexBoardInput,
  TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
> = HexBoardView<TBoard, TSpaceView> & AnyHexBoardInput;

export type BoardHexGridProps<
  TBoard extends AnyHexBoardInput,
  TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
> = Omit<
  HexGridBoardProps<BoardHexGridView<TBoard, TSpaceView>>,
  "board" | "interactiveEdges" | "interactiveVertices" | "interactiveSpaces"
> &
  Omit<BoardHexViewProps<TBoard, TSpaceView>, "children"> & {
    interactions?: BoardHexGridInteractionFilter;
  };

export function BoardHexGrid<
  const TBoard extends AnyHexBoardInput,
  const TSpaceView extends { id: BoardSpaceIdOf<TBoard> },
>({
  board,
  spaces,
  interactions = "auto",
  ...props
}: BoardHexGridProps<TBoard, TSpaceView>) {
  const boardInteractions = useBoardPrimitiveContext();
  const gameActionError = useGameActionError();
  const edgeLayer =
    interactions === false
      ? undefined
      : boardInteractions.targetLayers.edge({
          enabled: boardInteractions.eligible.edge.size > 0,
          interactionKeys:
            interactions === "auto" ? undefined : interactions.edge,
          onError: gameActionError ?? undefined,
        });
  const vertexLayer =
    interactions === false
      ? undefined
      : boardInteractions.targetLayers.vertex({
          enabled: boardInteractions.eligible.vertex.size > 0,
          interactionKeys:
            interactions === "auto" ? undefined : interactions.vertex,
          onError: gameActionError ?? undefined,
        });
  const spaceLayer =
    interactions === false
      ? undefined
      : boardInteractions.targetLayers.space({
          enabled: boardInteractions.eligible.space.size > 0,
          interactionKeys:
            interactions === "auto" ? undefined : interactions.space,
          onError: gameActionError ?? undefined,
        });
  return (
    <BoardHexView board={board} spaces={spaces}>
      {(view) => (
        <HexGrid
          {...props}
          board={view as BoardHexGridView<TBoard, TSpaceView>}
          interactiveEdges={edgeLayer}
          interactiveVertices={vertexLayer}
          interactiveSpaces={spaceLayer}
        />
      )}
    </BoardHexView>
  );
}

export type BoardTargetExtraInputs =
  | Record<string, unknown>
  | ((targetId: string) => Record<string, unknown>);

export type BoardTargetProps<Target extends string = BoardTargetKey> =
  PrimitiveCommonProps &
    ButtonHTMLAttributes<HTMLButtonElement> & {
      kind: BoardTargetKind;
      value: Target;
      interaction?: string;
      input?: string;
      extraInputs?: BoardTargetExtraInputs;
      onSelect?: (result: BoardSelectionResult) => void;
      onSelectError?: (error: unknown) => void;
    };

export function BoardTarget<Target extends string = BoardTargetKey>({
  interaction,
  input,
  ...props
}: BoardTargetProps<Target>) {
  const descriptor = usePluginState((state) =>
    interaction
      ? state.gameplay.availableInteractions.find(
          (candidate) =>
            candidate.interactionKey === interaction ||
            candidate.interactionId === interaction,
        )
      : undefined,
  );

  if (interaction) {
    return descriptor ? (
      <ExplicitBoardTarget descriptor={descriptor} input={input} {...props} />
    ) : (
      <UnavailableBoardTarget
        interaction={interaction}
        input={input}
        {...props}
      />
    );
  }

  return <UnambiguousBoardTarget input={input} {...props} />;
}

export type BoardSpaceTargetProps<Target extends string = BoardTargetKey> =
  Omit<BoardTargetProps<Target>, "kind">;

export function BoardSpaceTarget<Target extends string = BoardTargetKey>(
  props: BoardSpaceTargetProps<Target>,
) {
  return <BoardTarget kind="space" {...props} />;
}

export type BoardEdgeTargetProps<Target extends string = BoardTargetKey> = Omit<
  BoardTargetProps<Target>,
  "kind"
>;

export function BoardEdgeTarget<Target extends string = BoardTargetKey>(
  props: BoardEdgeTargetProps<Target>,
) {
  return <BoardTarget kind="edge" {...props} />;
}

export type BoardVertexTargetProps<Target extends string = BoardTargetKey> =
  Omit<BoardTargetProps<Target>, "kind">;

export function BoardVertexTarget<Target extends string = BoardTargetKey>(
  props: BoardVertexTargetProps<Target>,
) {
  return <BoardTarget kind="vertex" {...props} />;
}

function UnambiguousBoardTarget({
  kind,
  value,
  extraInputs,
  onSelect,
  onSelectError,
  disabled,
  onClick,
  children,
  ...props
}: Omit<BoardTargetProps, "interaction">) {
  const board = useBoardPrimitiveContext();
  const gameActionError = useGameActionError();
  const targetState = board.targetState(kind, value);
  const eligible = board.isEligible(value, kind);
  const ambiguous = targetState.conflict;
  const conflictInteractionKeys = targetState.conflictInteractionKeys ?? [];
  if (ambiguous) {
    warnAmbiguousBoardTarget({
      kind,
      value,
      interactionKeys: conflictInteractionKeys,
    });
  }
  const isDisabled = disabled ?? (!targetState.eligible || ambiguous);
  const ambiguityMessage =
    ambiguous && conflictInteractionKeys.length > 0
      ? `Ambiguous ${kind} target "${value}" matched: ${conflictInteractionKeys.join(
          ", ",
        )}`
      : undefined;
  return renderPrimitive("button", {
    type: "button",
    ...props,
    children,
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-board-target": "",
    "data-target-kind": kind,
    "data-target-id": value,
    "data-eligible": eligible,
    "data-ambiguous": ambiguous || undefined,
    "data-conflict-interactions":
      ambiguous && conflictInteractionKeys.length > 0
        ? conflictInteractionKeys.join(" ")
        : undefined,
    "data-disabled": isDisabled || undefined,
    title: props.title ?? ambiguityMessage,
    onClick: composeEventHandlers(onClick, () => {
      if (isDisabled) return;
      void runInteractionAction(
        () => board.select[kind](value, resolveExtraInputs(extraInputs, value)),
        {
          onSuccess: onSelect,
          onError: onSelectError ?? gameActionError ?? undefined,
        },
      );
    }),
  });
}

function ExplicitBoardTarget({
  descriptor,
  kind,
  value,
  input,
  extraInputs,
  onSelect,
  onSelectError,
  disabled,
  onClick,
  children,
  ...props
}: Omit<BoardTargetProps, "interaction"> & {
  descriptor: InteractionDescriptor;
}) {
  const board = useBoardPrimitiveContext();
  const gameActionError = useGameActionError();
  const store = useInteractionUiStore();
  useStore(store, (state) => state.drafts[descriptor.interactionKey] ?? {});
  const draft = store.getDraft(descriptor.interactionKey);
  const inputKey = input ?? inputKeyForTarget(descriptor, kind, value, draft);
  const rawInputDescriptor = inputKey
    ? inputByKey(descriptor, inputKey)
    : undefined;
  const inputDescriptor = rawInputDescriptor
    ? resolveInputDomain(rawInputDescriptor, draft)
    : undefined;
  const eligibleTargets = inputKey
    ? eligibleTargetsForInput(descriptor, inputKey, draft)
    : undefined;
  const eligible =
    inputDescriptor !== undefined &&
    inputDescriptor.domain.type === "boardTarget" &&
    isResolvedTargetDomain(inputDescriptor.domain) &&
    inputDescriptor.domain.targetKind === kind &&
    (eligibleTargets ?? inputDescriptor.domain.eligibleTargets).includes(value);
  const isDisabled =
    disabled ?? (!isInteractionAvailable(descriptor) || !eligible);
  return renderPrimitive("button", {
    type: "button",
    ...props,
    children,
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-board-target": "",
    "data-target-kind": kind,
    "data-target-id": value,
    "data-interaction-id": descriptor.interactionId,
    "data-interaction-key": descriptor.interactionKey,
    "data-input-name": inputKey ?? undefined,
    "data-eligible": eligible,
    "data-disabled": isDisabled || undefined,
    onClick: composeEventHandlers(onClick, () => {
      if (isDisabled || !inputKey) return;
      const resolvedExtraInputs = resolveExtraInputs(extraInputs, value);
      void runInteractionAction(
        () =>
          board.selectTarget(
            descriptor,
            kind,
            value,
            inputKey,
            resolvedExtraInputs,
          ),
        {
          onSuccess: onSelect,
          onError: onSelectError ?? gameActionError ?? undefined,
        },
      );
    }),
  });
}

function UnavailableBoardTarget({
  kind,
  value,
  interaction,
  input,
  disabled,
  children,
  ...props
}: Omit<BoardTargetProps, "onSelect" | "onSelectError" | "extraInputs">) {
  const isDisabled = disabled ?? true;
  return renderPrimitive("button", {
    type: "button",
    ...props,
    children,
    disabled: isDisabled,
    "aria-disabled": isDisabled,
    "data-dreamboard-board-target": "",
    "data-target-kind": kind,
    "data-target-id": value,
    "data-interaction-key": interaction,
    "data-input-name": input,
    "data-eligible": false,
    "data-disabled": isDisabled || undefined,
  });
}

function resolveExtraInputs(
  extraInputs: BoardTargetExtraInputs | undefined,
  targetId: string,
): Record<string, unknown> {
  return typeof extraInputs === "function"
    ? extraInputs(targetId)
    : (extraInputs ?? {});
}

export const Board = {
  Root: BoardRoot,
  State: BoardState,
  HexGrid: BoardHexGrid,
  HexView: BoardHexView,
  Target: BoardTarget,
  SpaceTarget: BoardSpaceTarget,
  EdgeTarget: BoardEdgeTarget,
  VertexTarget: BoardVertexTarget,
};
