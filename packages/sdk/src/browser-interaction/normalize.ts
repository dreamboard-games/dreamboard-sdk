import {
  BROWSER_INTERACTION_ACTUATOR_KINDS,
  BROWSER_INTERACTION_ATTRIBUTES,
  BROWSER_INTERACTION_CANDIDATE_STATES,
  BROWSER_INTERACTION_READINESS_VALUES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_NAME,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
  GAMEPLAY_BROWSER_INTERACTION_SURFACE,
} from "./constants.js";
import {
  decodeCanonicalCandidateValue,
  encodeCanonicalCandidateValue,
} from "./canonical.js";
import {
  browserInteractionEffectPatternMatches,
  decodeBrowserInteractionEffect,
  decodeBrowserInteractionEffectPattern,
  encodeBrowserInteractionEffect,
  encodeBrowserInteractionEffectPattern,
} from "./effects.js";
import { createBrowserInteractionActuatorKey } from "./attributes.js";
import { defaultBrowserInteractionRegistry } from "./registry.js";
import type {
  BrowserInteractionActuator,
  BrowserInteractionActuatorKind,
  BrowserInteractionCandidateState,
  BrowserInteractionDiagnostic,
  BrowserInteractionEffectPattern,
  BrowserInteractionEntity,
  BrowserInteractionPointerTarget,
  BrowserInteractionRawRecord,
  BrowserInteractionReadiness,
  BrowserInteractionRegistry,
  BrowserInteractionSemanticSurfaceSnapshot,
  BrowserInteractionSnapshot,
  BrowserInteractionSurfaceEffect,
  BrowserInteractionSurface,
  BrowserInteractionSurfaceSnapshot,
} from "./types.js";

interface PendingInteraction {
  interactionKey: string;
  interactionId: string;
  descriptorDigest?: string;
  draftDigest?: string;
  readiness: BrowserInteractionReadiness;
  rootSeen: boolean;
  actuators: BrowserInteractionActuator[];
  pointerTargets: BrowserInteractionPointerTarget[];
  diagnostics: BrowserInteractionDiagnostic[];
}

interface PendingSemanticSurface {
  kind: "semantic";
  surface: BrowserInteractionSurface;
  scopeId: string;
  interactions: Map<string, PendingInteraction>;
  diagnostics: BrowserInteractionDiagnostic[];
}

interface PendingUnknownSurface {
  kind: "unknown";
  surface: BrowserInteractionSurface;
  scopeId: string;
  diagnostics: BrowserInteractionDiagnostic[];
}

type PendingSurface = PendingSemanticSurface | PendingUnknownSurface;

export interface NormalizeBrowserInteractionRecordsOptions {
  readonly registry?: BrowserInteractionRegistry;
}

export function normalizeBrowserInteractionRecords(
  records: readonly BrowserInteractionRawRecord[],
  options: NormalizeBrowserInteractionRecordsOptions = {},
): BrowserInteractionSnapshot {
  const registry = options.registry ?? defaultBrowserInteractionRegistry;
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  const surfaces = new Map<string, PendingSurface>();

  const getSurface = (
    surface: string,
    scopeId: string,
  ): PendingSurface | null => {
    const registered = registry.surfaces.get(surface);
    const key = `${surface}\0${scopeId}`;
    const existing = surfaces.get(key);
    if (existing) return existing;
    if (!registered) {
      const diagnostic = diagnosticFor({
        code: "unknown-surface",
        message: `Unknown browser interaction surface '${surface}'.`,
        surface,
        scopeId,
      });
      diagnostics.push(diagnostic);
      const pending: PendingUnknownSurface = {
        kind: "unknown",
        surface,
        scopeId,
        diagnostics: [diagnostic],
      };
      surfaces.set(key, pending);
      return pending;
    }
    const pending: PendingSemanticSurface = {
      kind: "semantic",
      surface,
      scopeId,
      interactions: new Map(),
      diagnostics: [],
    };
    surfaces.set(key, pending);
    return pending;
  };

  for (const record of records) {
    const attributes = record.attributes;
    const protocol = text(attributes, BROWSER_INTERACTION_ATTRIBUTES.protocol);
    const surface = text(attributes, BROWSER_INTERACTION_ATTRIBUTES.surface);
    const scopeId = text(attributes, BROWSER_INTERACTION_ATTRIBUTES.scope);
    const role = text(attributes, BROWSER_INTERACTION_ATTRIBUTES.role);

    if (protocol !== DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION) {
      diagnostics.push(
        diagnosticFor({
          code: "invalid-protocol",
          message: `Expected browser interaction protocol ${DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION}.`,
          surface,
          scopeId,
        }),
      );
      continue;
    }
    if (
      !surface ||
      !scopeId ||
      (role !== "interaction" &&
        role !== "actuator" &&
        role !== "pointer-target")
    ) {
      diagnostics.push(
        diagnosticFor({
          code: "invalid-record",
          message:
            "Browser interaction records require protocol, surface, scope and role.",
          surface,
          scopeId,
        }),
      );
      continue;
    }

    const pendingSurface = getSurface(surface, scopeId);
    if (!pendingSurface || pendingSurface.kind !== "semantic") {
      continue;
    }
    const interactionKey = text(
      attributes,
      BROWSER_INTERACTION_ATTRIBUTES.interactionKey,
    );
    const interactionId = text(
      attributes,
      BROWSER_INTERACTION_ATTRIBUTES.interactionId,
    );
    if (!interactionKey || !interactionId) {
      pushSurfaceDiagnostic(
        pendingSurface,
        diagnostics,
        diagnosticFor({
          code: "invalid-record",
          message:
            "Browser interaction records require interaction key and id.",
          surface,
          scopeId,
        }),
      );
      continue;
    }
    const interaction = getInteraction(
      pendingSurface,
      interactionKey,
      interactionId,
    );

    if (role === "interaction") {
      interaction.rootSeen = true;
      interaction.descriptorDigest = optionalText(
        attributes,
        BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest,
      );
      interaction.draftDigest = optionalText(
        attributes,
        BROWSER_INTERACTION_ATTRIBUTES.draftDigest,
      );
      interaction.readiness = parseReadiness(
        text(attributes, BROWSER_INTERACTION_ATTRIBUTES.readiness),
      );
      continue;
    }

    if (role === "pointer-target") {
      const pointerTarget = parseGameplayPointerTarget(attributes, {
        surface,
        scopeId,
        interactionKey,
        interactionId,
      });
      if (pointerTarget.diagnostics.length > 0) {
        interaction.diagnostics.push(...pointerTarget.diagnostics);
        diagnostics.push(...pointerTarget.diagnostics);
      }
      const registered = registry.surfaces.get(surface);
      if (registered?.effectKinds) {
        for (const pattern of pointerTarget.acceptedEffectPatterns) {
          const effectKind =
            pattern.kind === "exact" ? pattern.effect.kind : pattern.effectKind;
          if (!registered.effectKinds.includes(effectKind)) {
            const diagnostic = diagnosticFor({
              code: "unknown-surface-effect",
              message: `Unknown browser interaction effect '${effectKind}' for surface '${surface}'.`,
              surface,
              scopeId,
              interactionKey,
              targetId: pointerTarget.targetId,
            });
            interaction.diagnostics.push(diagnostic);
            diagnostics.push(diagnostic);
          }
        }
      }
      interaction.pointerTargets.push(pointerTarget);
      continue;
    }

    const actuator = parseGameplayActuator(attributes, {
      surface,
      scopeId,
      interactionKey,
      interactionId,
    });
    if (actuator.diagnostics.length > 0) {
      interaction.diagnostics.push(...actuator.diagnostics);
      diagnostics.push(...actuator.diagnostics);
    }
    const registered = registry.surfaces.get(surface);
    if (registered && !registered.intents.includes(actuator.intent)) {
      const diagnostic = diagnosticFor({
        code: "unknown-intent",
        message: `Unknown browser interaction intent '${actuator.intent}' for surface '${surface}'.`,
        surface,
        scopeId,
        interactionKey,
        intent: actuator.intent,
        actuatorId: actuator.actuatorId,
      });
      interaction.diagnostics.push(diagnostic);
      diagnostics.push(diagnostic);
    }
    if (registered?.effectKinds) {
      for (const effect of actuator.semanticEffects) {
        if (!registered.effectKinds.includes(effect.kind)) {
          const diagnostic = diagnosticFor({
            code: "unknown-surface-effect",
            message: `Unknown browser interaction effect '${effect.kind}' for surface '${surface}'.`,
            surface,
            scopeId,
            interactionKey,
            intent: actuator.intent,
            actuatorId: actuator.actuatorId,
          });
          interaction.diagnostics.push(diagnostic);
          diagnostics.push(diagnostic);
        }
      }
      for (const pattern of [
        ...actuator.acceptedEffectPatterns,
        ...actuator.preparationPatterns,
      ]) {
        const effectKind =
          pattern.kind === "exact" ? pattern.effect.kind : pattern.effectKind;
        if (!registered.effectKinds.includes(effectKind)) {
          const diagnostic = diagnosticFor({
            code: "unknown-surface-effect",
            message: `Unknown browser interaction effect '${effectKind}' for surface '${surface}'.`,
            surface,
            scopeId,
            interactionKey,
            intent: actuator.intent,
            actuatorId: actuator.actuatorId,
          });
          interaction.diagnostics.push(diagnostic);
          diagnostics.push(diagnostic);
        }
      }
    }
    interaction.actuators.push(actuator);
  }

  for (const surface of surfaces.values()) {
    if (surface.kind !== "semantic") continue;
    for (const interaction of surface.interactions.values()) {
      if (
        interaction.rootSeen ||
        (interaction.actuators.length === 0 &&
          interaction.pointerTargets.length === 0)
      ) {
        continue;
      }
      const diagnostic = diagnosticFor({
        code: "orphan-actuator",
        message:
          "Browser interaction actuators and pointer targets require a rendered semantic root.",
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
      });
      interaction.diagnostics.push(diagnostic);
      diagnostics.push(diagnostic);
    }
  }

  const snapshot: BrowserInteractionSnapshot = {
    protocol: {
      name: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_NAME,
      version: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    },
    surfaces: [...surfaces.values()].map(finalizeSurface).sort(compareSurface),
    diagnostics: [],
  };
  const validationDiagnostics = validateBrowserInteractionSnapshot(snapshot);
  return {
    ...snapshot,
    diagnostics: [...diagnostics, ...validationDiagnostics].sort(
      compareDiagnostic,
    ),
  };
}

export function validateBrowserInteractionSnapshot(
  snapshot: BrowserInteractionSnapshot,
): readonly BrowserInteractionDiagnostic[] {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  for (const surface of snapshot.surfaces) {
    if (!isSemanticSurfaceSnapshot(surface)) continue;
    for (const interaction of surface.interactions) {
      const enabledByKey = new Map<string, BrowserInteractionActuator[]>();
      const enabledTargetsByKey = new Map<
        string,
        BrowserInteractionPointerTarget[]
      >();
      for (const actuator of interaction.actuators) {
        if (!actuator.enabled) continue;
        const key = actuatorIdentityKey({
          surface: surface.surface,
          scopeId: surface.scopeId,
          interactionKey: interaction.interactionKey,
          actuator,
        });
        const group = enabledByKey.get(key) ?? [];
        group.push(actuator);
        enabledByKey.set(key, group);
      }
      for (const pointerTarget of interaction.pointerTargets) {
        if (!pointerTarget.enabled) continue;
        const key = pointerTargetIdentityKey({
          surface: surface.surface,
          scopeId: surface.scopeId,
          interactionKey: interaction.interactionKey,
          pointerTarget,
        });
        const group = enabledTargetsByKey.get(key) ?? [];
        group.push(pointerTarget);
        enabledTargetsByKey.set(key, group);
      }
      for (const [key, actuators] of enabledByKey) {
        if (actuators.length > 1) {
          diagnostics.push(
            diagnosticFor({
              code: "duplicate-enabled-actuator",
              message: `Duplicate enabled actuator for '${key}'.`,
              surface: surface.surface,
              scopeId: surface.scopeId,
              interactionKey: interaction.interactionKey,
              intent: actuators[0]?.intent,
              actuatorId: actuators[0]?.actuatorId,
            }),
          );
        }
      }
      for (const [key, pointerTargets] of enabledTargetsByKey) {
        if (pointerTargets.length > 1) {
          diagnostics.push(
            diagnosticFor({
              code: "duplicate-enabled-pointer-target",
              message: `Duplicate enabled pointer target for '${key}'.`,
              surface: surface.surface,
              scopeId: surface.scopeId,
              interactionKey: interaction.interactionKey,
              targetId: pointerTargets[0]?.targetId,
            }),
          );
        }
      }
      diagnostics.push(
        ...diagnosticsForPreparationCycles(surface, interaction),
        ...diagnosticsForPreparationPatternAmbiguity(surface, interaction),
        ...diagnosticsForInvalidAcceptedPatterns(surface, interaction),
        ...diagnosticsForGameplayEffectCompatibility(surface, interaction),
      );
    }
  }
  return diagnostics.sort(compareDiagnostic);
}

function diagnosticsForInvalidAcceptedPatterns(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
): BrowserInteractionDiagnostic[] {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  for (const record of [
    ...interaction.actuators.map((actuator) => ({
      patterns: actuator.acceptedEffectPatterns,
      intent: actuator.intent,
      actuatorId: actuator.actuatorId,
      targetId: undefined,
    })),
    ...interaction.pointerTargets.map((pointerTarget) => ({
      patterns: pointerTarget.acceptedEffectPatterns,
      intent: undefined,
      actuatorId: undefined,
      targetId: pointerTarget.targetId,
    })),
  ]) {
    for (const pattern of record.patterns) {
      if (
        pattern.kind === "match" &&
        Object.keys(pattern.fields ?? {}).length === 0 &&
        pattern.scalar === undefined
      ) {
        diagnostics.push(
          diagnosticFor({
            code: "invalid-effect-pattern",
            message:
              "Accepted-effect match patterns must be bounded by fields or scalar constraints.",
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            intent: record.intent,
            actuatorId: record.actuatorId,
            targetId: record.targetId,
          }),
        );
      }
    }
  }
  return diagnostics;
}

function diagnosticsForGameplayEffectCompatibility(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
): BrowserInteractionDiagnostic[] {
  if (surface.surface !== GAMEPLAY_BROWSER_INTERACTION_SURFACE) return [];
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  for (const actuator of interaction.actuators) {
    for (const effect of actuator.semanticEffects) {
      if (!gameplayIntentCanPerformEffect(actuator.intent, effect.kind)) {
        diagnostics.push(
          diagnosticFor({
            code: "effect-intent-incompatibility",
            message:
              "Gameplay browser interaction intent is incompatible with its semantic effect.",
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            intent: actuator.intent,
            actuatorId: actuator.actuatorId,
          }),
        );
      }
    }
  }
  return diagnostics;
}

function gameplayIntentCanPerformEffect(intent: string, effectKind: string) {
  switch (effectKind) {
    case "setCandidate":
      return intent === "select" || intent === "toggle";
    case "adjustResource":
      return intent === "increment" || intent === "decrement";
    case "setScalar":
      return (
        intent === "fill" || intent === "increment" || intent === "decrement"
      );
    case "commit":
      return intent === "submit" || intent === "invoke";
    case "invoke":
      return intent === "invoke" || intent === "select" || intent === "toggle";
    default:
      return true;
  }
}

function parseGameplayActuator(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  context: {
    surface: string;
    scopeId: string;
    interactionKey: string;
    interactionId: string;
  },
): BrowserInteractionActuator {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  const intent = text(attributes, BROWSER_INTERACTION_ATTRIBUTES.intent);
  const actuatorKind = parseActuatorKind(
    text(attributes, BROWSER_INTERACTION_ATTRIBUTES.actuatorKind),
  );
  const inputKey = optionalText(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.inputKey,
  );
  const candidate = parseCandidate(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.candidateValue,
    context,
    intent,
    diagnostics,
  );
  const candidateState = parseCandidateState(
    optionalText(attributes, BROWSER_INTERACTION_ATTRIBUTES.candidateState),
  );
  const explicitId = optionalText(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.actuatorId,
  );
  const enabled = parseEnabled(
    attributes[BROWSER_INTERACTION_ATTRIBUTES.enabled],
  );
  const actuatorId =
    explicitId ??
    createBrowserInteractionActuatorKey({
      surface: context.surface,
      scopeId: context.scopeId,
      interactionKey: context.interactionKey,
      intent,
      inputKey,
      candidateValueKey: candidate?.candidateValueKey,
      actuatorKind,
    });
  const preparesIntent = optionalText(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.preparesIntent,
  );
  const preparesCandidate = parseCandidate(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.preparesCandidateValue,
    context,
    preparesIntent ?? intent,
    diagnostics,
  );
  const prepares =
    preparesIntent === undefined
      ? undefined
      : {
          intent: preparesIntent,
          inputKey: optionalText(
            attributes,
            BROWSER_INTERACTION_ATTRIBUTES.preparesInputKey,
          ),
          candidateValue: preparesCandidate?.candidateValue,
          candidateValueKey: preparesCandidate?.candidateValueKey,
          actuatorKind: parseOptionalActuatorKind(
            optionalText(
              attributes,
              BROWSER_INTERACTION_ATTRIBUTES.preparesActuatorKind,
            ),
          ),
        };
  const semanticEffects = parseEffectList(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.semanticEffects,
    context,
    intent,
    diagnostics,
  );
  const acceptedEffectPatterns = parseEffectPatternList(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.acceptedEffectPatterns,
    context,
    intent,
    diagnostics,
  );
  const preparationPatterns = parseEffectPatternList(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.preparationPatterns,
    context,
    intent,
    diagnostics,
  );

  if (!intent) {
    diagnostics.push(
      diagnosticFor({
        code: "invalid-record",
        message: "Browser interaction actuator records require an intent.",
        ...context,
      }),
    );
  }

  return {
    actuatorId,
    intent,
    descriptorDigest: optionalText(
      attributes,
      BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest,
    ),
    draftDigest: optionalText(
      attributes,
      BROWSER_INTERACTION_ATTRIBUTES.draftDigest,
    ),
    inputKey,
    candidateValue: candidate?.candidateValue,
    candidateValueKey: candidate?.candidateValueKey,
    candidateState,
    enabled,
    actuatorKind,
    semanticEffects,
    acceptedEffectPatterns,
    preparationPatterns,
    prepares,
    diagnostics: diagnostics.sort(compareDiagnostic),
  };
}

function parseGameplayPointerTarget(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  context: {
    surface: string;
    scopeId: string;
    interactionKey: string;
    interactionId: string;
  },
): BrowserInteractionPointerTarget {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  const targetId = text(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.pointerTargetId,
  );
  const enabled = parseEnabled(
    attributes[BROWSER_INTERACTION_ATTRIBUTES.pointerTargetEnabled],
  );
  const acceptedEffectPatterns = parseEffectPatternList(
    attributes,
    BROWSER_INTERACTION_ATTRIBUTES.acceptedEffectPatterns,
    context,
    "pointer-target",
    diagnostics,
  );

  if (!targetId) {
    diagnostics.push(
      diagnosticFor({
        code: "invalid-record",
        message:
          "Browser interaction pointer target records require a target id.",
        ...context,
      }),
    );
  }

  return {
    targetId,
    descriptorDigest: optionalText(
      attributes,
      BROWSER_INTERACTION_ATTRIBUTES.descriptorDigest,
    ),
    enabled,
    acceptedEffectPatterns,
    diagnostics: diagnostics.sort(compareDiagnostic),
  };
}

function parseEffectList(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  attribute: string,
  context: {
    surface: string;
    scopeId: string;
    interactionKey: string;
  },
  intent: string,
  diagnostics: BrowserInteractionDiagnostic[],
): BrowserInteractionSurfaceEffect[] {
  const encodedList = optionalText(attributes, attribute);
  if (encodedList === undefined) return [];
  try {
    const raw = JSON.parse(encodedList) as unknown;
    if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
      throw new Error("Expected encoded effect array.");
    }
    return raw
      .map((encoded) => decodeBrowserInteractionEffect(encoded))
      .sort((a, b) =>
        encodeBrowserInteractionEffect(a).localeCompare(
          encodeBrowserInteractionEffect(b),
        ),
      );
  } catch {
    diagnostics.push(
      diagnosticFor({
        code: "invalid-effect-payload",
        message: "Invalid browser interaction semantic effect payload.",
        ...context,
        intent,
      }),
    );
    return [];
  }
}

function parseEffectPatternList(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  attribute: string,
  context: {
    surface: string;
    scopeId: string;
    interactionKey: string;
  },
  intent: string,
  diagnostics: BrowserInteractionDiagnostic[],
): BrowserInteractionEffectPattern[] {
  const encodedList = optionalText(attributes, attribute);
  if (encodedList === undefined) return [];
  try {
    const raw = JSON.parse(encodedList) as unknown;
    if (!Array.isArray(raw) || raw.some((item) => typeof item !== "string")) {
      throw new Error("Expected encoded effect pattern array.");
    }
    return raw
      .map((encoded) => decodeBrowserInteractionEffectPattern(encoded))
      .sort((a, b) =>
        encodeBrowserInteractionEffectPattern(a).localeCompare(
          encodeBrowserInteractionEffectPattern(b),
        ),
      );
  } catch {
    diagnostics.push(
      diagnosticFor({
        code: "invalid-effect-pattern",
        message: "Invalid browser interaction semantic effect pattern.",
        ...context,
        intent,
      }),
    );
    return [];
  }
}

function parseCandidate(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  attribute: string,
  context: {
    surface: string;
    scopeId: string;
    interactionKey: string;
  },
  intent: string,
  diagnostics: BrowserInteractionDiagnostic[],
) {
  const encoded = optionalText(attributes, attribute);
  if (encoded === undefined) return undefined;
  try {
    const candidateValue = decodeCanonicalCandidateValue(encoded);
    return {
      candidateValue,
      candidateValueKey: encodeCanonicalCandidateValue(candidateValue),
    };
  } catch {
    diagnostics.push(
      diagnosticFor({
        code: "invalid-candidate",
        message: `Invalid canonical browser interaction candidate '${encoded}'.`,
        ...context,
        intent,
      }),
    );
    return undefined;
  }
}

function getInteraction(
  surface: PendingSemanticSurface,
  interactionKey: string,
  interactionId: string,
): PendingInteraction {
  const existing = surface.interactions.get(interactionKey);
  if (existing) return existing;
  const next: PendingInteraction = {
    interactionKey,
    interactionId,
    readiness: "ready",
    rootSeen: false,
    actuators: [],
    pointerTargets: [],
    diagnostics: [],
  };
  surface.interactions.set(interactionKey, next);
  return next;
}

function finalizeSurface(
  surface: PendingSurface,
): BrowserInteractionSurfaceSnapshot {
  if (surface.kind !== "semantic") {
    return {
      surface: surface.surface,
      scopeId: surface.scopeId,
      diagnostics: surface.diagnostics.sort(compareDiagnostic),
    };
  }
  const interactions: BrowserInteractionEntity[] = [
    ...surface.interactions.values(),
  ]
    .map((interaction) => ({
      interactionKey: interaction.interactionKey,
      interactionId: interaction.interactionId,
      descriptorDigest: interaction.descriptorDigest,
      draftDigest: interaction.draftDigest,
      readiness: interaction.readiness,
      actuators: interaction.actuators.sort(compareActuator),
      pointerTargets: interaction.pointerTargets.sort(comparePointerTarget),
      diagnostics: interaction.diagnostics.sort(compareDiagnostic),
    }))
    .sort((a, b) => a.interactionKey.localeCompare(b.interactionKey));
  return {
    surface: surface.surface,
    scopeId: surface.scopeId,
    interactions,
    diagnostics: surface.diagnostics.sort(compareDiagnostic),
  };
}

function diagnosticsForPreparationCycles(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
): BrowserInteractionDiagnostic[] {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  diagnostics.push(
    ...diagnosticsForEffectPreparationCycles(surface, interaction),
  );
  const actuators = new Map<string, BrowserInteractionActuator>();
  for (const actuator of interaction.actuators) {
    actuators.set(
      actuatorIdentityKey({
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
        actuator,
      }),
      actuator,
    );
  }
  for (const actuator of interaction.actuators) {
    const visited = new Set<string>();
    let current: BrowserInteractionActuator | undefined = actuator;
    while (current?.prepares) {
      const key = actuatorIdentityKey({
        surface: surface.surface,
        scopeId: surface.scopeId,
        interactionKey: interaction.interactionKey,
        actuator: current,
      });
      if (visited.has(key)) {
        diagnostics.push(
          diagnosticFor({
            code: "preparation-cycle",
            message: `Preparation cycle detected for actuator '${current.actuatorId}'.`,
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            intent: current.intent,
            actuatorId: current.actuatorId,
          }),
        );
        break;
      }
      visited.add(key);
      current = actuators.get(
        targetIdentityKey({
          surface: surface.surface,
          scopeId: surface.scopeId,
          interactionKey: interaction.interactionKey,
          target: current.prepares,
        }),
      );
    }
  }
  return diagnostics;
}

function diagnosticsForEffectPreparationCycles(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
): BrowserInteractionDiagnostic[] {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  const actuatorKeys = new Map<BrowserInteractionActuator, string>();
  interaction.actuators.forEach((actuator, index) => {
    actuatorKeys.set(actuator, `${actuator.actuatorId}\0${index}`);
  });
  for (const actuator of interaction.actuators) {
    const visited = new Set<string>();
    let current: BrowserInteractionActuator | undefined = actuator;
    while (current) {
      const key = actuatorKeys.get(current);
      if (!key) break;
      if (visited.has(key)) {
        diagnostics.push(
          diagnosticFor({
            code: "preparation-cycle",
            message: `Semantic preparation cycle detected for actuator '${current.actuatorId}'.`,
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            intent: current.intent,
            actuatorId: current.actuatorId,
          }),
        );
        break;
      }
      visited.add(key);
      current = interaction.actuators.find((candidate) =>
        current?.preparationPatterns.some((pattern) =>
          candidate.semanticEffects.some((effect) =>
            browserInteractionEffectPatternMatches(pattern, effect),
          ),
        ),
      );
    }
  }
  return diagnostics;
}

function diagnosticsForPreparationPatternAmbiguity(
  surface: BrowserInteractionSemanticSurfaceSnapshot,
  interaction: BrowserInteractionEntity,
): BrowserInteractionDiagnostic[] {
  const diagnostics: BrowserInteractionDiagnostic[] = [];
  for (const target of interaction.actuators) {
    for (const effect of target.semanticEffects) {
      const matches = interaction.actuators.filter((actuator) =>
        actuator.preparationPatterns.some((pattern) =>
          browserInteractionEffectPatternMatches(pattern, effect),
        ),
      );
      const uniqueActuatorIds = new Set(
        matches.map((match) => match.actuatorId),
      );
      if (uniqueActuatorIds.size > 1) {
        diagnostics.push(
          diagnosticFor({
            code: "ambiguous-preparation-pattern",
            message:
              "Multiple preparation patterns can prepare the same semantic effect.",
            surface: surface.surface,
            scopeId: surface.scopeId,
            interactionKey: interaction.interactionKey,
            intent: target.intent,
            actuatorId: target.actuatorId,
          }),
        );
      }
    }
  }
  return diagnostics;
}

export function actuatorIdentityKey(input: {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly actuator: Pick<
    BrowserInteractionActuator,
    "intent" | "inputKey" | "candidateValueKey" | "actuatorKind"
  >;
}): string {
  return createBrowserInteractionActuatorKey({
    surface: input.surface,
    scopeId: input.scopeId,
    interactionKey: input.interactionKey,
    intent: input.actuator.intent,
    inputKey: input.actuator.inputKey,
    candidateValueKey: input.actuator.candidateValueKey,
    actuatorKind: input.actuator.actuatorKind,
  });
}

export function pointerTargetIdentityKey(input: {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly pointerTarget: Pick<BrowserInteractionPointerTarget, "targetId">;
}): string {
  return [
    input.surface,
    input.scopeId,
    input.interactionKey,
    input.pointerTarget.targetId,
  ]
    .map((part) => encodeURIComponent(part))
    .join("|");
}

export function isGameplaySurfaceSnapshot(
  surface: BrowserInteractionSurfaceSnapshot,
): surface is BrowserInteractionSemanticSurfaceSnapshot<
  typeof GAMEPLAY_BROWSER_INTERACTION_SURFACE
> {
  return surface.surface === GAMEPLAY_BROWSER_INTERACTION_SURFACE;
}

export function isSemanticSurfaceSnapshot(
  surface: BrowserInteractionSurfaceSnapshot,
): surface is BrowserInteractionSemanticSurfaceSnapshot {
  return "interactions" in surface;
}

export function targetIdentityKey(input: {
  readonly surface: string;
  readonly scopeId: string;
  readonly interactionKey: string;
  readonly target: {
    readonly intent: string;
    readonly inputKey?: string;
    readonly candidateValueKey?: string;
    readonly actuatorKind?: BrowserInteractionActuatorKind;
  };
}): string {
  return createBrowserInteractionActuatorKey({
    surface: input.surface,
    scopeId: input.scopeId,
    interactionKey: input.interactionKey,
    intent: input.target.intent,
    inputKey: input.target.inputKey,
    candidateValueKey: input.target.candidateValueKey,
    actuatorKind: input.target.actuatorKind ?? "click",
  });
}

function pushSurfaceDiagnostic(
  surface: PendingSemanticSurface,
  all: BrowserInteractionDiagnostic[],
  diagnostic: BrowserInteractionDiagnostic,
) {
  surface.diagnostics.push(diagnostic);
  all.push(diagnostic);
}

function diagnosticFor(
  input: Omit<BrowserInteractionDiagnostic, "severity">,
): BrowserInteractionDiagnostic {
  return { severity: "error", ...input };
}

function text(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  key: string,
): string {
  const value = attributes[key];
  if (typeof value === "boolean") return value ? "true" : "false";
  return value ?? "";
}

function optionalText(
  attributes: Readonly<Record<string, string | boolean | null | undefined>>,
  key: string,
): string | undefined {
  const value = text(attributes, key);
  return value === "" ? undefined : value;
}

function parseReadiness(value: string): BrowserInteractionReadiness {
  return BROWSER_INTERACTION_READINESS_VALUES.includes(
    value as BrowserInteractionReadiness,
  )
    ? (value as BrowserInteractionReadiness)
    : "blocked";
}

function parseCandidateState(
  value: string | undefined,
): BrowserInteractionCandidateState | undefined {
  return BROWSER_INTERACTION_CANDIDATE_STATES.includes(
    value as BrowserInteractionCandidateState,
  )
    ? (value as BrowserInteractionCandidateState)
    : undefined;
}

function parseActuatorKind(value: string): BrowserInteractionActuatorKind {
  return parseOptionalActuatorKind(value) ?? "click";
}

function parseOptionalActuatorKind(
  value: string | undefined,
): BrowserInteractionActuatorKind | undefined {
  return BROWSER_INTERACTION_ACTUATOR_KINDS.includes(
    value as BrowserInteractionActuatorKind,
  )
    ? (value as BrowserInteractionActuatorKind)
    : undefined;
}

function parseEnabled(value: string | boolean | null | undefined): boolean {
  if (value === false || value === "false") return false;
  return true;
}

function compareSurface(
  a: BrowserInteractionSurfaceSnapshot,
  b: BrowserInteractionSurfaceSnapshot,
): number {
  return (
    a.surface.localeCompare(b.surface) || a.scopeId.localeCompare(b.scopeId)
  );
}

function compareActuator(
  a: BrowserInteractionActuator,
  b: BrowserInteractionActuator,
): number {
  return a.actuatorId.localeCompare(b.actuatorId);
}

function comparePointerTarget(
  a: BrowserInteractionPointerTarget,
  b: BrowserInteractionPointerTarget,
): number {
  return a.targetId.localeCompare(b.targetId);
}

function compareDiagnostic(
  a: BrowserInteractionDiagnostic,
  b: BrowserInteractionDiagnostic,
): number {
  return (
    a.code.localeCompare(b.code) ||
    (a.surface ?? "").localeCompare(b.surface ?? "") ||
    (a.scopeId ?? "").localeCompare(b.scopeId ?? "") ||
    (a.interactionKey ?? "").localeCompare(b.interactionKey ?? "") ||
    (a.intent ?? "").localeCompare(b.intent ?? "") ||
    (a.actuatorId ?? "").localeCompare(b.actuatorId ?? "") ||
    a.message.localeCompare(b.message)
  );
}
