import { WORKSPACE_CODEGEN_OWNERSHIP } from "@dreamboard-games/workspace-codegen";

import {
  CANONICAL_REFERENCE_GAME_IDS,
  classifyReferenceGameSourcePath as classifyPath,
  createReferenceGameSourceInventoryPolicy,
  referenceGamePathIdentity,
  shouldDescendIntoReferenceGameDirectory as shouldDescend,
  type ReferenceGameSourcePathClass,
} from "./source-inventory-policy-core.mjs";

export const REFERENCE_GAME_SOURCE_INVENTORY_POLICY =
  createReferenceGameSourceInventoryPolicy(WORKSPACE_CODEGEN_OWNERSHIP);

export {
  CANONICAL_REFERENCE_GAME_IDS,
  referenceGamePathIdentity,
  type ReferenceGameSourcePathClass,
};

export function classifyReferenceGameSourcePath(
  repositoryPath: string,
): ReferenceGameSourcePathClass {
  return classifyPath(repositoryPath, REFERENCE_GAME_SOURCE_INVENTORY_POLICY);
}

export function isReferenceGameSourceObject(repositoryPath: string): boolean {
  return classifyReferenceGameSourcePath(repositoryPath) === "included";
}

export function shouldDescendIntoReferenceGameDirectory(
  repositoryPath: string,
): boolean {
  return shouldDescend(repositoryPath, REFERENCE_GAME_SOURCE_INVENTORY_POLICY);
}
