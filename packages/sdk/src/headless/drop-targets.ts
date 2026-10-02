import { inputValueKey } from "../shared/input-domain.js";
import type { RuntimeDropTarget } from "./targets.js";

/** Targets are rebuilt with every frame; compare their route and destination. */
export function isSameDropTarget(
  left: RuntimeDropTarget,
  right: RuntimeDropTarget,
): boolean {
  if (
    left.interactionKey !== right.interactionKey ||
    left.cardInputKey !== right.cardInputKey
  )
    return false;
  if (left.kind === "interaction" || right.kind === "interaction")
    return left.kind === right.kind;
  return (
    left.kind === right.kind &&
    left.valueKind === right.valueKind &&
    inputValueKey(left.value) === inputValueKey(right.value) &&
    (left.valueKind !== "board-id" ||
      (right.valueKind === "board-id" && left.boardId === right.boardId)) &&
    left.inputKey === right.inputKey
  );
}
