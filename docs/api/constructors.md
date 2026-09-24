# Constructors

<!-- api: root createGameInstance -->
<!-- api: react createGameHook -->
<!-- api: reducer createGame -->
<!-- api: reducer compileManifest -->
<!-- api: reducer createReducerBundle -->
<!-- api: reducer memoize -->

| Entry   | Constructor                                                    | Result                                                           |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| root    | `createGameInstance<Game>()({ source, features, ...options })` | Stable typed instance                                            |
| react   | `createGameHook<Game>()({ features, ...defaults })`            | `GameProvider`, `useGame`, `Subscribe`                           |
| reducer | `createGame(model)`                                            | Bound authoring model                                            |
| reducer | `compileManifest(manifest)`                                    | In-memory manifest contract                                      |
| reducer | `createReducerBundle(definition)`                              | Authoritative initialize/dispatch/project/boardStatic operations |
| reducer | `memoize(fn)`                                                  | WeakMap identity cache for one object argument                   |

The React provider requires its own source prop and owns source disposal. Its
instance is created after commit; children wait until it exists. `useGame()` gives
the stable instance; `useGame(selector, { compare })` subscribes to immutable
snapshots through TanStack React Store. Select a primitive or stable object branch;
returning fresh objects needs an appropriate comparison. No executable game value
is required by the UI constructors.
