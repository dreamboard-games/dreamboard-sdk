/** Trusted Node-only reference-game source admission helpers. */
export {
  CANONICAL_REFERENCE_GAME_IDS,
  REFERENCE_GAME_SOURCE_INVENTORY_POLICY,
  classifyReferenceGameSourcePath,
  collectReferenceGameSourceManifest,
  collectReferenceGameSourceObjects,
  isReferenceGameSourceObject,
  referenceGamePathIdentity,
  shouldDescendIntoReferenceGameDirectory,
  type ReferenceGameSourcePathClass,
} from "./reference-games/source-collector.js";
