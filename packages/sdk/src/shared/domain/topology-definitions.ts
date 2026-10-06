import type { TopologyFields } from "../board-topology-schema.js";
import type { BoardSpaceSpec, TileTypeSpec } from "./contracts.js";

type DefinitionFields = TopologyFields;
export type GenericSpaceDefinition = Readonly<
  Omit<BoardSpaceSpec, "fields">
> & {
  readonly fields: DefinitionFields;
};
type BoardDefinitionBase = {
  readonly id: string;
  readonly name: string;
  readonly scope: "shared" | "perPlayer";
  readonly typeId?: string;
  readonly fields: DefinitionFields;
};
export type BoardDefinition = BoardDefinitionBase &
  (
    | {
        readonly layout: "generic";
        readonly spaces: Readonly<Record<string, GenericSpaceDefinition>>;
      }
    | { readonly layout: "hex"; readonly orientation: "pointy" | "flat" }
    | { readonly layout: "square" }
  );
type NormalizedFields<T> = Readonly<Omit<T, "fields">> & {
  readonly fields: DefinitionFields;
};
type NormalizedTile<T extends TileTypeSpec> = Omit<
  T,
  | "fieldsSchema"
  | "propertiesSchema"
  | "cellFieldsSchema"
  | "edgeFieldsSchema"
  | "vertexFieldsSchema"
  | "fields"
  | "cells"
  | "edges"
  | "vertices"
> & {
  readonly fields: DefinitionFields;
  readonly cells: readonly (NormalizedFields<T["cells"][number]> & {
    readonly at: Readonly<T["cells"][number]["at"]>;
  })[];
  readonly edges: readonly NormalizedFields<NonNullable<T["edges"]>[number]>[];
  readonly vertices: readonly NormalizedFields<
    NonNullable<T["vertices"]>[number]
  >[];
};
export type TileDefinition =
  | NormalizedTile<Extract<TileTypeSpec, { layout: "hex" }>>
  | NormalizedTile<Extract<TileTypeSpec, { layout: "square" }>>;
export type TopologyDefinitions = {
  readonly boardDefinitions: Readonly<Record<string, BoardDefinition>>;
  readonly tileDefinitions: Readonly<Record<string, TileDefinition>>;
};
