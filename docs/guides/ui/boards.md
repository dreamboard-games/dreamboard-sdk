# Boards

```ts
import {
  createGameInstance,
  iframeSource,
  boardFeature,
} from "@dreamboard-games/sdk";
export const game = createGameInstance<unknown>()({
  source: iframeSource(),
  features: (core, context) => ({ board: boardFeature(core, context) }),
});
export const boards = game.boards.getAll();
```

Boards exist only with boardFeature enabled. Layout and hit testing use canonical materialized geometry; static metadata is not guessed from arbitrary view keys. Board controls route through current canonical inputs, with canonical runtime board identity preserved. All boards expose semantic `spaces`; hex and square boards also have layout support. The registry owns SVG rendering, touch areas and converting browser pixels into layout coordinates.

With your authored game type bound to the instance, board and space IDs are
checked together. Required lookups return values directly and throw when missing;
use `find` for an optional lookup (for example before the first frame arrives).

```ts
const board = game.boards
  .getAll()
  .find(
    (board) =>
      board.data.baseId === "mat" && board.data.playerId === game.me?.id,
  );
if (board) {
  const space = board.spaces.get("slot");
  space.getSelectHandler({ interaction: "play.place" })();
}
```

Each space exposes `id`, typed `data`, its owning `board`, selection state, and
`getTargetProps()` for native controls. No geometry is needed for a generic board.
`board.getLayout({ hexSize: 40 }).getSpaces()` reuses those semantic controls and adds geometry.
Retained spaces capture their state; selection handlers recheck current eligibility
and ignore a replaced source or seat. Pass `input` alongside `interaction` when
more than one input in the interaction accepts the same target.

For `phase.inputs.board.playerSpace({ boardId: "mat" })`, the authored `boardId`
selects a board family. Each eligible value is `{ boardId, spaceId: "slot" }`,
where `boardId` is the canonical runtime instance ID from the board collection.
A single input submits that pair; `many(...)` submits an array of pairs. A scalar
space ID or the old `{ boardId: base, playerId, spaceId }` shape is rejected.
Spaces with the same name on different players' boards remain independently
selectable. The authored `where` predicate decides whether an opponent's space
is eligible.

Ordinary board inputs keep scalar element IDs because their domain already fixes
one runtime board. Retained layout snapshots keep their captured selection state,
while their handlers check current eligibility before selecting.

`game.drag.getDropTargets()` exposes the same distinction through `valueKind`:
`"board-id"` has a scalar `value` and runtime `boardId`; `"board-space"` has a
complete `{ boardId, spaceId }` value. Each target also carries `interactionKey`,
`cardInputKey`, and `inputKey`, so a drop updates the exact card and destination
inputs atomically. Pass the returned target to `setDropTarget` unchanged.

Runtime instance IDs are opaque to UI code. Use IDs from projected boards or
eligible targets, and compare them directly. Do not join a board base and player
string or parse an ID to infer current ownership. A canonical ID can still name
an instance absent from the current session.

This is a hard cut in the interaction wire schema. Producers, UI hosts, custom
source fixtures, and SDK consumers must adopt the same exact published SDK
version together. Remove `"player-board-space"` domains and player-bearing target
values before deployment; publishing the SDK alone does not complete downstream
adoption.
