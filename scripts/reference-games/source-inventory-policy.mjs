import { WORKSPACE_CODEGEN_OWNERSHIP } from "../../packages/workspace-codegen/src/ownership.ts";
import {
  CANONICAL_REFERENCE_GAME_IDS,
  classifyReferenceGameSourcePath as classifyPath,
  createReferenceGameSourceInventoryPolicy,
  referenceGamePathIdentity,
  shouldDescendIntoReferenceGameDirectory as shouldDescend,
} from "../../packages/sdk/src/reference-games/source-inventory-policy-core.mjs";

export const REFERENCE_GAME_SOURCE_INVENTORY_POLICY =
  createReferenceGameSourceInventoryPolicy(WORKSPACE_CODEGEN_OWNERSHIP);

export { CANONICAL_REFERENCE_GAME_IDS, referenceGamePathIdentity };

export function classifyReferenceGameSourcePath(repositoryPath) {
  return classifyPath(repositoryPath, REFERENCE_GAME_SOURCE_INVENTORY_POLICY);
}

export function isReferenceGameSourceObject(repositoryPath) {
  return classifyReferenceGameSourcePath(repositoryPath) === "included";
}

export function shouldDescendIntoReferenceGameDirectory(repositoryPath) {
  return shouldDescend(repositoryPath, REFERENCE_GAME_SOURCE_INVENTORY_POLICY);
}
