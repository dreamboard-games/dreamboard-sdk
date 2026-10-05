import * as z from "zod";
import { BoardRelationSchema } from "../../shared/board-topology-schema.js";
import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { RuntimeTableRecord } from "../model/table.js";
import { getBoard } from "./board-queries.js";

const additionSchema = BoardRelationSchema.extend({
  id: z.string().min(1),
  directed: z.boolean().default(false),
  fields: BoardRelationSchema.shape.fields.default({}),
});
type RelationDefinitions = TopologyDefinitions & {
  readonly tableSchema: z.ZodType<RuntimeTableRecord>;
};
export function addRelationInPlace({
  table,
  definitions,
  boardId,
  relation,
}: {
  table: RuntimeTableRecord;
  definitions: RelationDefinitions;
  boardId: string;
  relation: unknown;
}): void {
  const board = getBoard(table, definitions, boardId);
  const parsed = additionSchema.parse(relation);
  if (board.relations.some((value) => value.id === parsed.id))
    throw new Error(
      `Duplicate relation identity '${parsed.id}' on board '${boardId}'.`,
    );
  for (const endpoint of [parsed.fromSpaceId, parsed.toSpaceId])
    if (!Object.hasOwn(board.spaces, endpoint))
      throw new Error(
        `Unknown relation endpoint '${endpoint}' on board '${boardId}'.`,
      );
  const candidate = definitions.tableSchema.parse({
    ...table,
    boards: {
      ...table.boards,
      [boardId]: {
        ...table.boards[boardId],
        relations: [...table.boards[boardId].relations, parsed],
      },
    },
  });
  // Full admission applies the board's compiled fields, defaults and live reference constraints.
  getBoard(candidate, definitions, boardId);
  table.boards[boardId] = candidate.boards[boardId];
}

export function removeRelationInPlace({
  table,
  definitions,
  boardId,
  relationId,
}: {
  table: RuntimeTableRecord;
  definitions: TopologyDefinitions;
  boardId: string;
  relationId: string;
}): void {
  const board = getBoard(table, definitions, boardId);
  z.string().min(1).parse(relationId);
  if (!board.relations.some((relation) => relation.id === relationId))
    throw new Error(`Unknown relation '${relationId}' on board '${boardId}'.`);
  table.boards[boardId] = {
    ...table.boards[boardId],
    relations: table.boards[boardId].relations.filter(
      (relation) => relation.id !== relationId,
    ),
  };
}
