import { encodeCanonicalCandidateValue } from "./canonical.js";
import {
  browserInteractionEffectPatternMatches,
  encodeBrowserInteractionEffect,
} from "./effects.js";
import {
  actuatorIdentityKey,
  isSemanticSurfaceSnapshot,
  targetIdentityKey,
  validateBrowserInteractionSnapshot,
} from "./normalize.js";
import type {
  BrowserInteractionActuator,
  BrowserInteractionDiagnostic,
  BrowserInteractionEffectRequest,
  BrowserInteractionEffectResolution,
  BrowserInteractionEntity,
  BrowserInteractionIntentRequest,
  BrowserInteractionPointerTargetResolution,
  BrowserInteractionResolution,
  BrowserInteractionSemanticSurfaceSnapshot,
  BrowserInteractionSnapshot,
  BrowserInteractionSurfaceEffect,
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

export function resolveBrowserInteractionEffect(
  snapshot: BrowserInteractionSnapshot,
  request: BrowserInteractionEffectRequest,
): BrowserInteractionEffectResolution {
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

  const effectDiagnostics = validateEffectRequest(request.effect, request);
  if (effectDiagnostics.length > 0) {
    return {
      ok: false,
      code: "invalid-effect",
      diagnostics: effectDiagnostics,
    };
  }

  const surfaces = matchingSurfaces(snapshot, request);
  const matches = collectInteractionMatches(surfaces, request);
  const exactMatches = matches.filter((match) =>
    match.actuator.semanticEffects.some(
      (effect) =>
        encodeBrowserInteractionEffect(effect) ===
        encodeBrowserInteractionEffect(request.effect),
    ),
  );
  const enabledExactMatches = exactMatches.filter(
    (match) => match.actuator.enabled,
  );
  const actionableExactMatches =
    request.allowDisabled === true ? exactMatches : enabledExactMatches;

  if (actionableExactMatches.length === 1) {
    const match = actionableExactMatches[0];
    if (!match) throw new Error("unreachable browser effect match");
    return effectSuccess(match, request.effect, "exact");
  }

  if (actionableExactMatches.length > 1) {
    return effectAmbiguous(
      actionableExactMatches,
      "duplicate-enabled-effect-actuator",
      "Browser interaction effect resolved to multiple exact actuators.",
    );
  }

  if (exactMatches.length > 0 && enabledExactMatches.length === 0) {
    return effectUnavailable(
      request,
      "disabled-effect-actuator",
      "Browser interaction effect exists but has no enabled actuator.",
    );
  }

  const acceptedMatches = matches.filter((match) =>
    match.actuator.acceptedEffectPatterns.some((pattern) =>
      browserInteractionEffectPatternMatches(pattern, request.effect),
    ),
  );
  const enabledAcceptedMatches = acceptedMatches.filter(
    (match) => match.actuator.enabled,
  );
  const actionableAcceptedMatches =
    request.allowDisabled === true ? acceptedMatches : enabledAcceptedMatches;

  if (actionableAcceptedMatches.length === 1) {
    const match = actionableAcceptedMatches[0];
    if (!match) throw new Error("unreachable browser accepted effect match");
    return effectSuccess(match, request.effect, "accepted-pattern");
  }

  if (actionableAcceptedMatches.length > 1) {
    return effectAmbiguous(
      actionableAcceptedMatches,
      "duplicate-accepted-effect-pattern-match",
      "Browser interaction effect matched multiple accepted-effect patterns.",
    );
  }

  if (acceptedMatches.length > 0 && enabledAcceptedMatches.length === 0) {
    return effectUnavailable(
      request,
      "disabled-effect-actuator",
      "Browser interaction effect pattern exists but has no enabled actuator.",
    );
  }

  const preparation = findEffectPreparationChain(surfaces, request);
  if (preparation.ok) {
    return {
      ok: false,
      code: "preparation-required",
      diagnostics: [
        diagnosticFor({
          code: "unavailable-actuator",
          message:
            "Requested browser interaction effect requires preparation before its actuator is available.",
          surface: request.surface,
          scopeId: request.scopeId,
          interactionKey: request.interactionKey,
        }),
      ],
      preparation: preparation.preparation,
    };
  }
  if (preparation.diagnostics.length > 0) {
    return {
      ok: false,
      code: "ambiguous",
      diagnostics: preparation.diagnostics,
    };
  }

  return {
    ok: false,
    code: "not-found",
    diagnostics: [
      diagnosticFor({
        code: "missing-effect",
        message:
          "Browser interaction effect is not present in the current snapshot.",
        surface: request.surface,
        scopeId: request.scopeId,
        interactionKey: request.interactionKey,
      }),
    ],
  };
}

export function resolveBrowserPointerTarget(
  snapshot: BrowserInteractionSnapshot,
  request: BrowserInteractionEffectRequest,
): BrowserInteractionPointerTargetResolution {
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

  const effectDiagnostics = validateEffectRequest(request.effect, request);
  if (effectDiagnostics.length > 0) {
    return {
      ok: false,
      code: "invalid-effect",
      diagnostics: effectDiagnostics,
    };
  }

  const surfaces = matchingSurfaces(snapshot, request);
  const matches = collectPointerTargetMatches(surfaces, request).filter(
    (match) =>
      match.pointerTarget.acceptedEffectPatterns.some((pattern) =>
        browserInteractionEffectPatternMatches(pattern, request.effect),
      ),
  );
  const enabledMatches = matches.filter((match) => match.pointerTarget.enabled);
  const actionableMatches =
    request.allowDisabled === true ? matches : enabledMatches;

  if (actionableMatches.length === 1) {
    const match = actionableMatches[0];
    if (!match) throw new Error("unreachable browser pointer target match");
    return {
      ok: true,
      pointerTarget: match.pointerTarget,
      surface: match.surface.surface,
      scopeId: match.surface.scopeId,
      interactionKey: match.interaction.interactionKey,
      match: "accepted-pattern",
      effect: request.effect,
      diagnostics: [],
    };
  }

  if (actionableMatches.length > 1) {
    return {
      ok: false,
      code: "ambiguous",
      diagnostics: actionableMatches.map((match) =>
        diagnosticFor({
          code: "ambiguous-pointer-target",
          message:
            "Browser interaction effect matched multiple pointer targets.",
          surface: match.surface.surface,
          scopeId: match.surface.scopeId,
          interactionKey: match.interaction.interactionKey,
          targetId: match.pointerTarget.targetId,
        }),
      ),
    };
  }

  if (matches.length > 0 && enabledMatches.length === 0) {
    return {
      ok: false,
      code: "unavailable",
      diagnostics: [
        diagnosticFor({
          code: "disabled-pointer-target",
          message:
            "Browser interaction pointer target exists but is not enabled.",
          surface: request.surface,
          scopeId: request.scopeId,
          interactionKey: request.interactionKey,
        }),
      ],
    };
  }

  return {
    ok: false,
    code: "not-found",
    diagnostics: [
      diagnosticFor({
        code: "missing-effect",
        message:
          "Browser interaction effect is not accepted by any pointer target.",
        surface: request.surface,
        scopeId: request.scopeId,
        interactionKey: request.interactionKey,
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

function matchingSurfaces(
  snapshot: BrowserInteractionSnapshot,
  request: Pick<BrowserInteractionEffectRequest, "surface" | "scopeId">,
): BrowserInteractionSemanticSurfaceSnapshot[] {
  return snapshot.surfaces.filter(
    (surface): surface is BrowserInteractionSemanticSurfaceSnapshot =>
      isSemanticSurfaceSnapshot(surface) &&
      surface.surface === request.surface &&
      (request.scopeId === undefined || surface.scopeId === request.scopeId),
  );
}

function collectInteractionMatches(
  surfaces: readonly BrowserInteractionSemanticSurfaceSnapshot[],
  request: Pick<
    BrowserInteractionEffectRequest,
    "interactionKey" | "interactionId"
  >,
) {
  return surfaces.flatMap((surface) =>
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
      return interaction.actuators.map((actuator) => ({
        surface,
        interaction,
        actuator,
      }));
    }),
  );
}

function collectPointerTargetMatches(
  surfaces: readonly BrowserInteractionSemanticSurfaceSnapshot[],
  request: Pick<
    BrowserInteractionEffectRequest,
    "interactionKey" | "interactionId"
  >,
) {
  return surfaces.flatMap((surface) =>
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
      return interaction.pointerTargets.map((pointerTarget) => ({
        surface,
        interaction,
        pointerTarget,
      }));
    }),
  );
}

function effectSuccess(
  match: {
    readonly surface: BrowserInteractionSemanticSurfaceSnapshot;
    readonly interaction: BrowserInteractionEntity;
    readonly actuator: BrowserInteractionActuator;
  },
  effect: BrowserInteractionSurfaceEffect,
  kind: "exact" | "accepted-pattern",
): BrowserInteractionEffectResolution {
  return {
    ok: true,
    actuator: match.actuator,
    surface: match.surface.surface,
    scopeId: match.surface.scopeId,
    interactionKey: match.interaction.interactionKey,
    match: kind,
    effect,
    diagnostics: [],
  };
}

function effectAmbiguous(
  matches: readonly {
    readonly surface: BrowserInteractionSemanticSurfaceSnapshot;
    readonly interaction: BrowserInteractionEntity;
    readonly actuator: BrowserInteractionActuator;
  }[],
  code:
    | "duplicate-enabled-effect-actuator"
    | "duplicate-accepted-effect-pattern-match",
  message: string,
): BrowserInteractionEffectResolution {
  return {
    ok: false,
    code: "ambiguous",
    diagnostics: matches.map((match) =>
      diagnosticFor({
        code,
        message,
        surface: match.surface.surface,
        scopeId: match.surface.scopeId,
        interactionKey: match.interaction.interactionKey,
        intent: match.actuator.intent,
        actuatorId: match.actuator.actuatorId,
      }),
    ),
  };
}

function effectUnavailable(
  request: BrowserInteractionEffectRequest,
  code: "disabled-effect-actuator",
  message: string,
): BrowserInteractionEffectResolution {
  return {
    ok: false,
    code: "unavailable",
    diagnostics: [
      diagnosticFor({
        code,
        message,
        surface: request.surface,
        scopeId: request.scopeId,
        interactionKey: request.interactionKey,
      }),
    ],
  };
}

function findEffectPreparationChain(
  surfaces: readonly BrowserInteractionSemanticSurfaceSnapshot[],
  request: BrowserInteractionEffectRequest,
):
  | {
      readonly ok: true;
      readonly preparation: readonly BrowserInteractionActuator[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly BrowserInteractionDiagnostic[];
    } {
  const matches = collectInteractionMatches(surfaces, request).filter((match) =>
    match.actuator.preparationPatterns.some((pattern) =>
      browserInteractionEffectPatternMatches(pattern, request.effect),
    ),
  );
  const enabledMatches = matches.filter((match) => match.actuator.enabled);
  if (enabledMatches.length === 1) {
    const match = enabledMatches[0];
    if (!match) return { ok: false, diagnostics: [] };
    return { ok: true, preparation: [match.actuator] };
  }
  if (enabledMatches.length > 1) {
    return {
      ok: false,
      diagnostics: enabledMatches.map((match) =>
        diagnosticFor({
          code: "ambiguous-preparation-pattern",
          message:
            "Browser interaction effect resolved to multiple preparation actuators.",
          surface: match.surface.surface,
          scopeId: match.surface.scopeId,
          interactionKey: match.interaction.interactionKey,
          intent: match.actuator.intent,
          actuatorId: match.actuator.actuatorId,
        }),
      ),
    };
  }
  return { ok: false, diagnostics: [] };
}

function validateEffectRequest(
  effect: BrowserInteractionSurfaceEffect,
  request: Pick<
    BrowserInteractionEffectRequest,
    "surface" | "scopeId" | "interactionKey"
  >,
): readonly BrowserInteractionDiagnostic[] {
  if (!effect || typeof effect.kind !== "string" || effect.kind.length === 0) {
    return [
      diagnosticFor({
        code: "invalid-effect-payload",
        message: "Browser interaction effect requires a string kind.",
        surface: request.surface,
        scopeId: request.scopeId,
        interactionKey: request.interactionKey,
      }),
    ];
  }
  if (effect.kind === "setScalar") {
    const value = effect.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return [
        diagnosticFor({
          code: "invalid-scalar-argument",
          message:
            "setScalar browser interaction effects require a finite value.",
          surface: request.surface,
          scopeId: request.scopeId,
          interactionKey: request.interactionKey,
        }),
      ];
    }
  }
  return [];
}

function diagnosticFor(
  input: Omit<BrowserInteractionDiagnostic, "severity">,
): BrowserInteractionDiagnostic {
  return { severity: "error", ...input };
}
