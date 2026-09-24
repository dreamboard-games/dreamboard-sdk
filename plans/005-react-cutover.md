# React adapter and reference UI cutover

Status: follows the reviewed headless instance and source contracts.

Read the accepted constraints in 004-instance-review-notes.md. Bind React to the
typed instance through a thin maintained TanStack Store adapter. Provide the
typed hook factory, provider and Subscribe surface without importing executable
game definitions. Preserve feature-specific APIs and inferred input values in
the hook result. Methods observe current options; source replacement disposes
the old lifetime. Prove selector render isolation and controlled draft updates.
Do not wrap external-store writes in startTransition and promise animation.

Migrate both Hearts and Hex hosted UIs to type-only game imports and the instance
getters, handlers and props. Keep reducer execution in local dev/scenario sources
and separate that entry from installed hosted UI. Use the reviewed pure registry
source components, then add the minimum bound items in layer 006. No temporary
compatibility runtime exports: delete the old SDK React contexts, hooks, controls
and styled component public surface after callers move. If a temporary internal
tool caller remains, migrate it in the same cut or split the cut before deletion.

Independent inputs submit together; Hex bandit selection submits one committed
step at a time. Show saved selections separately from the unfinished local draft.
Keep cancel available for saved progress and reset for drafts. User actions must
exercise instance handlers, with native keyboard behavior and meaningful disabled
state. Preserve card target ambiguity and existing gameplay interactions.

Verification: checked React API and feature inference, selector render isolation,
controlled edits while a request is pending, source replacement/unmount cleanup,
both complete reference-game tests, and packed UI import closure proving no game
reducer or Node code reaches the hosted UI. Run pnpm check, then meaningful
desktop/keyboard/touch/accessibility browser proof with the registry cutover.
