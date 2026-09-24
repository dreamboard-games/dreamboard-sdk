> Historical measurement from the manifest migration. Rerun against the final
> candidate before comparing current generic API performance.

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

## Headless delivery baseline

The in-memory migration measured above already landed before this delivery.
The following measurements isolate the additional headless rewrite, after the
board and seat-view cuts and before committed steps and the instance/React cut.
Repeat them at final packaging. The historical geometry/type notes above describe
the earlier candidate; board IDs now use the branded query contract.

Measured on 2026-09-24 at SDK `a7b8500` with Node 24, repository pnpm 10.4.1,
TypeScript 5.9.3 and the built workspace SDK declarations. Each game used:

```sh
pnpm exec tsc --noEmit -p tsconfig.json --extendedDiagnostics
```

| Game                |  Types | Instantiations | Check time | Total time |    Memory |
| ------------------- | -----: | -------------: | ---------: | ---------: | --------: |
| Hearts              | 67,712 |        226,990 |     0.50 s |     0.86 s | 327,755 K |
| Hex Network Trading | 83,030 |        299,389 |     0.68 s |     1.00 s | 373,600 K |

These are single local runs, not a stable hardware benchmark. Instantiations
provide the less noisy comparison; investigate changes above the original
2x budget and repeat timing before drawing a conclusion from the 1.5x timing
budget. The final measurement must record its actual API/UI scope, since the
rewrite also removes old declarations and tests.

Logs: `/tmp/headless-pre-instance-hearts-types.log` and
`/tmp/headless-pre-instance-hex-types.log`.
