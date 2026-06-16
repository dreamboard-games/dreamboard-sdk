# @dreamboard-games/sdk

The public Dreamboard SDK package. This repository publishes one consumer
package, `@dreamboard-games/sdk`; public capabilities are exposed through the
package export map rather than separate installable workspace packages.

Internal workspaces such as `sdk-types`, `workspace-codegen`, and
`reducer-contract` are implementation inputs. Consumers should not install or
import those package names directly.

Typical imports:

```ts
import {
  DREAMBOARD_SDK_PACKAGE_SET,
  DREAMBOARD_SDK_VERSION,
} from "@dreamboard-games/sdk";
import type { ReducerWire } from "@dreamboard-games/sdk/reducer-contract";
```
