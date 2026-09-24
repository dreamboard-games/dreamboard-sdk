# Sources

<!-- api: root iframeSource -->
<!-- api: root hostSource -->
<!-- api: root staticSource -->
<!-- api: root SourceState -->
<!-- api: root SourceSnapshot -->
<!-- api: root SubmitResult -->
<!-- api: testing localSource -->
<!-- api: testing scenarioSource -->
<!-- api: testing createTestSource -->
<!-- api: testing LocalCheckpoint -->

| Entry   | Source                                                              | Purpose                                      |
| ------- | ------------------------------------------------------------------- | -------------------------------------------- |
| root    | `iframeSource({ timeoutMs? })`                                      | Parent-window host channel                   |
| root    | `hostSource({ url, session, playerId, getCredential, timeoutMs? })` | Canonical websocket host                     |
| root    | `staticSource(snapshot)`                                            | Validated read-only selected-seat frame      |
| testing | `localSource(definition, options)`                                  | Local authoritative reducer                  |
| testing | `scenarioSource(definition, scenario, { at, as })`                  | Named scenario checkpoint                    |
| testing | `createTestSource(snapshot)`                                        | Deterministic request/frame ordering fixture |

`SourceState` contains `snapshot`, `connection`, `request`. A snapshot contains
`me`, `players`, basis-free `frame`, and `version`. Sources expose a subscribable
store and dispose. Command sources provide submit/cancel; their transport details
remain private. `SubmitResult` discriminates accepted from rejection; exceptions
are not the only failure path.

Local sources expose `switchSeat(playerId)`, `checkpoint`, `restore(unknown)`,
`inspect`, `explore({ maxEvaluations })`, and typed `apply(command)`. Checkpoints
contain hidden authoritative state and are strictly local developer data. Restore
validates before mutation and publishes a fresh revision. A provider or instance
owns its source: do not share one source between independently owned instances.
