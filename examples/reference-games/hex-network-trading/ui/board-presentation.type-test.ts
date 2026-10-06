import type { BoardTargetsProps } from "./components/dreamboard/board-targets";

type PresentedSpace = Parameters<
  NonNullable<BoardTargetsProps["renderSpace"]>
>[0];
declare const space: PresentedSpace;
const metadataIsAny: 0 extends 1 & typeof space.data ? true : false = false;
const terrain: "pineForest" | "clayFlats" | "grainFields" | "barrens" =
  space.data.typeId;
const number: number | null = space.data.fields.number;
const resource: "timber" | "brick" | "provisions" | null =
  space.data.fields.resourceId;
const point: { readonly x: number; readonly y: number } = space.points()[0];
// @ts-expect-error Projected immutable terrain metadata retains its declared value type.
const wrongNumber: string = space.data.fields.number;
// @ts-expect-error Projected geometry cannot mutate the immutable cell metadata.
space.data.fields.number = 2;
void [metadataIsAny, terrain, number, resource, point, wrongNumber];
