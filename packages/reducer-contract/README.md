# Reducer Bundle ABI Workspace

TypeScript wire contract used by Dreamboard reducer bundles and the SDK-owned
reducer bundle ABI.

This private workspace package feeds generated TypeScript artifacts into
`@dreamboard-games/sdk`. It is not published. The JSON Schema in `schema/` is
authoritative and intentionally models only the reducer bundle ABI, not
backend worker or authority transport requests.

Internal workspace imports:

```ts
import type { ReducerSessionState } from "@dreamboard-games/reducer-contract/wire";
import type { ReducerBundleContract } from "@dreamboard-games/reducer-contract/bundle";
```

Public consumers should import the supported SDK facade instead:

```ts
import type { ReducerWire } from "@dreamboard-games/sdk/infrastructure/reducer-bundle-abi";
```
