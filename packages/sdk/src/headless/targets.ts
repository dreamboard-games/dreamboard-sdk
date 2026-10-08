import type { SeatSpaceRef } from "../shared/domain/seat-reference.js";
import type { TileSpaceId } from "../shared/domain/tile-space.js";
import type { TopologyDefinitions } from "../shared/domain/topology-definitions.js";
import type { BoardSpaceTarget } from "../shared/board-target.js";
import type { PositionTarget } from "../shared/position-target.js";
import type {
  BoardIdOfTable,
  BoardStateOfTable,
  SpaceIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "../reducer/model/extract.js";
import type {
  InputKey,
  InputKind,
  InputTarget,
  InteractionKey,
  InteractionParams,
  SeatCardId,
  TableOfGame,
} from "./model.js";

export type RuntimeBoardTarget =
  | {
      readonly valueKind: "board-id";
      readonly kind: "space" | "edge" | "vertex";
      readonly boardId: string;
      readonly value: string;
    }
  | {
      readonly valueKind: "board-space";
      readonly kind: "space";
      readonly value: BoardSpaceTarget;
    };
export type RuntimeSelectionTarget =
  | RuntimeBoardTarget
  | { readonly kind: "card"; readonly value: string }
  | {
      readonly kind: "tile";
      readonly value: import("../shared/domain/seat-reference.js").SeatTileRef;
    };
export type RuntimeTargetOptions =
  | { readonly interaction?: undefined; readonly input?: never }
  | { readonly interaction: string; readonly input?: string };
export type RuntimeBoardDropTarget = RuntimeBoardTarget & {
  readonly interactionKey: string;
  readonly cardInputKey: string;
  readonly inputKey: string;
};
export interface RuntimeInteractionDropTarget {
  readonly kind: "interaction";
  readonly interactionKey: string;
  readonly cardInputKey: string;
  readonly params?: Readonly<
    Record<string, import("../shared/runtime-json.js").RuntimeJson>
  >;
}
/** An insertion point in a zone for an interaction with a position input. */
export interface RuntimePositionDropTarget {
  readonly kind: "position";
  readonly interactionKey: string;
  readonly cardInputKey: string;
  readonly inputKey: string;
  readonly value: PositionTarget;
}
export type RuntimeDropTarget =
  | RuntimeBoardDropTarget
  | RuntimeInteractionDropTarget
  | RuntimePositionDropTarget;
type SeatSpaceValue<Id> = Id extends TileSpaceId ? SeatSpaceRef : Id;
type TargetOnBoard<
  Table,
  B extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions,
> =
  | ({ readonly valueKind: "board-id"; readonly boardId: B } & (
      | {
          readonly kind: "space";
          readonly value: SeatSpaceValue<SpaceIdOfTable<Table, B, Definitions>>;
        }
      | (B extends TiledBoardIdOfTable<Table, Definitions>
          ? | {
                readonly kind: "edge";
                readonly value: TiledEdgeIdOfTable<Table, B, Definitions>;
              }
            | {
                readonly kind: "vertex";
                readonly value: TiledVertexIdOfTable<Table, B, Definitions>;
              }
          : never)
    ))
  | (BoardStateOfTable<Table, B, Definitions> extends {
      scope: "perPlayer";
      baseId: string;
    }
      ? {
          readonly valueKind: "board-space";
          readonly kind: "space";
          readonly value: BoardSpaceTarget<
            B,
            SeatSpaceValue<SpaceIdOfTable<Table, B, Definitions>>
          >;
        }
      : never);
/** One target identity; board-space targets already contain their board identity. */
export type BoardTarget<G> = [TableOfGame<G>] extends [never]
  ? RuntimeBoardTarget
  : G extends {
        contract: { manifest: infer Definitions extends TopologyDefinitions };
      }
    ? {
        [B in BoardIdOfTable<TableOfGame<G>>]: TargetOnBoard<
          TableOfGame<G>,
          B,
          Definitions
        >;
      }[BoardIdOfTable<TableOfGame<G>>]
    : never;
export type SelectionTarget<G> =
  | BoardTarget<G>
  | { readonly kind: "card"; readonly value: SeatCardId<G> }
  | {
      readonly kind: "tile";
      readonly value: import("../shared/domain/seat-reference.js").SeatTileRef;
    };
/** Input disambiguation belongs to a particular interaction. */
export type TargetOptions<G> =
  | { readonly interaction?: undefined; readonly input?: never }
  | {
      [K in InteractionKey<G>]: {
        readonly interaction: K;
        readonly input?: InputKey<G, K>;
      };
    }[InteractionKey<G>];
type KeysOfKind<
  G,
  K extends InteractionKey<G>,
  Kind extends string,
> = unknown extends G
  ? string
  : {
      [N in InputKey<G, K>]: InputKind<G, K, N> extends Kind ? N : never;
    }[InputKey<G, K>];
/** A resolved atomic card/drop route retains both input identities. */
export type BoardDropTarget<G> = BoardTarget<G> &
  {
    [K in InteractionKey<G>]: {
      readonly interactionKey: K;
      readonly cardInputKey: KeysOfKind<G, K, "card">;
      readonly inputKey: KeysOfKind<
        G,
        K,
        "board-space" | "board-edge" | "board-vertex"
      >;
    };
  }[InteractionKey<G>];
type DropAreaParams<G, K extends InteractionKey<G>> = Partial<
  InteractionParams<G, K>
> &
  (unknown extends G
    ? Record<never, never>
    : { readonly [N in KeysOfKind<G, K, "card">]?: never });
/** An area that runs an interaction without a board input on the dropped card. */
export type InteractionDropTarget<G> = {
  [K in InteractionKey<G>]: [KeysOfKind<G, K, "card">] extends [never]
    ? never
    : {
        readonly kind: "interaction";
        readonly interactionKey: K;
        readonly cardInputKey: KeysOfKind<G, K, "card">;
        readonly params?: DropAreaParams<G, K>;
      };
}[InteractionKey<G>];
type PositionValue<G, K extends InteractionKey<G>> = unknown extends G
  ? PositionTarget
  : {
      [N in InputKey<G, K>]: InputKind<G, K, N> extends "position"
        ? InputTarget<G, K, N>
        : never;
    }[InputKey<G, K>];
/** A dragged card's insertion point in a zone, as a position input takes it. */
export type PositionDropTarget<G> = {
  [K in InteractionKey<G>]: [KeysOfKind<G, K, "position">] extends [never]
    ? never
    : {
        readonly kind: "position";
        readonly interactionKey: K;
        readonly cardInputKey: KeysOfKind<G, K, "card">;
        readonly inputKey: KeysOfKind<G, K, "position">;
        readonly value: PositionValue<G, K>;
      };
}[InteractionKey<G>];
export type DropTarget<G> =
  BoardDropTarget<G> | InteractionDropTarget<G> | PositionDropTarget<G>;

/**
 * Bound inputs accompany the dropped card in one interaction draft. A
 * `position` instead names the insertion point the area offers now.
 */
export type DropAreaBinding<G> = {
  [K in InteractionKey<G>]:
    | {
        readonly interaction: K;
        readonly input?: KeysOfKind<G, K, "card">;
        readonly params?: DropAreaParams<G, K>;
        readonly position?: never;
      }
    | ([KeysOfKind<G, K, "position">] extends [never]
        ? never
        : {
            readonly interaction: K;
            readonly input?: KeysOfKind<G, K, "card">;
            readonly params?: never;
            readonly position: PositionValue<G, K>;
          });
}[InteractionKey<G>];
