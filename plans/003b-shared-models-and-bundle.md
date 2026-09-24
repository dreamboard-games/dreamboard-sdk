# Shared models and one validated bundle

Status: scoped after steps; board geometry is prepared independently.

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
these owning schemas. Derive downstream JSON Schema via z.toJSONSchema with
unrepresentable: throw and stable named references. A small build serializer is
enough; do not retain two authored schema authorities. Check the actual Kotlin
generator's accepted dialect rather than assuming all dialects work. Do not put
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
