# In-memory manifest type checking

Measured on Node 24.18.0 and TypeScript 5.9.3 for the SDK 0.5.0-alpha.2 candidate.
The generated baseline uses Hearts and Hex source from commit `666b15d`, with
its generated manifest/UI contracts. Both baseline and migrated games resolve
the same candidate SDK declarations and use the same root TypeScript options.
No diagnostics were reported by any of the four compilations.

| Fixture             | Generated instantiations | In-memory instantiations | Ratio | Generated check | In-memory check | Ratio |
| ------------------- | -----------------------: | -----------------------: | ----: | --------------: | --------------: | ----: |
| Hearts              |                  397,792 |                  318,809 |  0.80 |           0.72s |           0.59s |  0.82 |
| Hex network trading |                  461,465 |                  374,475 |  0.81 |           0.86s |           0.74s |  0.86 |

These satisfy the design limits of 2x instantiations and 1.5x check time.
Wall time varies with machine load; instantiation counts are the more stable
comparison. Each command was run sequentially after the SDK build completed.

```sh
pnpm exec tsc --noEmit -p <fixture>/tsconfig.json --extendedDiagnostics
```

For the baseline, extract the two reference-game directories from `666b15d`
into an ignored scratch directory and materialize their contracts with that
revision's workspace generator. Resolve dependencies to the candidate SDK,
copy the migrated game tsconfig and root tsconfig.base.json, and run the command
above. Run the same command against the ordinary source reference games for
the in-memory results. Generated baseline files are measurement inputs only;
they are not checked in or required for normal authoring.

Compile-only SDK fixtures additionally cover omitted counts, preset deck
properties and IDs, invalid IDs, templated hex spaces, and large piece counts.
Literal count expansion is bounded at 64; larger counts use a numeric template
literal ID instead of unbounded recursive tuple construction.

Authored IDs and schema fields retain literal inference. Computed geometry
edge and vertex IDs remain strings in TypeScript where they cannot be derived
statically; the compiled runtime schemas validate them against the actual
materialized topology. This is an intentional precision boundary, not equivalent
static narrowing for every literal formerly emitted by code generation.
