/**
 * Compatibility shim. The card drag surface implementation moved to
 * `./card-drag/` (types, drop-target registry, overlays, drop-target view
 * and the drag-lifecycle surface). Import from `./card-drag/index.js`
 * directly in new code; this file exists so historical import paths keep
 * working.
 */
export * from "./card-drag/index.js";
