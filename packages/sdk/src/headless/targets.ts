import type { PlayerBoardSpaceTarget } from "../shared/board-target.js";
import type {
  BoardIdOfTable,
  BoardStateOfTable,
  SpaceIdOfTable,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
  PlayerIdOfTable,
} from "../reducer/model/extract.js";
import type {
  IdOf,
  InputKey,
  InputKind,
  InteractionKey,
  TableOfGame,
} from "./model.js";

export type RuntimeBoardTarget =
  | {
      readonly valueKind: "board-id";
      readonly kind: "space" | "tile" | "edge" | "vertex";
      readonly boardId: string;
      readonly value: string;
    }
  | {
      readonly valueKind: "player-board-space";
      readonly kind: "space";
      readonly value: PlayerBoardSpaceTarget;
    };
type TargetOnBoard<Table, B extends BoardIdOfTable<Table>> =
  | ({ readonly valueKind: "board-id"; readonly boardId: B } & (
      | { readonly kind: "space"; readonly value: SpaceIdOfTable<Table, B> }
      | (B extends TiledBoardIdOfTable<Table>
          ? | {
                readonly kind: "tile";
                readonly value: SpaceIdOfTable<Table, B>;
              }
            | {
                readonly kind: "edge";
                readonly value: TiledEdgeIdOfTable<Table, B>;
              }
            | {
                readonly kind: "vertex";
                readonly value: TiledVertexIdOfTable<Table, B>;
              }
          : never)
    ))
  | (BoardStateOfTable<Table, B> extends {
      scope: "perPlayer";
      baseId: infer Base extends string;
    }
      ? {
          readonly valueKind: "player-board-space";
          readonly kind: "space";
          readonly value: PlayerBoardSpaceTarget<
            Base,
            SpaceIdOfTable<Table, B>,
            PlayerIdOfTable<Table>
          >;
        }
      : never);
/** One target identity; player-space tuples already contain their board identity. */
export type BoardTarget<G> = [TableOfGame<G>] extends [never]
  ? RuntimeBoardTarget
  : {
      [B in BoardIdOfTable<TableOfGame<G>>]: TargetOnBoard<TableOfGame<G>, B>;
    }[BoardIdOfTable<TableOfGame<G>>];
export type SelectionTarget<G> =
  BoardTarget<G> | { readonly kind: "card"; readonly value: IdOf<G, "cardId"> };
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
export type DropTarget<G> = BoardTarget<G> &
  {
    [K in InteractionKey<G>]: {
      readonly interactionKey: K;
      readonly cardInputKey: KeysOfKind<G, K, "card">;
      readonly inputKey: KeysOfKind<
        G,
        K,
        "board-space" | "board-tile" | "board-edge" | "board-vertex"
      >;
    };
  }[InteractionKey<G>];
