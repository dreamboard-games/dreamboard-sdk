import { createHash } from "node:crypto";
import {
  lstat,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { compareReferenceGameCanonicalStrings } from "../reference-games/canonical.js";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import type {
  ScenarioCheckpoint,
  ScenarioCheckpointSelector,
  ScenarioReplayDefinition,
} from "./definitions.js";
import type { ScenarioDefinitionGameLike } from "./scenario-definition-validation.js";

export type CompiledScenarioReplay<
  Game extends ScenarioDefinitionGameLike = ScenarioDefinitionGameLike,
> = {
  readonly schemaVersion: 1;
  readonly scenario: {
    readonly path: string;
    /** Covers the local game/scenario module graph, including assertions. */
    readonly sourceDigest: `sha256:${string}`;
  };
  /** Canonical serializable scenario projection; never contains `then`. */
  readonly definition: ScenarioReplayDefinition<Game>;
  readonly checkpoint: ScenarioCheckpoint;
  readonly expected: {
    readonly checkpointDigest: `sha256:${string}`;
    readonly publicProjectionDigest: `sha256:${string}`;
  };
};

export type CompileScenarioReplayOptions = {
  readonly scenarioPath: string;
  readonly at?: ScenarioCheckpointSelector;
};

type SyntheticCompileResult = Omit<
  CompiledScenarioReplay,
  "schemaVersion" | "scenario"
>;

type SyntheticCompileModule = {
  readonly compile: (options: {
    readonly at?: ScenarioCheckpointSelector;
    readonly scenarioPath: string;
    readonly sourceDigest: `sha256:${string}`;
  }) => Promise<SyntheticCompileResult>;
};

type ScenarioSource = {
  readonly projectRoot: string;
  readonly scenarioPath: string;
  readonly relativeScenarioPath: string;
  readonly gamePath: string;
};

const scenarioSourceDigestVersion = "dreamboard-scenario-source-closure@1";
const syntheticSourceFile = "__dreamboard_compile_scenario_replay__.ts";

/**
 * Compile one authored scenario into the trusted, serializable replay DTO used
 * by dev-host, Workbench, demo, and performance adapters.
 *
 * The DTO may contain sealed/private command parameters. It must never cross a
 * player, spectator, browser, ordinary-log, or public-receipt boundary.
 */
export async function compileScenarioReplay(
  options: CompileScenarioReplayOptions,
): Promise<CompiledScenarioReplay> {
  const source = await resolveScenarioSource(options.scenarioPath);
  const syntheticSource = buildSyntheticSource(source);
  const [
    reducerEntry,
    reducerAdvancedEntry,
    testingEntry,
    testingRuntimeEntry,
    typesEntry,
  ] = await Promise.all([
    resolveCurrentSdkFacade("reducer"),
    resolveCurrentSdkFacade("reducer/advanced"),
    resolveCurrentSdkFacade("testing"),
    resolveCurrentSdkFacade("testing-runtime"),
    resolveCurrentSdkFacade("types"),
  ]);
  const bundled = await build({
    absWorkingDir: source.projectRoot,
    stdin: {
      contents: syntheticSource,
      loader: "ts",
      resolveDir: source.projectRoot,
      sourcefile: syntheticSourceFile,
    },
    bundle: true,
    alias: {
      "@dreamboard-games/sdk/reducer": reducerEntry,
      "@dreamboard-games/sdk/reducer/advanced": reducerAdvancedEntry,
      "@dreamboard-games/sdk/testing": testingEntry,
      "@dreamboard-games/sdk/testing-runtime": testingRuntimeEntry,
      "@dreamboard-games/sdk/types": typesEntry,
    },
    format: "esm",
    platform: "node",
    target: "node24",
    sourcemap: "inline",
    metafile: true,
    write: false,
    logLevel: "silent",
  });
  const output = bundled.outputFiles?.[0];
  if (!output || !bundled.metafile) {
    throw new Error("Scenario replay compilation did not produce a bundle.");
  }
  const sourceDigest = await digestSourceClosure({
    projectRoot: source.projectRoot,
    inputPaths: Object.keys(bundled.metafile.inputs),
  });

  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "dreamboard-compiled-scenario-"),
  );
  const outputPath = path.join(tempRoot, "compiled-scenario.mjs");
  try {
    await writeFile(outputPath, output.text);
    const loaded = (await import(
      `${pathToFileURL(outputPath).href}?source=${sourceDigest.slice(7, 19)}`
    )) as SyntheticCompileModule;
    if (typeof loaded.compile !== "function") {
      throw new Error("Scenario replay bundle is missing compile().");
    }
    const materialized = await loaded.compile({
      ...(options.at === undefined ? {} : { at: options.at }),
      scenarioPath: source.relativeScenarioPath,
      sourceDigest,
    });
    const compiled = {
      schemaVersion: 1,
      scenario: {
        path: source.relativeScenarioPath,
        sourceDigest,
      },
      definition: materialized.definition,
      checkpoint: materialized.checkpoint,
      expected: materialized.expected,
    } satisfies CompiledScenarioReplay;
    return assertSerializableCompiledReplay(compiled);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function resolveCurrentSdkFacade(name: string): Promise<string> {
  const candidates = [
    path.resolve(import.meta.dirname, `../${name}.ts`),
    path.resolve(import.meta.dirname, `${name}.js`),
  ];
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate;
  }
  throw new Error(
    `Could not resolve the current @dreamboard-games/sdk/${name} facade from ${import.meta.dirname}.`,
  );
}

async function resolveScenarioSource(
  requestedPath: string,
): Promise<ScenarioSource> {
  if (typeof requestedPath !== "string" || requestedPath.length === 0) {
    throw new Error("scenarioPath must be a non-empty string.");
  }
  const requestedAbsolute = path.resolve(process.cwd(), requestedPath);
  const requestedStats = await lstat(requestedAbsolute).catch((error) => {
    if (isMissingPathError(error)) return null;
    throw error;
  });
  if (!requestedStats?.isFile()) {
    throw new Error(`Scenario path does not name a file: ${requestedPath}.`);
  }
  const scenarioPath = await realpath(requestedAbsolute);
  const projectRoot = await findProjectRoot(path.dirname(scenarioPath));
  const canonicalProjectRoot = await realpath(projectRoot);
  const scenarioRoot = path.join(canonicalProjectRoot, "test", "scenarios");
  const canonicalScenarioRoot = await realpath(scenarioRoot).catch((error) => {
    if (isMissingPathError(error)) return null;
    throw error;
  });
  if (
    canonicalScenarioRoot === null ||
    !isWithinDirectory(canonicalScenarioRoot, scenarioPath) ||
    !scenarioPath.endsWith(".scenario.ts")
  ) {
    throw new Error(
      "scenarioPath must resolve to test/scenarios/**/*.scenario.ts inside one game package.",
    );
  }
  const gamePath = path.join(canonicalProjectRoot, "app", "game.ts");
  if (!(await isFile(gamePath))) {
    throw new Error(`Game package is missing ${gamePath}.`);
  }
  return {
    projectRoot: canonicalProjectRoot,
    scenarioPath,
    relativeScenarioPath: toPosix(
      path.relative(canonicalProjectRoot, scenarioPath),
    ),
    gamePath,
  };
}

async function findProjectRoot(start: string): Promise<string> {
  let current = path.resolve(start);
  for (;;) {
    if (
      (await isFile(path.join(current, "package.json"))) &&
      (await isFile(path.join(current, "app", "game.ts")))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        "Could not find a game package containing package.json and app/game.ts.",
      );
    }
    current = parent;
  }
}

function buildSyntheticSource(source: ScenarioSource): string {
  const gameSpecifier = localImportSpecifier(
    source.projectRoot,
    source.gamePath,
  );
  const scenarioSpecifier = localImportSpecifier(
    source.projectRoot,
    source.scenarioPath,
  );
  return [
    `import * as gameModule from ${JSON.stringify(gameSpecifier)};`,
    `import * as scenarioModule from ${JSON.stringify(scenarioSpecifier)};`,
    'import { inspectScenario, toScenarioReplayDefinition } from "@dreamboard-games/sdk/testing";',
    'import { digestScenarioProjection, scenarioProjectionParityFromInspectNode } from "@dreamboard-games/sdk/testing-runtime";',
    "const game = gameModule.game ?? gameModule.default;",
    "const scenario = scenarioModule.scenario ?? scenarioModule.default;",
    "export async function compile(options) {",
    "  if (!game || !scenario) {",
    '    throw new Error("Compiled scenario entry is missing game or scenario authority.");',
    "  }",
    "  const definition = toScenarioReplayDefinition(scenario);",
    "  const checkpoint = typeof options.at === 'string' ? scenario.checkpoints?.[options.at] : options.at;",
    "  if (typeof options.at === 'string' && checkpoint === undefined) {",
    "    const available = Object.keys(scenario.checkpoints ?? {}).sort();",
    "    throw new Error(`Unknown checkpoint '${options.at}'; available checkpoints: ${available.join(', ') || 'none'}.`);",
    "  }",
    "  const inspected = await inspectScenario({",
    "    game,",
    "    scenario: definition,",
    "    identity: {",
    "      id: definition.id,",
    "      path: options.scenarioPath,",
    "      sourceDigest: options.sourceDigest,",
    "    },",
    '    perspective: { kind: "spectator" },',
    "    ...(checkpoint === undefined ? {} : { at: checkpoint }),",
    "  });",
    "  return {",
    "    definition,",
    "    checkpoint: inspected.node.checkpoint,",
    "    expected: {",
    "      checkpointDigest: inspected.node.checkpointDigest,",
    "      publicProjectionDigest: digestScenarioProjection(",
    "        scenarioProjectionParityFromInspectNode(inspected.node),",
    "      ),",
    "    },",
    "  };",
    "}",
  ].join("\n");
}

async function digestSourceClosure(options: {
  readonly projectRoot: string;
  readonly inputPaths: readonly string[];
}): Promise<`sha256:${string}`> {
  const syntheticPath = path.resolve(options.projectRoot, syntheticSourceFile);
  const localPaths = options.inputPaths
    .map((inputPath) =>
      path.isAbsolute(inputPath)
        ? inputPath
        : path.resolve(options.projectRoot, inputPath),
    )
    .filter(
      (inputPath) =>
        inputPath !== syntheticPath &&
        isWithinDirectory(options.projectRoot, inputPath) &&
        !toPosix(path.relative(options.projectRoot, inputPath))
          .split("/")
          .includes("node_modules"),
    );
  const inputs = await Promise.all(
    [...new Set(localPaths)].map(async (inputPath) => {
      const content = await readFile(inputPath);
      return {
        path: toPosix(path.relative(options.projectRoot, inputPath)),
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    }),
  );
  inputs.sort((left, right) =>
    compareReferenceGameCanonicalStrings(left.path, right.path),
  );
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        digestVersion: scenarioSourceDigestVersion,
        inputs,
      }),
    )
    .digest("hex")}`;
}

function assertSerializableCompiledReplay(
  value: CompiledScenarioReplay,
): CompiledScenarioReplay {
  const serialized = JSON.stringify(value);
  const parsed = JSON.parse(serialized) as CompiledScenarioReplay;
  if (
    parsed.schemaVersion !== 1 ||
    !/^sha256:[a-f0-9]{64}$/.test(parsed.scenario.sourceDigest) ||
    !/^sha256:[a-f0-9]{64}$/.test(parsed.expected.checkpointDigest) ||
    !/^sha256:[a-f0-9]{64}$/.test(parsed.expected.publicProjectionDigest)
  ) {
    throw new Error("Compiled scenario replay failed digest validation.");
  }
  return parsed;
}

function localImportSpecifier(projectRoot: string, filePath: string): string {
  const relative = toPosix(path.relative(projectRoot, filePath));
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function isWithinDirectory(directory: string, filePath: string): boolean {
  const relative = path.relative(directory, filePath);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function isFile(filePath: string): Promise<boolean> {
  return stat(filePath)
    .then((value) => value.isFile())
    .catch((error) => {
      if (isMissingPathError(error)) return false;
      throw error;
    });
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "ENOENT"
  );
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}
