import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "./per-player-instance";

const personalBoard = perPlayerInstanceId(
  "board",
  "personal",
  "arbitrary:player",
);
const exact: PerPlayerInstanceId<"board", "personal"> = personalBoard;
void exact;
// @ts-expect-error A card identity cannot satisfy a board identity.
const wrongFamily: PerPlayerInstanceId<"card", "personal"> = personalBoard;
// @ts-expect-error The authored base identity remains correlated.
const wrongBase: PerPlayerInstanceId<"board", "other"> = personalBoard;
// @ts-expect-error Raw wire strings require canonical syntax admission.
const raw: PerPlayerInstanceId<"board", "personal"> =
  '@db/["board","personal","alice"]';
void wrongFamily;
void wrongBase;
void raw;
