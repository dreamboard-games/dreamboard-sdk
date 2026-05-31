import type { KeyboardEvent } from "react";

export function handleKeyboardActivation(
  event: KeyboardEvent,
  onActivate: (() => void) | undefined,
  options?: { stopPropagation?: boolean },
): void {
  if (!onActivate) {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  if (options?.stopPropagation) {
    event.stopPropagation();
  }
  onActivate();
}
