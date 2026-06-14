# Reducer Import Audit

Date: 2026-06-14

Scope: private monorepo examples in `/Users/mac/code/dreamboard/examples`.

Command:

```bash
grep -rhoE 'import (type )?\{[^}]*\} from "@dreamboard-games/sdk/reducer"' \
  /Users/mac/code/dreamboard/examples --include='*.ts' --include='*.tsx' \
  | tr ',' '\n' | sed 's/import.*{//; s/}.*//; s/type //; s/ //g' \
  | sort | uniq -c | sort -rn
```

Observed named imports:

```txt
  24 createReducerBundle
  22 definePhase
  15 PhaseMapOf
  12 defineGame
   8 createContractAuthoring
   8 createClientParamSchemasByPhase
   7 defineGameContract
   7 defineDerived
   7 GameStateOf
   6 defineView
   5 defineCardAction
   3 defineStaticView
   3 defineEffect
   3 createTableQueries
   3 createReducerEdit
   2 asPlayerId
   2 ValidationIssue
   1 formInput
   1 defineStepPhase
   1 defineInteractionRule
   1 defineInteraction
   1 defineInputs
   1 boardTarget
   1 InputFieldRef
```

Partition:

- Authored imports kept on `@dreamboard-games/sdk/reducer`: authoring
  factories, `createReducerBundle`, `createReducerEdit`, `createTableQueries`,
  `asPlayerId`, `PhaseMapOf`, `GameStateOf`, `ValidationIssue`,
  `InputFieldRef`, `boardTarget`, and `formInput`.
- Generated-only import moved to `@dreamboard-games/sdk/reducer/advanced`:
  `createClientParamSchemasByPhase`.
- Generated manifest/runtime/UI contract imports for extraction families,
  runtime structural types, setup bootstrap helpers, and manifest schema
  plumbing are emitted from `@dreamboard-games/sdk/reducer/advanced`.
