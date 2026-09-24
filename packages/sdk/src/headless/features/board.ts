import { createHexBoardGeometry } from "../../shared/hex-board.js";
import type {
  RuntimeBoardCollections,
  RuntimeBoardState,
  RuntimeSquareBoardState,
} from "../../reducer/model/table.js";
import type {
  BoardBase,
  BoardCollection,
  CoreInstance,
  FeatureContext,
  IdOf,
  InteractionKey,
  ReadModel,
} from "../model.js";
import type { Point } from "./pointer-session.js";
import type { ViewportTransform } from "./pan-zoom.js";

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

function squareGeometry(
  board: RuntimeSquareBoardState,
  size: number,
  origin: Point,
): Geometry {
  const spaces = Object.values(board.spaces).map((space) => {
    const x = origin.x + space.col * size;
    const y = origin.y + space.row * size;
    return {
      id: space.id,
      center: { x: x + size / 2, y: y + size / 2 },
      corners: [
        { x, y },
        { x: x + size, y },
        { x: x + size, y: y + size },
        { x, y: y + size },
      ],
    };
  });
  const byId = new Map(spaces.map((space) => [space.id, space]));
  function sharedCorners(ids: readonly string[]) {
    const first = byId.get(ids[0] ?? "")?.corners ?? [];
    return first.filter((point) =>
      ids.every((id) =>
        byId
          .get(id)
          ?.corners.some(
            (candidate) => candidate.x === point.x && candidate.y === point.y,
          ),
      ),
    );
  }
  const points = spaces.flatMap((space) => space.corners);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = xs.length ? Math.min(...xs) : 0;
  const y = ys.length ? Math.min(...ys) : 0;
  return {
    viewBox: {
      x,
      y,
      width: xs.length ? Math.max(...xs) - x : 0,
      height: ys.length ? Math.max(...ys) - y : 0,
    },
    spaces,
    // Incidence is authored. Only a unique geometric line/point is representable.
    edges: board.edges.flatMap((edge) => {
      const corners = sharedCorners(edge.spaceIds);
      return corners.length === 2
        ? [{ id: edge.id, from: corners[0]!, to: corners[1]! }]
        : [];
    }),
    vertices: board.vertices.flatMap((vertex) => {
      const corners = sharedCorners(vertex.spaceIds);
      return corners.length === 1
        ? [{ id: vertex.id, center: corners[0]! }]
        : [];
    }),
    pointToSpace(point) {
      const col = Math.floor((point.x - origin.x) / size);
      const row = Math.floor((point.y - origin.y) / size);
      return Object.values(board.spaces).find(
        (space) => space.col === col && space.row === row,
      )?.id;
    },
  };
}

/** Static topology plus captured seat selection. Generic boards remain data-only. */
export function boardFeature<G>(
  game: CoreInstance<G>,
  context: FeatureContext<G>,
) {
  const captures = new WeakMap<
    object,
    {
      model: ReadModel<G>;
      source: ReturnType<typeof game.getOptions>["source"];
      geometry?: ReturnType<typeof createHexBoardGeometry>;
    }
  >();
  const geometries = new WeakMap<
    object,
    ReturnType<typeof createHexBoardGeometry>
  >();
  let cached:
    | {
        view: unknown;
        interactions: ReadModel<G>["interactions"];
        source: ReturnType<typeof game.getOptions>["source"];
        collection: BoardCollection<G>;
      }
    | undefined;
  function collection(): BoardCollection<G> {
    const model = game.getSnapshot();
    const source = game.getOptions().source;
    if (
      cached?.view === model.view &&
      cached.interactions === model.interactions &&
      cached.source === source
    )
      return cached.collection;
    // The canonical materializer joins manifest.staticBoards at view.boards.
    // Do not infer topology from arbitrary authored overlay fields.
    const projected = model.view as {
      boards?: Pick<RuntimeBoardCollections, "byId" | "hex" | "square">;
    } | null;
    const boards = Object.values(projected?.boards?.byId ?? {}).map((data) => {
      const board = context.createBoard(data.id as IdOf<G, "boardId">, data);
      let geometry = geometries.get(data);
      if (!geometry && data.layout === "hex") {
        geometry = createHexBoardGeometry({
          id: data.baseId ?? data.id,
          orientation: data.orientation,
          spaces: Object.values(data.spaces),
        });
        geometries.set(data, geometry);
      }
      captures.set(board, { model, source, geometry });
      return board;
    });
    const byId = new Map(boards.map((board) => [board.id, board]));
    const result: BoardCollection<G> = Object.freeze({
      get<K extends IdOf<G, "boardId">>(id: K) {
        return byId.get(id) as
          | (BoardBase<G, K> & { readonly game: CoreInstance<G> })
          | undefined;
      },
      getAll: () => Object.freeze(boards),
    });
    cached = {
      view: model.view,
      interactions: model.interactions,
      source,
      collection: result,
    };
    return result;
  }
  return {
    root: {
      get boards() {
        return collection();
      },
    },
    board: {
      getLayout(this: BoardBase<G>, options: BoardLayoutOptions) {
        const board = this.data as RuntimeBoardState;
        if (board.layout === "generic")
          throw new Error(
            `Board '${board.id}' has no spatial geometry; read its data instead.`,
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
            : squareGeometry(board, hexSize, origin);
        const point = (value: Point): Point =>
          Object.freeze({
            x: value.x * viewport.scale + viewport.x,
            y: value.y * viewport.scale + viewport.y,
          });
        function matchingTargets(model: ReadModel<G>, kind: TargetKind) {
          const inputKinds = kind === "space" ? ["space", "tile"] : [kind];
          return model.interactions.list().flatMap((interaction) =>
            interaction
              .getInputs()
              .filter((input) => {
                const domain = input.getDomain();
                return (
                  domain.type === "boardTarget" &&
                  inputKinds.includes(String(domain.targetKind)) &&
                  (domain.boardId === board.id ||
                    domain.boardId === board.baseId) &&
                  (board.scope !== "perPlayer" ||
                    board.playerId === model.me?.id)
                );
              })
              .map((input) => ({ interaction, input })),
          );
        }
        function target(kind: TargetKind, id: string) {
          const matches = matchingTargets(captured.model, kind);
          const eligible = matches.some(({ input }) => input.getIsEligible(id));
          const selected = matches.some(({ input }) => input.getIsSelected(id));
          const selectable = matches.some(
            ({ input }) => !input.getTargetProps(id).disabled,
          );
          function select(options?: { interaction?: InteractionKey<G> }) {
            if (
              game.getOptions().source !== captured.source ||
              game.snapshot?.me !== captured.model.snapshot?.me
            )
              return;
            const matching = matchingTargets(game.getSnapshot(), kind).filter(
              ({ interaction, input }) =>
                (!options?.interaction ||
                  options.interaction === interaction.key) &&
                !input.getTargetProps(id).disabled,
            );
            if (!matching.length) return;
            const domain = matching[0]!.input.getDomain();
            context.routeTarget(kind, id, {
              ...options,
              boardId: String(domain.boardId) as IdOf<G, "boardId">,
            });
          }
          return {
            id,
            getIsEligible: () => eligible,
            getIsSelectable: () => selectable,
            getIsSelected: () => selected,
            getSelectHandler:
              (options?: { interaction?: InteractionKey<G> }) => () =>
                select(options),
            getTargetProps(options?: { interaction?: InteractionKey<G> }) {
              const candidates = matches.filter(
                ({ interaction, input }) =>
                  (!options?.interaction ||
                    interaction.key === options.interaction) &&
                  !input.getTargetProps(id).disabled,
              );
              const only = candidates.length === 1 ? candidates[0] : undefined;
              return {
                type: "button" as const,
                disabled: candidates.length === 0,
                "data-action": "select",
                "data-value": id,
                "data-board": board.id,
                "data-interaction":
                  options?.interaction ?? only?.interaction.key,
                "data-input": only?.input.key,
                "data-eligible": eligible,
                "data-selected": selected,
                "data-disabled": candidates.length === 0,
                onClick: () => select(options),
              };
            },
          };
        }
        const spaces = Object.freeze(
          geometry.spaces.map((space) => {
            const corners = Object.freeze(space.corners.map(point));
            const center = point(space.center);
            return Object.freeze({
              ...target("space", space.id),
              data: board.spaces[space.id],
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
          viewBox: Object.freeze({ ...geometry.viewBox }),
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
    },
  };
}
