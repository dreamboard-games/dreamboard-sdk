import { encodeCanonicalCandidateValue } from "./canonical.js";
import {
  actuatorIdentityKey,
  isSemanticSurfaceSnapshot,
  targetIdentityKey,
  validateBrowserInteractionSnapshot,
} from "./normalize.js";
import type {
  BrowserInteractionActuator,
  BrowserInteractionDiagnostic,
  BrowserInteractionEntity,
  BrowserInteractionIntentRequest,
  BrowserInteractionResolution,
  BrowserInteractionSemanticSurfaceSnapshot,
  BrowserInteractionSnapshot,
} from "./types.js";

export function resolveBrowserInteractionIntent(
  snapshot: BrowserInteractionSnapshot,
  request: BrowserInteractionIntentRequest,
): BrowserInteractionResolution {
  const snapshotDiagnostics = [
    ...snapshot.diagnostics,
    ...validateBrowserInteractionSnapshot(snapshot),
  ];
  if (
    snapshotDiagnostics.some((diagnostic) => diagnostic.severity === "error")
  ) {
    return {
      ok: false,
      code: "invalid-snapshot",
      diagnostics: snapshotDiagnostics,
    };
  }

  const candidateValueKey =
    request.candidateValueKey ??
    ("candidateValue" in request
      ? encodeCanonicalCandidateValue(request.candidateValue)
      : undefined);
  const surfaces = snapshot.surfaces.filter(
    (surface): surface is BrowserInteractionSemanticSurfaceSnapshot =>
      isSemanticSurfaceSnapshot(surface) &&
      surface.surface === request.surface &&
      (request.scopeId === undefined || surface.scopeId === request.scopeId),
  );
  const matches = surfaces.flatMap((surface) =>
    surface.interactions.flatMap((interaction) => {
      if (
        request.interactionKey !== undefined &&
        interaction.interactionKey !== request.interactionKey
      ) {
        return [];
      }
      if (
        request.interactionId !== undefined &&
        interaction.interactionId !== request.interactionId
      ) {
        return [];
      }
      return interaction.actuators
        .filter((actuator) =>
          actuatorMatchesRequest(actuator, request, candidateValueKey),
        )
        .map((actuator) => ({ surface, interaction, actuator }));
    }),
  );
  const enabledMatches = matches.filter((match) => match.actuator.enabled);
  const actionable = request.allowDisabled === true ? matches : enabledMatches;

  if (actionable.length === 1) {
    const match = actionable[0];
    if (!match) throw new Error("unreachable browser interaction match");
    return {
      ok: true,
      actuator: match.actuator,
      surface: match.surface.surface,
      scopeId: match.surface.scopeId,
      interactionKey: match.interaction.interactionKey,
      diagnostics: [],
    };
  }

  if (actionable.length > 1) {
    return {
      ok: false,
      code: "ambiguous",
      diagnostics: actionable.map((match) =>
        diagnosticFor({
          code: "ambiguous-actuator",
          message: "Browser interaction intent resolved to multiple actuators.",
          surface: match.surface.surface,
          scopeId: match.surface.scopeId,
          interactionKey: match.interaction.interactionKey,
          intent: match.actuator.intent,
          actuatorId: match.actuator.actuatorId,
        }),
      ),
    };
  }

  const preparation = findPreparationChain(
    surfaces,
    request,
    candidateValueKey,
  );
  if (preparation.length > 0) {
    return {
      ok: false,
      code: "preparation-required",
      diagnostics: [
        diagnosticFor({
          code: "unavailable-actuator",
          message:
            "Requested browser interaction intent requires preparation before its actuator is available.",
          surface: request.surface,
          scopeId: request.scopeId,
          interactionKey: request.interactionKey,
          intent: request.intent,
        }),
      ],
      preparation,
    };
  }

  return {
    ok: false,
    code: matches.length > 0 ? "unavailable" : "not-found",
    diagnostics: [
      diagnosticFor({
        code: "unavailable-actuator",
        message:
          matches.length > 0
            ? "Browser interaction intent exists but has no enabled actuator."
            : "Browser interaction intent is not present in the current snapshot.",
        surface: request.surface,
        scopeId: request.scopeId,
        interactionKey: request.interactionKey,
        intent: request.intent,
      }),
    ],
  };
}

function actuatorMatchesRequest(
  actuator: BrowserInteractionActuator,
  request: BrowserInteractionIntentRequest,
  candidateValueKey: string | undefined,
): boolean {
  return (
    actuator.intent === request.intent &&
    (request.inputKey === undefined ||
      actuator.inputKey === request.inputKey) &&
    (candidateValueKey === undefined ||
      actuator.candidateValueKey === candidateValueKey) &&
    (request.actuatorKind === undefined ||
      actuator.actuatorKind === request.actuatorKind)
  );
}

function findPreparationChain(
  surfaces: readonly BrowserInteractionSemanticSurfaceSnapshot[],
  request: BrowserInteractionIntentRequest,
  candidateValueKey: string | undefined,
): BrowserInteractionActuator[] {
  const targetRequest = {
    ...request,
    candidateValueKey,
  };
  const preparationMatches = surfaces.flatMap((surface) =>
    surface.interactions.flatMap((interaction) => {
      if (!interactionMatchesRequest(interaction, request)) return [];
      return interaction.actuators
        .filter(
          (actuator) =>
            actuator.enabled &&
            actuator.prepares &&
            actuator.prepares.intent === targetRequest.intent &&
            (targetRequest.inputKey === undefined ||
              actuator.prepares.inputKey === targetRequest.inputKey) &&
            (targetRequest.candidateValueKey === undefined ||
              actuator.prepares.candidateValueKey ===
                targetRequest.candidateValueKey) &&
            (targetRequest.actuatorKind === undefined ||
              actuator.prepares.actuatorKind === targetRequest.actuatorKind),
        )
        .map((actuator) => ({ surface, interaction, actuator }));
    }),
  );
  if (preparationMatches.length !== 1) return [];
  const match = preparationMatches[0];
  if (!match) return [];
  return expandPreparationChain(
    match.surface,
    match.interaction,
    match.actuator,
  );
}

function expandPreparationChain(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
  actuator: BrowserInteractionActuator,
): BrowserInteractionActuator[] {
  const byKey = new Map<string, BrowserInteractionActuator>();
  for (const candidate of interaction.actuators) {
    byKey.set(
      actuatorIdentityKey({
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
        actuator: candidate,
      }),
      candidate,
    );
  }
  const chain: BrowserInteractionActuator[] = [];
  const visited = new Set<string>();
  let current: BrowserInteractionActuator | undefined = actuator;
  while (current) {
    const key = actuatorIdentityKey({
      surface: surface.surface,
      scopeId: surface.scopeId,
      interactionKey: interaction.interactionKey,
      actuator: current,
    });
    if (visited.has(key)) return [];
    visited.add(key);
    chain.push(current);
    current = current.prepares
      ? byKey.get(
          targetIdentityKey({
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            target: current.prepares,
          }),
        )
      : undefined;
  }
  return chain;
}

function interactionMatchesRequest(
  interaction: BrowserInteractionEntity,
  request: BrowserInteractionIntentRequest,
): boolean {
  return (
    (request.interactionKey === undefined ||
      interaction.interactionKey === request.interactionKey) &&
    (request.interactionId === undefined ||
      interaction.interactionId === request.interactionId)
  );
}

function diagnosticFor(
  input: Omit<BrowserInteractionDiagnostic, "severity">,
): BrowserInteractionDiagnostic {
  return { severity: "error", ...input };
}
