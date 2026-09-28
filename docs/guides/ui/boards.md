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

Boards exist only with boardFeature enabled. Layout and hit testing use canonical materialized geometry; static metadata is not guessed from arbitrary view keys. Board controls route through current canonical inputs, with board identity and player-space values preserved. All boards expose semantic `spaces`; hex and square boards also have layout support. The registry owns SVG rendering, touch areas and converting browser pixels into layout coordinates.

With your authored game type bound to the instance, board and space IDs are
checked together. Required lookups return values directly and throw when missing;
use `find` for an optional lookup (for example before the first frame arrives).

```ts
const board = game.boards.get("mat:player-2");
const space = board.spaces.get("slot");
space.getSelectHandler({ interaction: "play.place" })();
```

Each space exposes `id`, typed `data`, its owning `board`, selection state, and
`getTargetProps()` for native controls. No geometry is needed for a generic board.
`board.getLayout({ hexSize: 40 }).getSpaces()` reuses those semantic controls and adds geometry.
Retained spaces capture their state; selection handlers recheck current eligibility
and ignore a replaced source or seat. Pass `input` alongside `interaction` when
more than one input in the interaction accepts the same target.

For `phase.inputs.board.playerSpace({ boardId: "mat" })`, each eligible value is
`{ boardId: "mat", playerId: "player-2", spaceId: "slot" }`. The tuple's `boardId`
is the base manifest ID; the board collection uses the runtime ID
`"mat:player-2"`. A single input submits the tuple, and `many(...)` submits an
array of tuples. A scalar space ID is rejected. Spaces with the same name on
different players' boards remain independently selectable; the authored `where`
predicate decides whether an opponent's space is eligible.

Ordinary board inputs keep scalar element IDs. An ordinary input may also name
a fully specified runtime board ID, such as `"mat:player-2"`, because that domain
already identifies the board and player. Retained layout snapshots keep their
captured selection state, while their handlers check current eligibility before
selecting.

`game.drag.getDropTargets()` exposes the same distinction through `valueKind`:
`"board-id"` has a scalar `value` and runtime `boardId`; `"player-board-space"` has
a complete tuple `value` containing the base board ID. Each target also carries
`interactionKey`, `cardInputKey`, and `inputKey`, so a drop updates the exact
card and destination inputs atomically. Pass the returned target to
`setDropTarget` without reconstructing it.

This is a hard cut in the interaction wire schema: every board domain requires
`valueKind`, and per-player domains carry tuple-valued `eligibleTargets`.
Producers, UI hosts, custom source fixtures, and SDK consumers must adopt the
same exact published SDK version together. Remove scalar reconstruction and old
string-array fixtures before deployment; publishing this SDK change alone does
not complete the downstream migration.
