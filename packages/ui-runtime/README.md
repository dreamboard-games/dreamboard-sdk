# @dreamboard-games/ui-runtime

Dreamboard-aware React runtime adapters for generated UI contracts.

This package is part of the fixed-version `@dreamboard-games/*` SDK release
train. It owns runtime providers, generated contract composition helpers,
interaction descriptors, drafts, validation, and submission adapter behavior.

Most authored game UI should import generated workspace bindings instead of
importing this package directly.

Typical generated-runtime imports:

```ts
import { createDreamboardUI } from "@dreamboard-games/ui-runtime";
import { createWorkspaceUIContract } from "@dreamboard-games/ui-runtime/workspace-contract";
```

Use `@dreamboard-games/sdk` to inspect the coordinated package-set version.
