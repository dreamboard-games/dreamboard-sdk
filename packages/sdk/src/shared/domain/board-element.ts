import * as z from "zod";
import { GENERATED_ID_PREFIX } from "./per-player-instance.js";
import type { BoardEdgeId, BoardVertexId } from "./board-identities.js";

const elementTuple = z.tuple([
  z.enum(["board-edge", "board-vertex"]),
  z.enum(["hex", "square"]),
  z.string().min(1),
  z.string().min(1),
]);
function validLattice(
  kind: "board-edge" | "board-vertex",
  layout: "hex" | "square",
  value: string,
): boolean {
  const pattern =
    layout === "hex"
      ? kind === "board-edge"
        ? /^(-?\d+),(-?\d+):e[012]$/
        : /^(-?\d+),(-?\d+):v[01]$/
      : kind === "board-edge"
        ? /^(-?\d+),(-?\d+):[hv]$/
        : /^(-?\d+),(-?\d+)$/;
  const match = pattern.exec(value);
  return (
    match !== null &&
    [match[1], match[2]].every(
      (part) =>
        Number.isSafeInteger(Number(part)) && String(Number(part)) === part,
    )
  );
}
function encode(
  kind: "board-edge" | "board-vertex",
  layout: "hex" | "square",
  boardId: string,
  latticeId: string,
): string {
  elementTuple.parse([kind, layout, boardId, latticeId]);
  if (!validLattice(kind, layout, latticeId))
    throw new Error("Invalid canonical board lattice identity.");
  return `${GENERATED_ID_PREFIX}${JSON.stringify([kind, layout, boardId, latticeId])}`;
}
export function boardEdgeId<BoardId extends string>(
  layout: "hex" | "square",
  boardId: BoardId,
  latticeId: string,
): BoardEdgeId<BoardId> {
  return encode(
    "board-edge",
    layout,
    boardId,
    latticeId,
  ) as BoardEdgeId<BoardId>;
}
export function boardVertexId<BoardId extends string>(
  layout: "hex" | "square",
  boardId: BoardId,
  latticeId: string,
): BoardVertexId<BoardId> {
  return encode(
    "board-vertex",
    layout,
    boardId,
    latticeId,
  ) as BoardVertexId<BoardId>;
}
/** Syntax proves namespace only; current placement owns element membership. */
export function parseBoardElementId(value: unknown): {
  kind: "edge" | "vertex";
  layout: "hex" | "square";
  boardId: string;
  latticeId: string;
} | null {
  if (typeof value !== "string" || !value.startsWith(GENERATED_ID_PREFIX))
    return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(value.slice(GENERATED_ID_PREFIX.length));
  } catch {
    return null;
  }
  const parsed = elementTuple.safeParse(candidate);
  if (!parsed.success) return null;
  const [kind, layout, boardId, latticeId] = parsed.data;
  if (
    !validLattice(kind, layout, latticeId) ||
    encode(kind, layout, boardId, latticeId) !== value
  )
    return null;
  return {
    kind: kind === "board-edge" ? "edge" : "vertex",
    layout,
    boardId,
    latticeId,
  };
}
