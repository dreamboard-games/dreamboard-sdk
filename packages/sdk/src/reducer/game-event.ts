import type { SystemActionEvent } from "./model";

export const gameEvent = {
  systemAction(event: Omit<SystemActionEvent, "kind">): SystemActionEvent {
    return {
      kind: "systemAction",
      ...event,
    };
  },
};
