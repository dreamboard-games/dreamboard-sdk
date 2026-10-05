import type { SeatBoardTopology } from "../shared/seat-topology-schema.js";
import type { ActionProps } from "./model.js";
import type { InputDomain } from "../shared/protocol/frame.js";
import type { RuntimeJson } from "../shared/runtime-json.js";
import type {
  GameSource,
  SourceSnapshot,
  SourceState,
} from "./sources/types.js";
import type {
  RuntimeSelectionTarget,
  RuntimeDropTarget,
  RuntimeTargetOptions,
} from "./targets.js";

/** Internal operations over admitted projections; never a game facade widened to unknown. */
export const runtimeFeatures = Symbol("runtimeFeatures");
export interface RuntimeInput {
  readonly key: string;
  getDomain(): InputDomain;
  getIsEligible(value: RuntimeJson): boolean;
  getIsSelected(value: RuntimeJson): boolean;
  getTargetProps(value: RuntimeJson): ActionProps;
}
export interface RuntimeInteraction {
  readonly key: string;
  getIsAvailable(): boolean;
  getInputs(): readonly RuntimeInput[];
}
export interface RuntimeFeatureSnapshot {
  readonly view: unknown;
  readonly snapshot: SourceSnapshot | null;
  readonly connection: SourceState["connection"];
  readonly interactions: { list(): readonly RuntimeInteraction[] };
  readonly cards: {
    find(
      id: string,
    ): { getInteractions(): readonly RuntimeInteraction[] } | undefined;
  };
}
export interface RuntimeFeatureGame extends RuntimeFeatureSnapshot {
  getSnapshot(): RuntimeFeatureSnapshot;
  getOptions(): { readonly source: GameSource };
  subscribe(listener: () => void): () => void;
}
export interface RuntimeBoard {
  readonly id: string;
  readonly data: SeatBoardTopology;
  readonly game: RuntimeFeatureGame;
}
export interface RuntimeCollection<Value> {
  get(id: string): Value;
  find(id: string): Value | undefined;
  getAll(): readonly Value[];
}
export interface RuntimeFeatureContext {
  readonly game: RuntimeFeatureGame;
  getBoards(): Readonly<Record<string, SeatBoardTopology>>;
  createBoard(data: SeatBoardTopology): RuntimeBoard;
  routeTarget(
    target: RuntimeSelectionTarget,
    options?: RuntimeTargetOptions,
  ): void;
  routeCardDrop(cardId: string, target: RuntimeDropTarget): void;
  invalidate(): void;
}
