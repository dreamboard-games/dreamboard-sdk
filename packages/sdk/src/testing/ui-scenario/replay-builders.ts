import {
  digestUIFixtureRequest,
  type PortableSemanticReplayStep,
  type UIResolvedReplayIdentity,
  type UIScenarioReplayStep,
  type UIStepExpectation,
} from "../ui-fixture/index.js";

type ReplayRequest = PortableSemanticReplayStep["resolve"];
type DragTarget = Extract<
  PortableSemanticReplayStep["execute"],
  { kind: "drag" }
>["target"];

interface ReplayStepOptions {
  readonly stepId: string;
  readonly resolve: ReplayRequest;
  readonly expect: UIStepExpectation;
  readonly expectedIdentity?: UIResolvedReplayIdentity;
}

interface FillReplayStepOptions extends ReplayStepOptions {
  readonly value: string;
}

interface DragReplayStepOptions extends ReplayStepOptions {
  readonly target: DragTarget;
}

function semanticStep(
  options: ReplayStepOptions,
  execute: Exclude<UIScenarioReplayStep, { kind: "assert" }>["execute"],
): UIScenarioReplayStep {
  return {
    stepId: options.stepId,
    requestDigest: digestUIFixtureRequest(options.resolve),
    resolve: options.resolve,
    execute,
    expectedIdentity: options.expectedIdentity,
    expect: options.expect,
  };
}

export function activate(options: ReplayStepOptions): UIScenarioReplayStep {
  return semanticStep(options, { kind: "activate" });
}

export function fill(options: FillReplayStepOptions): UIScenarioReplayStep {
  return semanticStep(options, { kind: "fill", value: options.value });
}

export function press(options: ReplayStepOptions): UIScenarioReplayStep {
  return activate(options);
}

export function drag(options: DragReplayStepOptions): UIScenarioReplayStep {
  return semanticStep(options, { kind: "drag", target: options.target });
}

export function submit(options: ReplayStepOptions): UIScenarioReplayStep {
  return activate(options);
}

export function assertStep(
  stepId: string,
  expect: UIStepExpectation,
): UIScenarioReplayStep {
  return {
    stepId,
    kind: "assert",
    expect,
  };
}
