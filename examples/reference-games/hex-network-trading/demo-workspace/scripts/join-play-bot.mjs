/**
 * Spawns `dreamboard join` and drives JSONL (list → validate → submit).
 * Run from workspace root: node scripts/join-play-bot.mjs
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SESSION = process.env.JOIN_SESSION ?? "001ce351-40f4-499c-8b37-7122c48c81ce";
const MY = "player-2";

/** Lower index = try first */
const ACTION_PRIORITY = [
  "rollDice",
  "placeSetupCamp",
  "placeSetupTrail",
  "discard",
  "moveStorm",
  "playScout",
  "playScoutCard",
  "buyCharterCard",
  "buyDevelopmentCard",
  "buildTrail",
  "buildCamp",
  "upgradeToTown",
  "bankTrade",
  "maritimeTrade",
  "offerTrade",
  "acceptTrade",
  "declineTrade",
  "pass",
  "endTurn",
];

function priorityScore(interactionId) {
  const i = ACTION_PRIORITY.indexOf(interactionId);
  return i === -1 ? 50 : i;
}

let nextId = 1;
/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let child = null;
/** @type {Map<string|number, (o: unknown) => void>} */
const pending = new Map();

/** @type {import('@dreamboard-games/api-client').PlayerGameplaySnapshot | null} */
let lastGameplay = null;
let actScheduled = false;
let busy = false;

function log(...args) {
  console.error("[join-bot]", ...args);
}

function sendLine(obj) {
  if (!child?.stdin.writable) return;
  child.stdin.write(`${JSON.stringify(obj)}\n`);
}

/**
 * @param {string} method
 * @param {Record<string, unknown>} params
 */
function rpc(method, params = {}) {
  const id = String(nextId++);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`RPC timeout: ${method} id=${id}`));
    }, 60_000);
    pending.set(id, (o) => {
      clearTimeout(t);
      if (o && typeof o === "object" && "error" in o) {
        reject(new Error(`${method}: ${JSON.stringify(o.error)}`));
        return;
      }
      resolve(o);
    });
    sendLine({ id, method, params });
  });
}

function applyGameplay(g) {
  if (g && typeof g === "object") lastGameplay = g;
}

function isMyTurn() {
  const g = lastGameplay;
  if (!g?.activePlayers?.length) return false;
  return g.activePlayers.includes(MY);
}

function gameOver() {
  const v = /** @type {{ winnerPlayerId?: string | null }} */ (
    lastGameplay?.view ?? {}
  );
  return Boolean(v?.winnerPlayerId);
}

/**
 * @param {unknown} domain
 * @returns {string[]}
 */
function eligibleFromDomain(domain) {
  if (!domain || typeof domain !== "object") return [];
  const d =
    /** @type {{ type?: string; projection?: string; eligibleTargets?: unknown }} */ (
      domain
    );
  if (
    d.type !== "cardTarget" &&
    d.type !== "boardTarget" ||
    d.projection !== "resolved" ||
    !Array.isArray(d.eligibleTargets)
  )
    return [];
  return d.eligibleTargets.filter((x) => typeof x === "string");
}

/**
 * @param {unknown} action
 */
async function resolveInputs(action) {
  if (!action || typeof action !== "object") return null;
  const a = /** @type {{ interactionId?: string; inputs?: unknown[] }} */ (
    action
  );
  const interactionId = a.interactionId;
  if (!interactionId) return null;

  const inputs = /** @type {Record<string, unknown>} */ ({});
  const inputDefs = Array.isArray(a.inputs) ? a.inputs : [];

  for (const inp of inputDefs) {
    if (!inp || typeof inp !== "object") continue;
    const row = /** @type {{ key?: string; domain?: unknown }} */ (inp);
    const key = row.key;
    if (!key) continue;

    const fromList = eligibleFromDomain(row.domain);
    if (fromList.length) {
      inputs[key] = fromList[0];
      continue;
    }

    try {
      const tRes = /** @type {{ domain?: unknown }} */ (
        await rpc("actions.targets", { interactionId, inputKey: key })
      );
      const fromTargets = eligibleFromDomain(tRes?.domain);
      if (fromTargets.length) {
        inputs[key] = fromTargets[0];
        continue;
      }
    } catch {
      // INPUT_HAS_NO_TARGETS etc.
    }

    const dom = /** @type {{ type?: string; options?: unknown[] }} */ (
      row.domain
    );
    if (dom?.type === "enum" && Array.isArray(dom.options) && dom.options[0]) {
      const opt = dom.options[0];
      if (typeof opt === "string") inputs[key] = opt;
      else if (opt && typeof opt === "object" && "value" in opt)
        inputs[key] = /** @type {{ value: unknown }} */ (opt).value;
      else inputs[key] = opt;
      continue;
    }

    return null;
  }

  for (const inp of inputDefs) {
    const k = /** @type {{ key?: string }} */ (inp).key;
    if (k && !(k in inputs)) return null;
  }

  return inputs;
}

async function tryOneTurn() {
  if (busy || !child || child.killed) return;
  if (gameOver()) {
    log("winner:", /** @type {{ winnerPlayerId?: string }} */ (lastGameplay?.view ?? {}).winnerPlayerId);
    child.kill("SIGTERM");
    return;
  }
  if (!isMyTurn()) return;

  busy = true;
  try {
    /** @type {{ version: number; actionSetVersion: string; actions?: unknown[] }} */
    let list;
    try {
      list = /** @type {typeof list} */ (await rpc("actions.list", {}));
    } catch (e) {
      if (String(e?.message ?? e).includes("NOT_READY")) {
        busy = false;
        return;
      }
      throw e;
    }

    const { version, actionSetVersion, actions = [] } = list;
    const sorted = [...actions].sort(
      (x, y) =>
        priorityScore(
          /** @type {{ interactionId?: string }} */ (x).interactionId ?? "",
        ) -
        priorityScore(
          /** @type {{ interactionId?: string }} */ (y).interactionId ?? "",
        ),
    );

    for (const action of sorted) {
      const a =
        /** @type {{ availability?: { status?: string }; interactionId?: string }} */ (
          action
        );
      if (a.availability?.status !== "available" || !a.interactionId)
        continue;

      const inputs = await resolveInputs(action);
      if (inputs === null) continue;

      let validated;
      try {
        validated = /** @type {{ valid?: boolean; message?: string }} */ (
          await rpc("actions.validate", {
            interactionId: a.interactionId,
            expectedVersion: version,
            actionSetVersion,
            inputs,
          })
        );
      } catch {
        continue;
      }

      if (!validated?.valid) continue;

      const submitted = /** @type {{ gameplay?: unknown; success?: boolean }} */ (
        await rpc("actions.submit", {
          interactionId: a.interactionId,
          expectedVersion: version,
          actionSetVersion,
          inputs,
        })
      );

      if (submitted?.gameplay) applyGameplay(submitted.gameplay);
      log("submitted", a.interactionId, inputs);
      setImmediate(() => scheduleAct());
      break;
    }
  } catch (e) {
    log("tryOneTurn error", e);
  } finally {
    busy = false;
  }
}

function scheduleAct() {
  if (actScheduled) return;
  actScheduled = true;
  setImmediate(() => {
    actScheduled = false;
    void tryOneTurn();
  });
}

function onEnvelope(o) {
  if (
    o &&
    typeof o === "object" &&
    ("result" in o || "error" in o) &&
    o.id != null
  ) {
    const rid = String(o.id);
    if (pending.has(rid)) {
      pending.get(rid)(o);
      pending.delete(rid);
      return;
    }
  }

  if (
    o &&
    typeof o === "object" &&
    o.type === "event" &&
    o.event &&
    typeof o.event === "object"
  ) {
    const ev = /** @type {{ type?: string; gameplay?: unknown }} */ (o.event);
    if (
      ev.type === "gameplay.bootstrap" ||
      ev.type === "gameplay.updated" ||
      ev.type === "gameplay.resynced"
    ) {
      if (ev.gameplay) applyGameplay(ev.gameplay);
      const g = /** @type {{ activePlayers?: string[]; version?: number }} */ (
        ev.gameplay ?? {}
      );
      log("event", ev.type, "v=", g.version, "active=", g.activePlayers?.join(","));
      scheduleAct();
    }
    return;
  }

  if (o && typeof o === "object" && o.type === "error") {
    log("stream error", o.error);
  }
}

function main() {
  child = spawn("dreamboard", ["join", "--env", "local", "--session", SESSION, "--player", "2"], {
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });

  child.stderr.on("data", (buf) => process.stderr.write(buf));

  child.on("exit", (code, sig) => {
    log("dreamboard join exited", code, sig);
    process.exit(code ?? 0);
  });

  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEnvelope(JSON.parse(trimmed));
    } catch {
      log("non-json stdout", trimmed.slice(0, 200));
    }
  });

  log("joined session", SESSION, "as", MY);
}

main();
