# @dreamboard-games/sdk 0.4.0-alpha.11 — canonical plugin runtime contract

This release makes `@dreamboard-games/sdk/plugin-runtime-contract` the public
authority for the browser-free plugin frame, protocol, schemas, and digests.
Consumers no longer import or copy the private
`@dreamboard-games/plugin-runtime-contract` workspace package.

## Breaking protocol changes

- The plugin protocol is version 4.
- `PluginGameplayFrame` exposes one fully materialized `view` and a required
  `basis` containing `generation`, `version`, `actionSetVersion`, and
  `perspectivePlayerId`. The boundary no longer exposes `sharedView`.
- `SubmitInteractionCommand` and `InteractionResult` use one
  `clientActionId`, the exact frame basis, and JSON-compatible params.
- Live `interaction.validate` messages were removed. Draft and reducer
  validation remain local authoring APIs.
- `GameOutcome` and its schema are exported from the same contract subpath.

Protocol-v3 hosts and plugins are intentionally incompatible with this release.
Upgrade the SDK embedded by the authoring CLI and the product host as one
reviewed release tuple.
