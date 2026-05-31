# @dreamboard-games/reducer-contract

Wire contract shared by Dreamboard reducer bundles and reducer runtimes.

This package is part of the fixed-version `@dreamboard-games/*` SDK release
train. The JSON Schema in `schema/` is authoritative; TypeScript and Kotlin
contract artifacts are generated from it.

Typical imports:

```ts
import type { ReducerSessionState } from "@dreamboard-games/reducer-contract/wire";
import type { ReducerBundleContract } from "@dreamboard-games/reducer-contract/bundle";
```

Use `@dreamboard-games/sdk` to inspect the coordinated package-set version.
