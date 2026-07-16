import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const scriptPath = path.join(packageRoot, "scripts", "generate.ts");
const schemaPath = path.join(
  packageRoot,
  "schema",
  "reducer-runtime.schema.json",
);
const operationsPath = path.join(
  packageRoot,
  "schema",
  "reducer-runtime.operations.json",
);

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runGenerator(args: readonly string[]): CommandResult {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function temporaryDirectory(): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), "reducer-contract-generator-test-"),
  );
}

function listFiles(directory: string): string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(path.relative(directory, absolute));
    }
  };
  visit(directory);
  return files.sort();
}

test("renders the checked-in artifacts byte-for-byte", () => {
  const outputRoot = temporaryDirectory();
  try {
    const result = runGenerator(["--output-root", outputRoot]);
    assert.equal(result.status, 0, result.stderr);

    const generatedFiles = listFiles(path.join(outputRoot, "generated"));
    assert.deepEqual(generatedFiles, [
      "builders.ts",
      "version.ts",
      "wire.ts",
      "zod.ts",
    ]);
    for (const relative of generatedFiles) {
      assert.equal(
        fs.readFileSync(path.join(outputRoot, "generated", relative), "utf8"),
        fs.readFileSync(path.join(packageRoot, "generated", relative), "utf8"),
        `generated/${relative}`,
      );
    }
    assert.equal(
      fs.readFileSync(path.join(outputRoot, "src", "bundle.ts"), "utf8"),
      fs.readFileSync(path.join(packageRoot, "src", "bundle.ts"), "utf8"),
      "src/bundle.ts",
    );
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("check mode detects stale and extra files without changing them", () => {
  const outputRoot = temporaryDirectory();
  try {
    const writeResult = runGenerator(["--output-root", outputRoot]);
    assert.equal(writeResult.status, 0, writeResult.stderr);

    const wirePath = path.join(outputRoot, "generated", "wire.ts");
    const extraPath = path.join(outputRoot, "generated", "obsolete.ts");
    fs.appendFileSync(wirePath, "// stale\n");
    fs.writeFileSync(extraPath, "// extra\n");
    const beforeWire = fs.readFileSync(wirePath, "utf8");
    const beforeExtra = fs.readFileSync(extraPath, "utf8");

    const checkResult = runGenerator(["--check", "--output-root", outputRoot]);
    assert.equal(checkResult.status, 1);
    assert.match(checkResult.stderr, /generated\/wire\.ts is stale/);
    assert.match(checkResult.stderr, /generated\/obsolete\.ts is unexpected/);
    assert.equal(fs.readFileSync(wirePath, "utf8"), beforeWire);
    assert.equal(fs.readFileSync(extraPath, "utf8"), beforeExtra);
  } finally {
    fs.rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("unsupported schema forms fail with their input path", () => {
  const directory = temporaryDirectory();
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as {
      $defs: Record<string, Record<string, unknown>>;
    };
    schema.$defs.EffectTransition!.unsupportedKeyword = true;
    const invalidSchemaPath = path.join(directory, "invalid-schema.json");
    fs.writeFileSync(invalidSchemaPath, `${JSON.stringify(schema, null, 2)}\n`);

    const result = runGenerator([
      "--schema-path",
      invalidSchemaPath,
      "--output-root",
      path.join(directory, "output"),
    ]);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /invalid-schema\.json#\/\$defs\/EffectTransition\/unsupportedKeyword/,
    );
    assert.match(result.stderr, /unsupported keyword/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("unsupported operation forms fail with their input path", () => {
  const directory = temporaryDirectory();
  try {
    const operations = JSON.parse(fs.readFileSync(operationsPath, "utf8")) as {
      operations: Array<Record<string, unknown>>;
    };
    operations.operations[0]!.input = ["InitializeRequest"];
    const invalidOperationsPath = path.join(
      directory,
      "invalid-operations.json",
    );
    fs.writeFileSync(
      invalidOperationsPath,
      `${JSON.stringify(operations, null, 2)}\n`,
    );

    const result = runGenerator([
      "--operations-path",
      invalidOperationsPath,
      "--output-root",
      path.join(directory, "output"),
    ]);
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /invalid-operations\.json#\/operations\/0\/input/,
    );
    assert.match(result.stderr, /input must be a wire type name or null/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("the checked-in artifacts pass non-mutating check mode", () => {
  const before = [
    ...listFiles(path.join(packageRoot, "generated")).map((relative) => [
      `generated/${relative}`,
      fs.readFileSync(path.join(packageRoot, "generated", relative), "utf8"),
    ]),
    [
      "src/bundle.ts",
      fs.readFileSync(path.join(packageRoot, "src", "bundle.ts"), "utf8"),
    ],
  ] as const;

  const result = runGenerator(["--check"]);
  assert.equal(result.status, 0, result.stderr);

  for (const [relative, contents] of before) {
    assert.equal(
      fs.readFileSync(path.join(packageRoot, relative), "utf8"),
      contents,
    );
  }
});
