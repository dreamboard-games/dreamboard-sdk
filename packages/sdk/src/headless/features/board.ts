import {
  createTileBoardLayout,
  type TileLayoutGeometry,
} from "../../shared/tile-board-layout.js";
import type { SeatBoardTopology } from "../../shared/seat-topology-schema.js";
type ProjectedBoardSpace = SeatBoardTopology["spaces"][string];
import { createSquareBoardLayout } from "../../shared/square-board-layout.js";
import {
  runtimeFeatures,
  type RuntimeBoard,
  type RuntimeFeatureContext,
  type RuntimeFeatureSnapshot,
  type RuntimeCollection,
} from "../runtime-features.js";
import type { RuntimeTargetOptions } from "../targets.js";
import type {
  BoardBase,
  BoardDataOf,
  IdOf,
  BoardCollection,
  BoardSpaceCollection,
  BoardSpace,
  CoreInstance,
  FeatureContext,
  TargetOptions,
  ActionProps,
} from "../model.js";
import type { BoardEdge, BoardVertex } from "../../shared/board-topology.js";
import { requireLookup } from "../../shared/lookup.js";
import { AmbiguousTargetError } from "../instance.js";
import {
  createHexTopology,
  createHexTopologyCache,
} from "../../shared/hex-board.js";
import type { Point } from "./pointer-session.js";
import type { ViewportTransform } from "./pan-zoom.js";

interface RuntimeSpace {
  readonly id: string;
  readonly data: ProjectedBoardSpace;
  readonly board: RuntimeBoard;
  getIsEligible(): boolean;
  getIsSelectable(): boolean;
  getIsSelected(): boolean;
  getSelectHandler(options?: RuntimeTargetOptions): () => void;
  getTargetProps(options?: RuntimeTargetOptions): ActionProps;
}
interface RuntimeLayoutTarget {
  readonly id: string;
  getIsEligible(): boolean;
  getIsSelectable(): boolean;
  getIsSelected(): boolean;
  getSelectHandler(options?: RuntimeTargetOptions): () => void;
  getTargetProps(options?: RuntimeTargetOptions): ActionProps;
}
interface RuntimeLayout {
  readonly viewBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  getSpaces(): readonly (RuntimeSpace & {
    readonly center: Point;
    points(): readonly Point[];
    readonly transform: string;
  })[];
  getEdges(): readonly (RuntimeLayoutTarget & {
    readonly data: BoardEdge | undefined;
    readonly center: Point;
    readonly line: readonly [Point, Point];
  })[];
  getVertices(): readonly (RuntimeLayoutTarget & {
    readonly data: BoardVertex | undefined;
    readonly center: Point;
  })[];
  getTiles(): readonly TileLayoutGeometry[];
  pointToSpace(x: number, y: number): string | undefined;
}
type TargetKind = "space" | "edge" | "vertex";
export interface BoardLayoutOptions {
  /** Hex radius, or square cell width and height. */
  readonly hexSize: number;
  readonly origin?: Point;
  readonly viewport?: ViewportTransform;
}
interface Geometry {
  readonly viewBox: { x: number; y: number; width: number; height: number };
  readonly spaces: readonly {
    id: string;
    center: Point;
    corners: readonly Point[];
  }[];
  readonly edges: readonly { id: string; from: Point; to: Point }[];
  readonly vertices: readonly { id: string; center: Point }[];
  pointToSpace(point: Point): string | undefined;
}

/** Semantic board spaces and captured selection, with optional spatial geometry. */
function createRuntimeBoardFeature(context: RuntimeFeatureContext) {
  const game = context.game;
  const captures = new WeakMap<
    object,
    {
      model: RuntimeFeatureSnapshot;
      source: ReturnType<typeof game.getOptions>["source"];
      geometry?: ReturnType<typeof createHexTopology>;
    }
  >();
  const cachedHexTopology = createHexTopologyCache();
  let cached:
    | {
        view: unknown;
        boards: ReturnType<RuntimeFeatureContext["getBoards"]>;
        interactions: RuntimeFeatureSnapshot["interactions"];
        source: ReturnType<typeof game.getOptions>["source"];
        collection: RuntimeCollection<RuntimeBoard>;
      }
    | undefined;
  function collection(): RuntimeCollection<RuntimeBoard> {
    const model = game.getSnapshot();
    const source = game.getOptions().source;
    const projectedBoards = context.getBoards();
    if (
      cached &&
      cached.view === model.view &&
      cached.boards === projectedBoards &&
      cached.interactions === model.interactions &&
      cached.source === source
    )
      return cached.collection;
    const boards = Object.values(projectedBoards).map((data) => {
      const board = context.createBoard(data);
      const geometry =
        data.layout === "hex"
          ? cachedHexTopology({
              id: data.id,
              orientation: data.orientation,
              spaces: Object.values(data.spaces),
            })
          : undefined;
      captures.set(board, { model, source, geometry });
      return board;
    });
    const byId = new Map(boards.map((board) => [board.id, board]));
    const result: RuntimeCollection<RuntimeBoard> = Object.freeze({
      get: (id: string) => requireLookup(byId.get(id), "Board", id),
      find: (id: string) => byId.get(id),
      getAll: () => Object.freeze(boards),
    });
    cached = {
      view: model.view,
      boards: projectedBoards,
      interactions: model.interactions,
      source,
      collection: result,
    };
    return result;
  }
  function targetsFor(owner: RuntimeBoard) {
    const board = owner.data;
    const captured = captures.get(owner)!;
    function matchingTargets(
      model: RuntimeFeatureSnapshot,
      kind: TargetKind,
      id: string,
    ) {
      return model.interactions.list().flatMap((interaction) =>
        interaction
          .getInputs()
          .filter((input) => {
            const domain = input.getDomain();
            return (
              domain.type === "boardTarget" &&
              domain.targetKind === kind &&
              (domain.valueKind === "board-space"
                ? board.scope === "perPlayer" &&
                  domain.boardBaseId === board.baseId
                : domain.boardId === board.id)
            );
          })
          .map((input) => {
            const domain = input.getDomain();
            return {
              interaction,
              input,
              value:
                domain.type === "boardTarget" &&
                domain.valueKind === "board-space"
                  ? Object.freeze({
                      boardId: board.id,
                      spaceId: id,
                    })
                  : id,
            };
          }),
      );
    }
    function target(kind: TargetKind, id: string) {
      const matches = matchingTargets(captured.model, kind, id);
      const eligible = matches.some(({ input, value }) =>
        input.getIsEligible(value),
      );
      const selected = matches.some(({ input, value }) =>
        input.getIsSelected(value),
      );
      const selectable = matches.some(
        ({ input, value }) => !input.getTargetProps(value).disabled,
      );
      function select(options?: RuntimeTargetOptions) {
        if (
          game.getOptions().source !== captured.source ||
          game.snapshot?.me !== captured.model.snapshot?.me
        )
          return;
        const matching = matchingTargets(game.getSnapshot(), kind, id).filter(
          ({ interaction, input, value }) =>
            (!options?.interaction ||
              options.interaction === interaction.key) &&
            (!options?.input || options.input === input.key) &&
            !input.getTargetProps(value).disabled,
        );
        if (!matching.length) return;
        if (matching.length > 1) throw new AmbiguousTargetError(id);
        const domain = matching[0].input.getDomain();
        if (domain.type !== "boardTarget") return;
        const value = matching[0].value;
        const target =
          domain.valueKind === "board-space" && typeof value !== "string"
            ? { kind: "space" as const, valueKind: domain.valueKind, value }
            : {
                kind,
                valueKind: "board-id" as const,
                value: id,
                boardId: board.id,
              };
        context.routeTarget(target, {
          interaction: matching[0].interaction.key,
          input: matching[0].input.key,
        });
      }
      return {
        id,
        getIsEligible: () => eligible,
        getIsSelectable: () => selectable,
        getIsSelected: () => selected,
        getSelectHandler: (options?: RuntimeTargetOptions) => () =>
          select(options),
        getTargetProps(options?: RuntimeTargetOptions) {
          const candidates = matches.filter(
            ({ interaction, input, value }) =>
              (!options?.interaction ||
                interaction.key === options.interaction) &&
              (!options?.input || options.input === input.key) &&
              !input.getTargetProps(value).disabled,
          );
          const only = candidates.length === 1 ? candidates[0] : undefined;
          return {
            type: "button" as const,
            disabled: candidates.length === 0,
            "data-action": "select",
            "data-value":
              only && typeof only.value !== "string"
                ? JSON.stringify(only.value)
                : id,
            "data-board": board.id,
            "data-interaction": options?.interaction ?? only?.interaction.key,
            "data-input": only?.input.key,
            "data-eligible": eligible,
            "data-selected": selected,
            "data-disabled": candidates.length === 0,
            onClick: () => select(options),
          };
        },
      };
    }
    return target;
  }
  const spaceCollections = new WeakMap<
    object,
    RuntimeCollection<RuntimeSpace>
  >();
  function spacesFor(owner: RuntimeBoard): RuntimeCollection<RuntimeSpace> {
    const cached = spaceCollections.get(owner);
    if (cached) return cached;
    const target = targetsFor(owner);
    const data = owner.data;
    const values = Object.freeze(
      Object.values(data.spaces).map((space) =>
        Object.freeze({
          ...target("space", space.id),
          data: space,
          board: owner,
        }),
      ),
    );
    const byId = new Map(values.map((space) => [space.id, space]));
    const spaces = Object.freeze({
      get: (id: string) =>
        requireLookup(byId.get(id), `Space on board ${owner.id}`, id),
      find: (id: string) => byId.get(id),
      getAll: () => values,
    });
    spaceCollections.set(owner, spaces);
    return spaces;
  }
  return {
    root: {
      get boards() {
        return collection();
      },
    },
    board: {
      get spaces(): RuntimeCollection<RuntimeSpace> {
        return spacesFor(this);
      },
      getLayout(
        this: RuntimeBoard,
        options: BoardLayoutOptions,
      ): RuntimeLayout {
        const board = this.data;
        if (board.layout === "generic")
          throw new Error(
            `Board '${board.id}' has no spatial geometry; use board.spaces for semantic selection.`,
          );
        const {
          hexSize,
          origin: suppliedOrigin = { x: 0, y: 0 },
          viewport: suppliedViewport = { x: 0, y: 0, scale: 1 },
        } = options;
        const origin = { ...suppliedOrigin };
        const viewport = { ...suppliedViewport };
        if (!Number.isFinite(hexSize) || hexSize <= 0)
          throw new Error("hexSize must be positive and finite.");
        if (
          ![origin.x, origin.y, viewport.x, viewport.y, viewport.scale].every(
            Number.isFinite,
          ) ||
          viewport.scale <= 0
        )
          throw new Error(
            "Layout transform must be finite with positive scale.",
          );
        const captured = captures.get(this)!;
        const geometry: Geometry =
          board.layout === "hex"
            ? captured.geometry!.getLayout({ hexSize, origin })
            : createSquareBoardLayout(board, hexSize, origin);
        const point = (value: Point): Point =>
          Object.freeze({
            x: value.x * viewport.scale + viewport.x,
            y: value.y * viewport.scale + viewport.y,
          });
        const tileGeometry = createTileBoardLayout(board, hexSize, origin);
        const tiles = Object.freeze(
          tileGeometry.tiles.map((tile) =>
            Object.freeze({
              ...tile,
              center: point(tile.center),
              anchor: point(tile.anchor),
              outlines: Object.freeze(
                tile.outlines.map((loop) => Object.freeze(loop.map(point))),
              ),
            }),
          ),
        );
        const target = targetsFor(this);
        const semanticSpaces = spacesFor(this);
        const spaces = Object.freeze(
          geometry.spaces.map((space) => {
            const corners = Object.freeze(space.corners.map(point));
            const center = point(space.center);
            return Object.freeze({
              ...semanticSpaces.get(space.id),
              center,
              points: () => corners,
              transform: `translate(${center.x} ${center.y})`,
            });
          }),
        );
        const edges = Object.freeze(
          geometry.edges.map((edge) =>
            Object.freeze({
              ...target("edge", edge.id),
              data: board.edges.find((data) => data.id === edge.id),
              center: point({
                x: (edge.from.x + edge.to.x) / 2,
                y: (edge.from.y + edge.to.y) / 2,
              }),
              line: Object.freeze([point(edge.from), point(edge.to)] as const),
            }),
          ),
        );
        const vertices = Object.freeze(
          geometry.vertices.map((vertex) =>
            Object.freeze({
              ...target("vertex", vertex.id),
              data: board.vertices.find((data) => data.id === vertex.id),
              center: point(vertex.center),
            }),
          ),
        );
        return Object.freeze({
          viewBox: tileGeometry.viewBox,
          getTiles: () => tiles,
          getSpaces: () => spaces,
          getEdges: () => edges,
          getVertices: () => vertices,
          pointToSpace(x: number, y: number) {
            return geometry.pointToSpace({
              x: (x - viewport.x) / viewport.scale,
              y: (y - viewport.y) / viewport.scale,
            });
          },
        });
      },
    } satisfies ThisType<RuntimeBoard>,
  };
}

type LayoutTarget<G, Value> = Omit<
  Value,
  "getSelectHandler" | "getTargetProps"
> & {
  getSelectHandler(options?: TargetOptions<G>): () => void;
  getTargetProps(options?: TargetOptions<G>): ActionProps;
};
type LayoutElementData<G, Kind extends "edges" | "vertices"> =
  BoardDataOf<G, IdOf<G, "boardId">> extends infer Topology
    ? Topology extends Record<Kind, readonly (infer Element)[]>
      ? Element
      : never
    : never;
type LayoutElement<G, Kind extends "edges" | "vertices", Value> = LayoutTarget<
  G,
  Omit<Value, "data" | "id">
> & {
  readonly id: LayoutElementData<G, Kind> extends { readonly id: infer Id }
    ? Id
    : never;
  readonly data: LayoutElementData<G, Kind> | undefined;
};
/** Seat tile presentation retains its visible/concealed data union without another discriminator. */
export type BoardLayoutTile<G> =
  BoardDataOf<G, IdOf<G, "boardId">> extends infer Board
    ? Board extends { readonly tiles: readonly (infer Tile)[] }
      ? Omit<TileLayoutGeometry, "data"> & { readonly data: Tile }
      : never
    : never;

type BoardLayout<G> = Omit<
  RuntimeLayout,
  "getSpaces" | "getEdges" | "getVertices" | "getTiles"
> & {
  getTiles(): readonly BoardLayoutTile<G>[];
  getSpaces(): readonly (BoardSpace<G> & {
    readonly center: Point;
    points(): readonly Point[];
    readonly transform: string;
  })[];
  getEdges(): readonly LayoutElement<
    G,
    "edges",
    ReturnType<RuntimeLayout["getEdges"]>[number]
  >[];
  getVertices(): readonly LayoutElement<
    G,
    "vertices",
    ReturnType<RuntimeLayout["getVertices"]>[number]
  >[];
};
export interface BoardFeature<G> {
  readonly root: { readonly boards: BoardCollection<G> };
  readonly board: {
    readonly spaces: BoardSpaceCollection<G>;
    getLayout(this: BoardBase<G>, options: BoardLayoutOptions): BoardLayout<G>;
  };
}
/** Bind one runtime implementation to the same game/source contract as the instance. */
export function boardFeature<G>(
  _game: CoreInstance<G>,
  context: FeatureContext<G>,
): BoardFeature<G> {
  // Game-binding boundary: source identities and installed hooks belong to G.
  // Proven by headless-features/inline-boards type tests and board behavior tests.
  // eslint-disable-next-line no-restricted-syntax -- Instance composition binds these runtime source identities and feature hooks to the same game G.
  return createRuntimeBoardFeature(
    context[runtimeFeatures],
  ) as unknown as BoardFeature<G>;
}
