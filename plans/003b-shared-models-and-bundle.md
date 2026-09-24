# Shared models and one validated bundle

Status: scoped after steps; board geometry is integrated and schema preparation
is proceeding independently.

Consolidate the three private type/contract packages into the SDK. Root owns
framework-free shared models, seat-frame materialization, canonical protocol and
worker admission APIs. `/reducer` owns authoring, manifest compilation and reducer
execution. `/testing` must stay browser-safe for local/scenario sources; React
stays in `/react`. Hosted root imports must not reach reducer execution or React.
Use the existing canonical RuntimeJson, outcomes/events, identities, descriptors
and state concepts rather than copying duplicate barrels into new directories.

Implement in independently green cuts if necessary:

1. Move package ownership and repoint imports/build/declaration tooling, then
   remove the emptied private packages. Existing public facade pruning may wait
   until its consumers migrate in 004–007; do not introduce compatibility APIs.
2. Consolidate duplicate models. Remove remaining generic/square board template
   merging by moving declared data onto the board, coordinated with 003c's hex
   removal. Delete template IDs, maps, type helpers and validation branches once
   no owned caller uses them.
3. Replace PerPlayer wrappers with ordinary records in hands, zones.perPlayer
   and resources together. Update schemas, defaults, clone/query/mutation code,
   fixtures and checked type proofs. Preserve playerOrder as the ordering
   authority. Delete the wrapper helpers and dual-representation parsing.
4. Replace trusted/ingress bundle objects with one createReducerBundle authority,
   composing the reviewed execution/projection helpers. Move test runtime
   wrappers to testing ownership. Migrate tests to bound createGame/tx authoring,
   then delete internal.ts, free/unbound helpers and legacy runtime argument keys.

## Schema and boundary decisions

Final canonical protocol/runtime schemas are SDK-local strict JSON-native Zod;
DTOs use z.infer. Replace the bespoke JSON-Schema-to-TypeScript/Zod emitter with
these owning schemas. A live consumer audit found no external reader of the
private reducer JSON Schema file. Do not add an export or replacement generator
without a concrete consumer. Internal's old Kotlin reducer DTOs have no production
users; remove that dead boundary during adoption instead of creating a generator
to maintain it. If a future consumer needs JSON Schema, use z.toJSONSchema with
unrepresentable: throw and stable named references. Do not put
transforms/coercion/defaulting in wire schemas. Authored game refinements remain
executable runtime validation, not something JSON Schema export can replace.

Preserve independent host/worker bundle admission (exact ABI version and required
callables), envelope/input parsing, authenticated player validation, and game
table/phase/public/private/hidden/engine state parsing. The current meaningful
state parser lives in reducer/ingress/session-codec.ts. Deleting that directory
must not replace its real boundary checks with casts.

Delete contract-fingerprint.ts, StaleContractArtifactError and serialized
meta.contractFingerprint. Root and reviewer verified that this legacy shape hash
has no current external production consumer, deliberately misses refinement
changes, and is unrelated to host artifact identity. Internal workers load the
immutable source selected by the session's bundleSha256. Retain schema errors
and host artifact identity rather than maintaining custom SHA256 shape hashing.

## Browser and build closure

The only current SDK script consumer of testing-compiler is the old
scripts/ui-fixtures/compile-scenario.ts. Delete both at 006 rather than exporting
Node filesystem/esbuild from /testing. Internal's
PackedSdkCandidateCompatibilityTest.kt imports that old subpath; migrate that
test to replacement scenario/checkpoint proof during downstream adoption.

Update tsup noExternal/declaration resolution, scripts/package.ts declaration
rewrites, fixture package links and export snapshots as their owners move. Keep
the packed-artifact closure proof and both packed reference games. Final four
subpaths are root, react, reducer and testing (package.json metadata exempt).

Run focused model/schema/behavior/type tests and pnpm check at each branch tip.
Retain worker ABI/schema fixtures, private seat selection, serialized pending/RNG
round trips, both games, and browser-safe root/testing closure proof. Root owns
independent review, stack integration and public/internal adoption.

Before final synchronization, inspect the still-open manifest inference PR #25
(`1cfb15d`). Its board-template inference changes are superseded by template
removal, but its authored `cardType` override fix and removal of the phantom
`records.playerIds` helper remain relevant. Prefer receiving the upstream fix
through main; if it has not landed, explicitly account for those behaviors in
the final manifest review rather than blindly replaying the old template patch.

## Integrated model receipt

Plain records are integrated as `46bbc2d` in PR #34. Ownership, inline boards and
canonical schema authority follow in `3d62955`, `79c5d56` and `3b6d90e`.
The integrated schema source matches preparation `717213d`, whose full gate passed
710 SDK tests, all registry/script/format/type/build checks and both packed games.
003 pending/cancel shapes and inference now live in canonical Zod schemas; restore
still validates authored step identity and unfinished prefix length. No generator
or compatibility parser was retained. Logs: `/tmp/models-integrated-check.log` and
`/tmp/records-integrated-check.log`. Bundle composition and bound test authoring
remain open and are not claimed by this model receipt.

## Bound authoring receipt

The one-bundle layer is PR #36, with local and hosted checks passed. Legacy
unbound authoring and mutation callback aliases are removed in `4058e8b`, adapted
from reviewed preparation `66d2f34`. All full-game fixtures now use bound
`createGame`, phase and assembly APIs. Low-level unit tests import their private
owning constructors. Mutation callbacks expose the transaction; view callbacks
receive no mutation helpers. Runtime metadata remains available for its real
read-only consumers. Recursive JSON types derive from canonical `RuntimeJson`.

The integrated repository gate passed 724 SDK tests and both packed games;
root independently passed 72 runtime, event, committed-step, initialization and
export tests. Logs: `/tmp/bound-integrated-check.log` and
`/tmp/bound-integrated-root-proof.log`. Manifest inference fixes from still-open
PR #25 are reviewed separately; its obsolete template changes are not retained.

## Manifest correctness receipt

The relevant behavior from still-open upstream PR #25 is adapted in `130ce38`
without restoring removed board templates. Authored `cardType` overrides now
agree across runtime materialization, card literals, home-zone analysis, defaults
and inferred variant properties. The phantom `records.playerIds` API is absent
at runtime and in checked types; actual player records remain roster-owned.

Independent review found no remaining issue in the seven-file patch. Focused
compiler tests and both type projects passed in preparation. The combined gate
passed 725 SDK tests and both packed games (`/tmp/manifest-integrated-check.log`).
