# Final SDK packaging and documentation

Status: follows instance, React and registry/scenario cutover.

Publish only root, react, reducer and testing subpaths, plus package.json
metadata. Root is framework-free and excludes reducer execution; React is an
optional adapter; testing remains browser-safe. Delete old runtime/UI/browser
protocol/testing-compiler exports and dependencies after their callers migrate.
Snapshot the final public export surface and retain installed declaration and
import-closure proof. Keep useful typed scripts and packed-game verification;
remove obsolete codegen/workbench tooling and Turbo instead of blindly deleting
working release checks. Pin pnpm in isolated packed-game package metadata.

Migrate templates/game to the final authoring and hosted UI API, with a local
scenario development entry and source registry installation instructions. Prove
that it typechecks and runs against the packed SDK. Reference games remain real
workspace packages; test one immutable packed artifact against both games.
In-memory manifest compilation already exists on the starting main branch; do
not recreate the obsolete generated baseline. Record current type-performance
measurements for both games and investigate material regressions introduced by
the new generic APIs.

Documentation describes only the supported API. Use the original design's guide
structure: getting-started overview/installation/quick-start/concepts; reducer
model/manifest-and-boards/phases/interactions-and-steps/view/testing; UI instance,
turns, inputs, zones, boards, controlled state, sources, coverage, styling, custom
features and testing; registry item pages; Hearts and Hex examples. API pages
cover actual exported constructors, objects, sources and features and list data,
getters, then handlers. Guides open with a small complete example. Keep the root
README as an entry point. Replace obsolete authoring spike claims or mark the
original design clearly historical. A scripts check verifies API documentation
names against the actual public surface; do not invent exports to match stale
page names.

Layer 006 must finish registry build/validation in the root gate, real shadcn
installation smoke, Storybook with scenario/checkpoint stories, bound source
items, scenario development UI and DOM-attribute browser helpers. Delete tapes,
workbench, digests and source-regex UI tests after their replacements prove the
same reachable behavior. Optional animation remains app/registry owned.

The requested registry hostname is registry.dreamboard.games. Inspect existing
docs/static hosting ownership before preparing deployment; do not claim a live
hostname from a successful local registry build. Prepare a concrete reviewed
hosting change if needed and record deployment as a distinct delivery item.
Read-only checks on 2026-09-24 found this hostname returns NXDOMAIN and the SDK
GitHub Pages endpoint returns 404. The public tools repo has Mintlify docs config;
no existing registry deployment was found. This remains an explicit hosting
delivery item, not something proven by the local installation smoke.

Run pnpm check and the complete browser lane against the final SDK candidate,
then release:verify. Record exact candidate SHA and integrity. Choose a fresh
prerelease version only after checking npm. SDK publication uses its reviewed
default-branch OIDC workflow; public runtime/dev-host and internal adoption follow
plans/008-downstream-adoption.md. No private consumer local links, tarball pins or
local registry substitutes are permitted.
