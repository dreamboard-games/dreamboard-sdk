# Type contracts and audit policy

The runtime uses concrete descriptor, table, state and target contracts. Game-specific public facades preserve authored identity, collector value, cardinality and board-layout relationships. Runtime code must not access a typed facade by widening it to `ReadModel<unknown>`, `FeatureContext<unknown>`, `CoreInstance<unknown>` or `TargetOptions<unknown>`.

## Hard cuts

- Inputs expose strict function-property setters and correlated `getDomain()`, `getTargetOptions()` and `getControl()` results. The registry renders the control descriptor, including many-number and many-resource editors. `getFieldProps()` and its scalar native-event conversion have been removed.
- `createBoard(data)` derives its identity from the data. Board spaces and drag routing operate on concrete runtime collections and target descriptors.
- A collector's `schema` describes parsed syntax. `CollectorValueOf<Collector>` describes the result of the complete validation pipeline, including target/domain membership. A string parser alone does not prove a card ID. `ParamsOf`, client commands, scenarios, headless inputs and `many()` preserve the validated value.
- `many()` removes scalar defaults and scalar default resolvers. It retains the original domain and routing metadata and lifts the validated value separately from the syntax schema.
- Sources and scenario execution require an assembled reducer definition. An object with only phase names and setup metadata is not a runnable game.
- Phase authoring preserves the discriminated union: simultaneous phases require actors, submit and resolve. Binding a state schema must not make those fields optional.

## What may remain

Assertions are not interchangeable with validation. Retained assertions must name a concrete invariant and live with its owner:

| Owner                                      | Invariant and proof                                                                                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Instance and feature factories             | The caller binds the source, game and feature callbacks once; public generic facades project the concrete runtime. Strict facade type tests and packed-consumer tests cover this binding.                                                                          |
| Reducer assembly and trusted runtime scope | The manifest, schemas, callbacks, table identities and phase registry come from the same contract. The runtime binds conditional types once instead of claiming that an arbitrary broad contract is a specific game.                                               |
| Ingress codecs                             | External input starts as `unknown` and is parsed with the owning schema. A JSON envelope validates JSON structure; it does not by itself prove an authored board layout or game identity.                                                                          |
| Manifest compiler and typed collections    | Runtime construction establishes literal keys and value relationships that JavaScript `Object.entries` / `Object.fromEntries` and TypeScript's conditional types cannot retain. Runtime topology tests and positive/negative type tests must cover reconstruction. |
| Target/domain collector factories          | Assembly supplies the matching state, player and query context. Membership validation finds a canonical candidate before invoking typed predicates. Syntax parsing alone cannot supply the validated-value witness.                                                |
| Replay facade                              | The runtime and view callback were bound to the same assembled game. Readonly public projections are reconstructed at this boundary.                                                                                                                               |
| Type computations                          | `unknown` may represent an unconstrained output, a distributive conditional or a heterogeneous value that must be narrowed before use. Type-only `any` used to infer callback parameters is distinct from runtime `any`.                                           |

Errors, raw JSON, schema input, opaque feature values and heterogeneous parameter enumeration legitimately use `unknown`. Do not replace it with `any`, `never`, a fake guard, an unchecked generic helper or a wider public facade to silence a diagnostic.

The reserved board projection has one strict, layout-discriminated wire schema.
It admits record identities, tile-cell identities and bounded coordinates;
the same schema owns its broad DTO types. The shared topology deriver owns
geometric consistency. Game-specific query and headless types refine the admitted
shape from compiled definitions and actual inventory types. `TableQueries<Table,
Definitions>` carries that dependency explicitly; runtime tables do not carry
phantom geometry fields for type inference.

## Verification and prevention

`pnpm check` builds declarations before typed consumer lint, type-checks all SDK runtime tests, fixtures, benchmarks and contract projects, runs the runtime tests, and compiles the public contract corpus against an installed SDK tarball. `pnpm ui test` verifies registry stories and both installed reference games. The runtime-test compiler resolves SDK facade imports to the same source modules so branded identities are not duplicated between source and declarations. The packed-consumer corpus separately compiles against installed package exports.

Typed ESLint covers authored SDK code, runtime tests, type tests, consumer tests, registry, templates, reference games and scripts. Unsafe `any` assignments, calls, members, arguments and returns are errors. Unnecessary assertions are errors. Deliberately invalid compile-only examples may have a rule-specific local exception with an explanation; their `@ts-expect-error` must remain in a compiler-checked project. They must not be converted to casts that make the example compile.

`pnpm type-audit` records every explicit assertion, non-null assertion, definite-assignment assertion, `unknown` and `any` in `build/type-audit/inventory.json`, with source location and syntax. This is a complete review inventory, not an allowed-count baseline. A lower count is not proof of correctness. Review new boundary entries for a real invariant, its owner and its test evidence.

Completion means the public negative examples remain rejected, the accepted values and keys stay precise, the named runtime erasure patterns are absent, every retained boundary has a defensible invariant, and all required gates pass. Moving a cast into a helper or weakening a test does not satisfy these conditions.
