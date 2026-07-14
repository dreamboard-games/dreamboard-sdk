import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { repoCommandEnv, root } from "../ui/reference-games-lib.mjs";

export async function materializeReferenceGameSource({
  sourceRef,
  outputRoot,
}) {
  const revision = resolveFullGitSha(sourceRef);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const archive = runBuffer("git", [
    "archive",
    "--format=tar",
    revision,
    "examples/reference-games",
  ]).stdout;
  const tar = spawnSync("tar", ["-xf", "-", "-C", outputRoot], {
    input: archive,
    encoding: "buffer",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (tar.status !== 0) {
    throw new Error(`tar extraction failed\n${tar.stderr?.toString() ?? ""}`);
  }

  return {
    revision,
    sourceRoot: outputRoot,
  };
}

function resolveFullGitSha(sourceRef) {
  if (typeof sourceRef !== "string" || sourceRef.length === 0) {
    throw new Error("--source-ref is required.");
  }
  return runText("git", ["rev-parse", `${sourceRef}^{commit}`]).stdout.trim();
}

function runText(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: command === "git" ? repoCommandEnv(process.env) : process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 128,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${root}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function runBuffer(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: command === "git" ? repoCommandEnv(process.env) : process.env,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 128,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${root}\n${result.stdout?.toString() ?? ""}${result.stderr?.toString() ?? ""}`,
    );
  }
  return result;
}
