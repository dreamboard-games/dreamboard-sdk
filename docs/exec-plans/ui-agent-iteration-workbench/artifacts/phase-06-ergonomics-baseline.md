# Phase 06 Ergonomics Baseline

Date: 2026-06-17.

Status: captured.

## Scope

Surveyed authored reference-game source under `examples/reference-games`,
compiled fixture modules under `fixtures/ui/reference-games/modules`, and SDK
authoring surfaces touched by Phase 06.

## Counts

| Pattern                                                                     |                          Count | Source locations                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | -----------------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Manual `UI.Root` + `Game.Root` + `Phase.Switch` reference nests             |               0 complete nests | Authored source uses no generated `UI.Root`/`Phase.Switch`; shared lower-level root used `Game.Root` in `examples/reference-games/shared/reference-ui.mjs`.                                                                       |
| Separately assembled `Interaction.Routes` plus panels                       |                              0 | Reference source renders one direct `Interaction.Root` + `Interaction.Submit` path through the shared helper.                                                                                                                     |
| `useMobileHandTrayActive` in reference source                               |                              0 | No authored reference-game calls.                                                                                                                                                                                                 |
| Hard-coded mobile hand padding in reference source                          |                              0 | SDK mobile tray owned padding before Phase 06; no reference-game padding was present.                                                                                                                                             |
| `renderSummary` / `renderActions` in reference source                       |                              0 | Deprecated generated callback API remained in SDK tests/types before Phase 06.                                                                                                                                                    |
| Local reference-game `ActionPanel` / panel components                       |                              0 | No local panel wrappers in reference source.                                                                                                                                                                                      |
| Manual `Interaction.Dialog` plus visual dialog wrappers in reference source |                              0 | Generated form `Dialog` previously forwarded only to `Interaction.Dialog`; reference source had no local wrappers.                                                                                                                |
| Simultaneous drafting custom mobile hand bypass                             | 1 documented scenario boundary | `simultaneous-card-drafting` advertises `compact-mobile-hand`; current portable fixtures still contain no authored hand zone payload, so Phase 06 records this as a fixture-source limitation rather than a removable UI wrapper. |

## Implementation Implication

The public reference-game source in this repository is intentionally minimal
and shared through `examples/reference-games/shared/reference-ui.mjs`. Phase 06
therefore cut the SDK and generated-contract APIs over first, migrated the
shared root to `Game.Viewport`, and added hard-cut guards that apply to the
authored reference source and compiled reference fixture modules.

Per-game UI wrapper deletions from the phase plan are not present in this
repository snapshot; they remain real-host parity concerns for Phase 07 if the
owning internal host still carries richer authored UI wrappers.
