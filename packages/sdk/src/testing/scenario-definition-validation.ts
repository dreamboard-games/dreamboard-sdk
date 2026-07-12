import { z } from "zod";
import { createClientParamSchemasByPhase } from "../reducer/client-param-schemas.js";
import {
  appendScenarioPath,
  resolveScenarioSeatReferences,
} from "./scenario-schema.js";
import { ScenarioSchemaValueError } from "./scenario-schema.js";

export type ScenarioDefinitionValidationCode =
  | "INVALID_TYPE"
  | "UNKNOWN_FIELD"
  | "INVALID_VALUE"
  | "UNSAFE_INTEGER"
  | "OUT_OF_RANGE"
  | "UNKNOWN_SETUP_PROFILE"
  | "UNKNOWN_INTERACTION"
  | "INVALID_COMMAND_PARAMS"
  | "NON_SERIALIZABLE"
  | "NORMAL_SETUP_UNAVAILABLE";

export class ScenarioDefinitionValidationError extends Error {
  readonly code: ScenarioDefinitionValidationCode;
  readonly path: string;

  constructor(options: {
    readonly code: ScenarioDefinitionValidationCode;
    readonly path: string;
    readonly reason: string;
  }) {
    super(
      `Invalid scenario definition at '${options.path}': ${options.reason}.`,
    );
    this.name = "ScenarioDefinitionValidationError";
    this.code = options.code;
    this.path = options.path;
  }
}

type NormalSetupLike = {
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly createInitialTable: (options: {
    readonly playerIds: readonly string[];
  }) => unknown;
};

export type ScenarioDefinitionGameLike = {
  readonly contract: {
    readonly manifest: {
      readonly normalSetup?: NormalSetupLike;
      readonly literals: { readonly playerIds: readonly string[] };
      readonly setupProfilesById: Readonly<Record<string, unknown>>;
    };
  };
  readonly phases: Readonly<Record<string, unknown>>;
};

type ScenarioDefinitionLike = {
  readonly id: string;
  readonly description?: string;
  readonly setup: {
    readonly players: number;
    readonly seed: number;
    readonly setupProfileId?: string | null;
  };
  readonly given: readonly unknown[];
  readonly when: readonly unknown[];
  readonly then: (...args: never[]) => unknown;
};

function fail(options: {
  readonly code: ScenarioDefinitionValidationCode;
  readonly path: string;
  readonly reason: string;
}): never {
  throw new ScenarioDefinitionValidationError(options);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (!isPlainObject(value)) {
    fail({ code: "INVALID_TYPE", path, reason: "expected a plain object" });
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      fail({
        code: "UNKNOWN_FIELD",
        path: appendScenarioPath(path, key),
        reason: "field is not part of the scenario contract",
      });
    }
  }
}

function assertOwn(
  value: Record<string, unknown>,
  key: string,
  path: string,
): void {
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    fail({
      code: "INVALID_TYPE",
      path: appendScenarioPath(path, key),
      reason: "required field is missing",
    });
  }
}

function assertSafeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    fail({
      code: "UNSAFE_INTEGER",
      path,
      reason: "expected a finite safe integer",
    });
  }
  return value;
}

function assertJsonSerializable(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail({
        code: "NON_SERIALIZABLE",
        path,
        reason: "non-finite numbers are not JSON-serializable",
      });
    }
    return;
  }
  if (typeof value !== "object") {
    fail({
      code: "NON_SERIALIZABLE",
      path,
      reason: `${typeof value} values are not JSON-serializable`,
    });
  }
  if (ancestors.has(value)) {
    fail({
      code: "NON_SERIALIZABLE",
      path,
      reason: "cyclic values are not JSON-serializable",
    });
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    fail({
      code: "NON_SERIALIZABLE",
      path,
      reason: "class instances are not JSON-serializable scenario data",
    });
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        fail({
          code: "NON_SERIALIZABLE",
          path: appendScenarioPath(path, index),
          reason: "sparse array entries are not allowed",
        });
      }
      assertJsonSerializable(
        value[index],
        appendScenarioPath(path, index),
        ancestors,
      );
    }
    const extraKeys = Reflect.ownKeys(value).filter((key) => {
      if (key === "length") return false;
      return typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key);
    });
    if (extraKeys.length > 0) {
      const key = extraKeys[0] as PropertyKey;
      fail({
        code: "NON_SERIALIZABLE",
        path: appendScenarioPath(path, key),
        reason: "array metadata is not JSON-serializable",
      });
    }
    ancestors.delete(value);
    return;
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      fail({
        code: "NON_SERIALIZABLE",
        path: appendScenarioPath(path, key),
        reason: "symbol keys are not JSON-serializable",
      });
    }
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      fail({
        code: "NON_SERIALIZABLE",
        path: appendScenarioPath(path, key),
        reason: "only enumerable data properties are allowed",
      });
    }
    assertJsonSerializable(
      descriptor.value,
      appendScenarioPath(path, key),
      ancestors,
    );
  }
  ancestors.delete(value);
}

function playerIdsForDefinition(
  game: ScenarioDefinitionGameLike,
  players: number,
): readonly string[] {
  const declared = game.contract.manifest.literals.playerIds;
  return Array.from(
    { length: players },
    (_, index) => declared[index] ?? `player-${index + 1}`,
  );
}

function commandSchemas(
  game: ScenarioDefinitionGameLike,
  interactionId: string,
): readonly z.ZodTypeAny[] {
  const schemasByPhase = createClientParamSchemasByPhase(
    game as Parameters<typeof createClientParamSchemasByPhase>[0],
  );
  return Object.values(schemasByPhase).flatMap((schemas) => {
    const schema = schemas[interactionId];
    return schema ? [schema as z.ZodTypeAny] : [];
  });
}

function issuePath(
  path: string,
  issue: { readonly path: PropertyKey[] },
): string {
  return issue.path.reduce(appendScenarioPath, path);
}

function validateCommand(options: {
  readonly game: ScenarioDefinitionGameLike;
  readonly command: unknown;
  readonly path: string;
  readonly playerIds: readonly string[];
}): void {
  const command = requireObject(options.command, options.path);
  assertJsonSerializable(command, options.path);
  assertExactKeys(command, ["actor", "interactionId", "params"], options.path);
  for (const field of ["actor", "interactionId", "params"] as const) {
    assertOwn(command, field, options.path);
  }

  const actorPath = appendScenarioPath(options.path, "actor");
  const actor = requireObject(command.actor, actorPath);
  assertExactKeys(actor, ["seat"], actorPath);
  assertOwn(actor, "seat", actorPath);
  const actorSeat = assertSafeInteger(
    actor.seat,
    appendScenarioPath(actorPath, "seat"),
  );
  if (actorSeat < 0 || actorSeat >= options.playerIds.length) {
    fail({
      code: "OUT_OF_RANGE",
      path: appendScenarioPath(actorPath, "seat"),
      reason: `expected a seat from 0 through ${Math.max(0, options.playerIds.length - 1)}`,
    });
  }

  const interactionPath = appendScenarioPath(options.path, "interactionId");
  if (
    typeof command.interactionId !== "string" ||
    command.interactionId === ""
  ) {
    fail({
      code: "INVALID_TYPE",
      path: interactionPath,
      reason: "expected a non-empty string",
    });
  }

  const paramsPath = appendScenarioPath(options.path, "params");
  const schemas = commandSchemas(options.game, command.interactionId);
  if (schemas.length === 0) {
    fail({
      code: "UNKNOWN_INTERACTION",
      path: interactionPath,
      reason: `interaction '${command.interactionId}' is not declared by the game`,
    });
  }

  let firstSeatError: ScenarioSchemaValueError | undefined;
  let firstIssue:
    | { readonly path: PropertyKey[]; readonly message: string }
    | undefined;
  for (const schema of schemas) {
    try {
      const resolved = resolveScenarioSeatReferences({
        schema,
        value: command.params,
        playerIds: options.playerIds,
        path: paramsPath,
      });
      const parsed = schema.safeParse(resolved);
      if (parsed.success) return;
      firstIssue ??= parsed.error.issues[0];
    } catch (error) {
      if (error instanceof ScenarioSchemaValueError) {
        firstSeatError ??= error;
        continue;
      }
      throw error;
    }
  }

  if (firstSeatError) {
    fail({
      code: firstSeatError.message.includes("seat from")
        ? "OUT_OF_RANGE"
        : "INVALID_COMMAND_PARAMS",
      path: firstSeatError.path,
      reason: firstSeatError.message,
    });
  }
  fail({
    code: "INVALID_COMMAND_PARAMS",
    path: firstIssue ? issuePath(paramsPath, firstIssue) : paramsPath,
    reason:
      firstIssue?.message ?? "parameters do not match the interaction contract",
  });
}

export function validateScenarioDefinition(
  game: ScenarioDefinitionGameLike,
  value: unknown,
): asserts value is ScenarioDefinitionLike {
  const definition = requireObject(value, "scenario");
  assertExactKeys(
    definition,
    ["id", "description", "setup", "given", "when", "then"],
    "scenario",
  );
  for (const field of ["id", "setup", "given", "when", "then"] as const) {
    assertOwn(definition, field, "scenario");
  }
  if (typeof definition.id !== "string" || definition.id === "") {
    fail({
      code: "INVALID_TYPE",
      path: "scenario.id",
      reason: "expected a non-empty string",
    });
  }
  if (
    Object.prototype.hasOwnProperty.call(definition, "description") &&
    typeof definition.description !== "string"
  ) {
    fail({
      code: "INVALID_TYPE",
      path: "scenario.description",
      reason: "expected a string when provided",
    });
  }

  const setup = requireObject(definition.setup, "scenario.setup");
  assertExactKeys(
    setup,
    ["players", "seed", "setupProfileId"],
    "scenario.setup",
  );
  assertOwn(setup, "players", "scenario.setup");
  assertOwn(setup, "seed", "scenario.setup");
  const players = assertSafeInteger(setup.players, "scenario.setup.players");
  const normalSetup = game.contract.manifest.normalSetup;
  if (
    normalSetup === undefined ||
    !Number.isSafeInteger(normalSetup.minPlayers) ||
    !Number.isSafeInteger(normalSetup.maxPlayers) ||
    normalSetup.minPlayers <= 0 ||
    normalSetup.maxPlayers < normalSetup.minPlayers
  ) {
    fail({
      code: "NORMAL_SETUP_UNAVAILABLE",
      path: "scenario.setup.players",
      reason: "the game manifest does not provide valid normal setup bounds",
    });
  }
  if (players < normalSetup.minPlayers || players > normalSetup.maxPlayers) {
    fail({
      code: "OUT_OF_RANGE",
      path: "scenario.setup.players",
      reason: `expected ${normalSetup.minPlayers} through ${normalSetup.maxPlayers} players`,
    });
  }
  assertSafeInteger(setup.seed, "scenario.setup.seed");

  if (Object.prototype.hasOwnProperty.call(setup, "setupProfileId")) {
    if (
      setup.setupProfileId !== null &&
      typeof setup.setupProfileId !== "string"
    ) {
      fail({
        code: "INVALID_TYPE",
        path: "scenario.setup.setupProfileId",
        reason: "expected a declared setup profile id or null",
      });
    }
    if (
      typeof setup.setupProfileId === "string" &&
      !Object.prototype.hasOwnProperty.call(
        game.contract.manifest.setupProfilesById,
        setup.setupProfileId,
      )
    ) {
      fail({
        code: "UNKNOWN_SETUP_PROFILE",
        path: "scenario.setup.setupProfileId",
        reason: `setup profile '${setup.setupProfileId}' is not declared by the manifest`,
      });
    }
  }

  assertJsonSerializable(definition.id, "scenario.id");
  if (Object.prototype.hasOwnProperty.call(definition, "description")) {
    assertJsonSerializable(definition.description, "scenario.description");
  }
  assertJsonSerializable(setup, "scenario.setup");
  if (!Array.isArray(definition.given)) {
    fail({
      code: "INVALID_TYPE",
      path: "scenario.given",
      reason: "expected an array",
    });
  }
  if (!Array.isArray(definition.when)) {
    fail({
      code: "INVALID_TYPE",
      path: "scenario.when",
      reason: "expected an array",
    });
  }
  if (typeof definition.then !== "function") {
    fail({
      code: "INVALID_TYPE",
      path: "scenario.then",
      reason: "expected an assertion function",
    });
  }

  const playerIds = playerIdsForDefinition(game, players);
  definition.given.forEach((command, index) =>
    validateCommand({
      game,
      command,
      path: `scenario.given[${index}]`,
      playerIds,
    }),
  );
  definition.when.forEach((command, index) =>
    validateCommand({
      game,
      command,
      path: `scenario.when[${index}]`,
      playerIds,
    }),
  );
}
