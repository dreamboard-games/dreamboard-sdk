# Manifest board geometry

Status: independent preparation on `codex/sdk-board-geometry`; integrate after
shared-model consolidation. Worktree: `/Users/mac/code/worktrees/headless-sdk-boards`.

Implement the original board contract with honeycomb-grid, using exact version
4.1.5 unless live package verification gives a concrete reason otherwise. Keep
square boards supported. No second geometry engine or type-level axial arithmetic.

- Shape-based hex manifests: hexagon, rectangle, ring, spiral and explicit
  coordinates, orientation, optional exclusions and per-coordinate data/ID
  overrides. Use library geometry/traversal rather than home-grown parsing/math.
- Deterministic derived spaces, edges and vertices. Reuse canonical manifest
  identity types; get edge/vertex identities through queries, not manual strings.
- Queries: neighbors, distance, ring, line, edges/vertices and their relationships.
  Layout produces viewBox, per-space geometry, edge lines, vertex centers, and
  point-to-space. Geometry is independent of React and interaction eligibility.
- Migrate Hex's manual board adjacency/geometry and relevant scenarios to the
  manifest/query API. Preserve its rule.md behavior and scenarios. Pure registry
  grids take these precomputed values; their interactive binding comes later.
- Delete replaced hex-geometry, board templates/type arithmetic and competing
  geometry paths. Use checked type proofs for invalid board/space identities,
  geometrical property tests for deterministic shared edge/vertex identities,
  adjacency/distance/round-trip hit testing and both reference games.

Work independently from layer002's source checkout. Do not edit lifecycle,
pending steps, PerPlayer representation, source/React APIs, or downstream repos.
Open SDK PR #25 owns existing manifest inference fixes: inspect it before touching
overlapping inference code; do not duplicate its unrelated fixes. New board type
requirements may need a small deliberate change in the owning manifest module.

Start by mapping current manifest/materialization/query consumers and report any
unavoidable contract coupling. Then implement a coherent checked branch. Root
will transplant/rebase the reviewed commit(s) at the correct stack layer and
resolve path moves via the owning executor. Don't push or publish this branch.
