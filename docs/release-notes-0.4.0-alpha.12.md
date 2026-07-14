# @dreamboard-games/sdk 0.4.0-alpha.12 — thin generated UI contracts

This release moves reusable generated UI-contract types and runtime behavior
into `@dreamboard-games/sdk/runtime/workspace-contract`. Workspace codegen now
emits a small game-specific specialization instead of copying the generic UI
contract into every project.

## Authoring changes

- Generated `shared/generated/ui-contract.ts` files retain their authored
  exports while staying below 250 nonblank lines.
- `createGameUiContract` computes client parameter schemas once and owns the
  generic board, form, hand, pile, card-collection, and interaction surfaces.
- Board topology and interaction collector types retain manifest-specific
  literal precision through packed SDK consumers.
- Workspace codegen ownership advances to version 32.

Regenerate workspaces with the coordinated authoring release tuple. Generated
UI contracts from the previous ownership version are intentionally replaced;
they are disposable build inputs rather than authored source.
