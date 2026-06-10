/**
 * Compatibility shim. The interaction form implementation was split into
 * `./interaction-form/` (shell, input-slot factory, field renderers); this
 * module re-exports its full surface for importers of the old path.
 */
export * from "./interaction-form/index.js";
