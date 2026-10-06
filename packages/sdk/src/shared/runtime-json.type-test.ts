import type {
  ReadonlyRuntimeData,
  ReadonlyRuntimeJson,
  RuntimeJson,
} from "./runtime-json.js";
import type { BoardEdgeId } from "./domain/board-identities.js";
import type { ReadonlyData } from "../headless/model.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const unknownRemainsUnknown: Equal<
  ReadonlyRuntimeData<unknown>,
  unknown
> = true;
const headlessUnknownRemainsUnknown: Equal<
  ReadonlyData<unknown>,
  unknown
> = true;
const brandedPrimitive: Equal<
  ReadonlyRuntimeData<BoardEdgeId<"map">>,
  BoardEdgeId<"map">
> = true;
const tuple: Equal<
  ReadonlyRuntimeData<[BoardEdgeId<"map">, { enabled: boolean }]>,
  readonly [BoardEdgeId<"map">, { readonly enabled: boolean }]
> = true;
const recursiveJson: Equal<
  ReadonlyRuntimeData<RuntimeJson>,
  ReadonlyRuntimeJson
> = true;
const alreadyReadonly: Equal<
  ReadonlyRuntimeData<ReadonlyRuntimeJson>,
  ReadonlyRuntimeJson
> = true;
void [
  unknownRemainsUnknown,
  headlessUnknownRemainsUnknown,
  brandedPrimitive,
  tuple,
  recursiveJson,
  alreadyReadonly,
];
