# @dreamboard-games/sdk 0.4.0-alpha.0 - transaction commit model

This alpha changes reducer transaction state identity. The reducer still clones
the input table before edits, so reducers do not mutate the state passed into
`edit(state)`. Direct `tx.*` methods now mutate one transaction-owned draft
instead of cloning a fresh table for every op.

| Old usage                                                                                                          | New usage                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `const s1 = tx.spendResources(...); const s2 = tx.moveComponentToEdge(...);` produced independent state snapshots. | `s1`, `s2`, and `tx.state` are the same draft object for direct `tx.*` calls.                                   |
| Retaining an intermediate `tx.*` return value implicitly retained that moment in time.                             | If an intermediate snapshot is needed, copy it explicitly, for example `const s1 = structuredClone(tx.state);`. |
| `tx.apply(op)` adopted the state returned by the pure op.                                                          | Unchanged. `tx.apply(op)` remains the pure-op escape hatch for `pipe()`/`Op<State>` composition.                |

Generated scaffolds and examples use the supported pattern:

```ts
const tx = edit(state);
tx.spendResources({ playerId, amounts: COST });
tx.moveComponentToEdge({ componentId, boardId, edgeId });
return accept(tx.state);
```

This pattern continues to work, with fewer table clones and lazy query rebuilds.
