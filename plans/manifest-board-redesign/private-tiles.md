# Private tiles and authority

Accepted design for the implementation stack. This replaces the original
board-owned catalog sketches in layers 06–08. Examples are target contracts.

## Definitions, instances and location

Use direct manifest collections `tileTypes` and `tileSeeds`, matching pieces
and dice. Types own layout, local cells, immutable fields, edge/vertex annotations
and presentation. Seeds own type, count, scope and initial home. Runtime tiles
have stable component IDs, types, mutable properties and owners.

Exactly one component location owns a tile's location: detached, in a zone, or
on a board with coordinates and rotation. Derive board placement indexes from
those locations; do not persist a second independently mutable placement store.
Zone arrays own ordering and agree atomically with component location membership.
A fixed board starts with seeded tile instances placed on it.

Hex and square placements are explicitly discriminated by layout, with compatible
board/tile layouts and bounded rotation. Runtime space identity combines a tile
instance ID and local cell ID; current location determines board membership.
Edges and vertices retain board-scoped world-coordinate identities. String
boundaries use one collision-free codec; UI never reconstructs IDs.

## Public definitions, private assignments

Reusable tile definitions are public game rules. The initial feature does not
promise secret authored definitions or protected artwork. Session assignments
(instance to definition), private order, mutable fields and placements stay
behind the runtime authority. Immutability alone does not authorize publication:
do not automatically send the full authored manifest to clients.

A public definition cache contains deliberately public definitions, never private
setup/assignment data. Local gameplay puts authority on the user's machine;
isolating the authored UI cannot conceal state from the machine's owner. Hosted
multiplayer secrecy requires server authority.

## Seat projection owns delivery

Full definitions and session state produce authoritative topology. Trusted
projection then produces an SDK-owned `boards` field for one seat. Reducer
queries use authoritative topology; client layout uses projected topology only.

Each tile projects as:

- Visible: a seat reference, permitted face/fields and disclosed location.
- Concealed: a seat reference and independently declared public appearance.
- Omitted: no tile entry. Counts appear only when deliberately disclosed.

Use an explicit visible/concealed discriminated union. Concealed entries carry no
secret type/instance/cell IDs, terrain, edge fields or connectivity. A public
footprint is declared independently of the hidden face; deriving its outline from
secret geometry can reveal identity. Omitted topology cannot influence client
bounds/adjacency/targets except through facts explicitly exposed by game rules.

`perPlayer` means replication, not privacy. Location, ownership and disclosure
are independent. A location policy determines the audience and resolves its host
owner. Tile restrictions may narrow access; revealing beyond location policy
requires an explicit state/policy change. Ownership changes recalculate access
immediately and do not implicitly transfer ownership of contained components.
Already disclosed information cannot be forgotten.

Keep one seat-board projection owner. Retain shared static caching only for a
clear, non-overlapping public responsibility; never put private placement there.
Hosted browsers must not receive all private seats and select one in the UI.

The concrete policy model uses the existing zone visibility vocabulary. Boards
declare `public`, `ownerOnly` or `hidden` visibility; runtime board visibility
is initialized from that declaration and can change explicitly. Shared boards
cannot use `ownerOnly`. Per-player boards default to public. Zone policies remain
definition-owned; relocating a tile changes its containing location policy.
There is no global location-policy registry or additional board-ownership store.

Each runtime tile has a face audience (`public`, `owner`, `none`, or an explicit
runtime seat list) and an optional independently authored public appearance.
Seeds cannot name runtime seats. Appearances contain only layout, footprint
coordinates and optional back artwork. Zone snapshots contain projected tiles
inline; boards contain placed projected tiles. No second client tile-membership
map is required. Detached tiles are omitted. Visible tiled cells use seat space
references, and authored views request references explicitly from their view
context rather than passing authoritative instance identities to UI consumers.

## Actions, references and events

Authoritative `TileId` and client `SeatTileRef` are distinct types. Concealed
references cannot encode identity or preserve tracking through a hidden shuffle.
Resolve submitted references only for their issuing seat and frame/action basis;
an old reference is rejected rather than selecting a different tile after reorder.

The trusted host supplies `{ sessionId, version }` to projection and dispatch.
The full submitted frame basis also names the issuing perspective and action set.
A hosted session's unique, non-reused session ID supplies the authority lifetime;
local sources create a fresh lifetime outside checkpoints. Accepted commands and
restores advance the version. Restores reproject state instead of relabelling
persisted old projections. Reference issuance depends on this public basis,
the seat and disclosed slots, never a hash of secret state or authoritative IDs.
The SDK reconstructs the same ephemeral reference domain at ingress; checkpoint
state contains no reference map. Materialization rejects a mismatched basis.

Draw intent names a zone. The trusted reducer selects the hidden top component.
Schema-aware projection covers targets, defaults, drafts, results and errors,
not just rendered data. Do not scan arbitrary strings and guess which are IDs.

Events need an explicit disclosure contract: public payloads or a seat audience.
Typed component references follow the same disclosure policy. Authored arbitrary
text is explicit publication by the author; the SDK cannot sanitize secrets
interpolated into arbitrary labels. Raw global event forwarding is incompatible
with private tile operations and must be fixed in the privacy layer.

## Topology and dependency rules

Geometric adjacency and game-defined relations are distinct. Relations live in
session state, with endpoints naming stable spaces. Cache geometry separately
from connectivity, or include all relevant inputs in one cache key.

- Removal rejects direct occupants, nonempty space-attached zones, incident
  explicit relations, and occupied dependent world edges/vertices.
- Same-board movement carries stable spaces and attached contents. Occupied
  world edges/vertices block the move. Relations follow space identity while
  geometric adjacency is recomputed; rules enforce additional contact conditions.
- Cross-board relocation rejects dependencies rather than silently migrating
  occupant board IDs, attached hosts or relations.
- Validate before mutation. Reducers can explicitly clear dependencies earlier
  in the same transaction before removing/relocating a tile.
- Conflicting metadata from adjacent tiles on one world element is a deterministic
  error, not last-writer-wins behaviour.
- Containment cycles are forbidden. Visibility derives from current host ownership,
  not a value captured only when a component moved.

Space-attached hosts use stable tile-instance and local-cell identity independently
of world placement. An empty attached zone may persist for a known detached tile,
but adding contents requires its space to be currently placed. Initialization and
restore reject detached tiles with nonempty space-attached zones. Moving within a
board keeps the host and contents; movement does not create a second zone or
placement owner.

## Validation stages

Manifest validation owns portable schemas, definition refs and seed constraints.
Initialization resolves roster-derived instances. Mutation/ingress checks current
existence, membership and legality. Fixed manifest-time enums cannot validate
arbitrary future world elements or runtime roster instances. One stage-aware
schema owner serves authoring, initialization, state validation and restore.
Unsupported schema refinements/transforms must fail before conversion: silently
dropping constraints is not an acceptable portable-schema contract.

## Required proof

Each PR owns its regressions. A small authored scenario covers hidden bag to
private hand to public placement, private-board reveal, stale handles after
shuffle, ownership transfer, rejected dependency removal and deterministic restore.

Compare complete unauthorized frames for states differing only in undisclosed
information: boards, events, descriptors, defaults, drafts, IDs and counts must
match when the game exposes the same public facts. A rule's deliberately public
legality result can reveal information; renderer internals cannot.

Privacy acceptance covers every supported component location, including zones,
spaces, edges and vertices. Descriptor targets, defaults and selected draft values,
as well as event payloads, must obey the same seat policy. Concealment must not
leave invalid partial selections or defaults outside the emitted target domain.
Until a location has that projection coverage, mutation must not newly enable
concealment there.

Browser tests perform the flow from two seats. Internal integration inspects
actual hosted payloads and UI bridge messages. Hearts and Hex preserve their
rules; use a compact fixture/story for private tiles rather than a third game.

## Hard cut

Old SDK bundles, running sessions and checkpoints need not remain compatible.
Rebuild artifacts and start fresh games during coordinated internal adoption.
Delete obsolete readers and wire variants; no migration or legacy runtime.
