# Tile inventory (execution PR 6)

Branch: `codex/tile-inventory`, after attached zones. The accepted
[private-tile boundary](private-tiles.md) remains authoritative.

## Ownership

The game owns `tileTypes` and `tileSeeds`. A tile type is a reusable public rule
definition. A runtime tile contains only its stable ID, `tileTypeId`, current
`ownerId` and mutable `properties`. Geometry is never copied into each instance.
Canonical component locations and ordered zone memberships own placement and
containment; there is no board-owned catalog or independent placement map.

## Authoring contract

Tile types share `id`, `name`, optional immutable `fields` validated by
`fieldsSchema`, optional mutable-instance `propertiesSchema`, and optional
`frontImage`. They form an exact `layout: "hex" | "square"` union.

Each type requires a nonempty `cells` array with explicit local IDs and local
coordinates: `at: { q, r }` for hex and `at: { col, row }` for square. Cells may
have a name, type ID and immutable fields. `cellFieldsSchema`, `edgeFieldsSchema`
and `vertexFieldsSchema` validate their corresponding immutable metadata.
Optional edge and vertex annotations always name `cellId` plus a bounded side
or corner (0–5 for hex, 0–3 for square). They may supply type, label and fields.
There is no special single-cell shorthand.

Tile seeds declare `id`, `typeId`, optional positive `count`, optional `scope`,
initial `properties`, and a home. This layer supports only detached and zone
homes. Omitted scope is shared; per-player replication uses the actual roster
and the same canonical instance codec as the other component families.

Use the existing portable field-schema/default/reference implementation and
asset-path validation. Reject duplicate local IDs or coordinates, unsafe or
out-of-bounds coordinates, annotations naming absent cells, invalid side/corner
values, and collisions between expanded tile IDs and other component families.
No extra parser, generated API reference or generic schema framework is needed.

## Runtime and intermediate privacy rule

`q.tile(id)` addresses game-owned inventory, including detached tiles. Generic
component queries, owner mutation, cloning, ordered movement/dealing, exact
inventory restore and cycle admission include tiles. Moving a tile onto a
space, edge or vertex is invalid: board placement will be its own `OnBoard`
location in PR 7.

Until PR 8 supplies the complete projection boundary, reject every tile home or
destination whose zone policy is nonpublic, before mutation. Do not add hidden
tile references or implicitly widen the existing card presentation/count API.
Do not copy tile seeds or instance-to-type assignments into static projections.
Definition delivery can wait for its actual consumer; no unused public channel.

## Handoff to topology

PR 7 introduces discriminated hex/square `OnBoard` locations, derived topology,
default board homes, stable tile-instance/local-cell spaces, session relations
and reference-game migration. Board queries enumerate only tiles currently
placed on that exact runtime board. The attachment selector and codec for
tile-local spaces must preserve identity while detached or moved within a board;
they must not remember a last board or duplicate placement ownership.

## Acceptance

- Exact inferred tile/type IDs, properties and canonical per-player families.
- Deterministic count/roster expansion and independent ownership transfer.
- Restore rejects wrong identity, type, key, roster, location or membership.
- Mixed public zones preserve ordered component movement and rejection atomicity.
- Private destinations and non-tile spatial locations reject before writes.
- No seed assignments enter static frames or the UI bridge.
- Existing reference games, card presentation, packed consumers and aggregate
  gates continue to pass.
