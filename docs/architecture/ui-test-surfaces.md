# UI Test Surfaces

Status: accepted for Phase 00 of the UI Agent Iteration Workbench plan.

The SDK owns multiple UI verification surfaces. Each surface has one canonical
responsibility so Storybook, the future UI Workbench, reducer tests, and real
host parity do not become overlapping partial emulators.

| Concern                        | Canonical owner                             |
| ------------------------------ | ------------------------------------------- |
| Pure presentational states     | Storybook                                   |
| Runtime-generated UI scenarios | UI Workbench                                |
| Reducer correctness            | Game reducer scenario tests                 |
| Browser semantic resolution    | `@dreamboard-games/sdk/browser-interaction` |
| Packed package correctness     | Isolated consumer verifier                  |
| Production host parity         | Internal repository                         |

## Boundaries

Storybook remains the canonical surface for pure component states, controlled
props, local UI state, accessibility checks, and deterministic visual baselines.
It must not mount `PluginRuntime`, generated `UI.Root`, host transports, or
fixture replay code.

The UI Workbench is the canonical SDK-owned surface for runtime-generated UI
scenarios. It will mount the real runtime and generated adapters against
portable fixture bundles, but it must not compile source games during normal
component iteration.

Game reducer scenario tests remain the canonical source for reducer authority.
The Workbench may consume projected state and replay instructions, but it must
not contain hidden canonical reducer state or a second reducer assertion model.

`@dreamboard-games/sdk/browser-interaction` owns browser semantic resolution.
Agent protocols must resolve handles through SDK semantics rather than labels,
text, roles, DOM position, or ad hoc selectors.

The isolated consumer verifier owns packed package correctness. Consumer
fixtures must install the packed SDK artifact and must not import SDK source
paths or workspace-only aliases.

The internal repository owns production host parity. It consumes immutable SDK
reference-game and fixture exports pinned by commit and digest rather than
maintaining divergent editable copies.

## Explicit Rejections

- Do not mock copies of `PluginRuntime` inside individual stories.
- Do not use text, label, role, or DOM-position selectors as the agent
  protocol.
- Do not put hidden canonical reducer state in fixture files.
- Do not use source-only SDK imports from consumer fixtures.
- Do not build a second replay language in the Workbench.
