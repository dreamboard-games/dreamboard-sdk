import { immutableCopy } from "./sources/immutable.js";
import { createStore } from "@tanstack/store";
import { inputValueInDomain } from "../shared/input-domain.js";
import type {
  InputDomainDescriptor,
  InputSelectionDescriptor,
} from "../reducer/model/spec/inputs.js";
import type { InteractionDescriptor as RoutingDescriptor } from "../runtime/types/plugin-state.js";
import {
  getInteractionDraftReadiness,
  routeInteractionTarget,
  routeCardInputIntent,
  shouldAutoSubmitInteraction,
} from "../runtime/utils/interaction-router.js";
import {
  isManyInput,
  isManyTargetSelectable,
} from "../runtime/utils/interaction-inputs.js";
import type { RuntimeJson } from "../shared/runtime-json.js";
import type {
  Features,
  FeatureContext,
  GameInstance,
  CoreInstance,
  InstanceOptions,
  ReadModel,
  GameSource,
  SourceState,
  SourceSnapshot,
  SubmitResult,
  InteractionDescriptor,
  InteractionInputDescriptor,
  NativeEvent,
  FieldEvent,
} from "./model.js";

type Values = Readonly<Record<string, RuntimeJson>>;
type DraftMap = Readonly<Record<string, Values | undefined>>;
type RuntimeOptions = InstanceOptions<unknown>;
const EMPTY: Values = Object.freeze({});
const EMPTY_DRAFTS: DraftMap = Object.freeze({});
const routeDescriptor = (value: InteractionDescriptor) =>
  value as RoutingDescriptor;
const routeInput = (value: InteractionInputDescriptor) =>
  value as RoutingDescriptor["inputs"][number];
const equalValue = (a: unknown, b: unknown) =>
  Object.is(a, b) ||
  (typeof a === "object" &&
    typeof b === "object" &&
    JSON.stringify(a) === JSON.stringify(b));
function inDomain(
  input: InteractionInputDescriptor,
  value: unknown,
  partial = false,
) {
  return inputValueInDomain(
    input.domain as InputDomainDescriptor,
    value,
    input.domain.selection as InputSelectionDescriptor | undefined,
    { ignoreMinimum: partial },
  );
}
function immutableValues(value: Values): Values {
  return immutableCopy(value);
}
function data(
  action: string,
  interaction: string,
  input?: string,
  value?: RuntimeJson,
) {
  return {
    "data-action": action,
    "data-interaction": interaction,
    ...(input ? { "data-input": input } : {}),
    ...(value === undefined
      ? {}
      : {
          "data-value":
            typeof value === "string" ? value : JSON.stringify(value),
        }),
  };
}
export class AmbiguousTargetError extends Error {
  constructor(id: string) {
    super(
      `Target '${id}' belongs to more than one interaction. Choose an interaction explicitly.`,
    );
    this.name = "AmbiguousTargetError";
  }
}

class InteractionObject {
  readonly key: string;
  readonly id: string;
  readonly phase: string;
  readonly label: string;
  readonly help?: string;
  readonly kind: "inputs" | "steps";
  readonly inputObjects: readonly InputObject[];
  readonly seat: number;
  readonly draft: Values;
  readonly draftIdentity: Values;
  readonly source: GameSource;
  readonly epoch: number;
  constructor(
    readonly owner: Controller,
    readonly descriptor: InteractionDescriptor,
    draft: Values,
    readonly status: "open" | "submitting" | "submitted",
    readonly connected: boolean,
  ) {
    this.seat =
      descriptor.actorSeat ??
      owner.sourceState.snapshot?.players.findIndex(
        (player) => player.playerId === owner.sourceState.snapshot?.me,
      ) ??
      -1;
    this.draftIdentity = draft;
    this.draft = immutableValues(draft);
    this.source = owner.options.source;
    this.epoch = owner.epoch;
    this.key = descriptor.interactionKey;
    this.id = descriptor.interactionId;
    this.phase = descriptor.phaseName;
    this.label = descriptor.label;
    this.help = descriptor.help;
    this.kind = descriptor.step ? "steps" : "inputs";
    this.inputObjects = Object.freeze(
      descriptor.inputs.map((input) =>
        owner.object("input", new InputObject(this, input)),
      ),
    );
  }
  get game() {
    return this.owner.instance;
  }
  getAvailability() {
    return this.descriptor.availability;
  }
  getIsAvailable() {
    return this.descriptor.availability.status === "available";
  }
  getUnavailableReason() {
    return this.descriptor.availability.status === "available"
      ? null
      : this.descriptor.availability.reason;
  }
  getStep() {
    return this.descriptor.step ?? null;
  }
  getStepIndex() {
    return this.descriptor.step?.index ?? null;
  }
  getInput(key: string) {
    return this.inputObjects.find((input) => input.key === key);
  }
  getInputs() {
    return this.inputObjects;
  }
  readiness() {
    const readiness = getInteractionDraftReadiness(
      routeDescriptor(this.descriptor),
      this.draft,
    );
    return {
      ...readiness,
      ready:
        readiness.ready &&
        this.descriptor.inputs.every((input) =>
          inDomain(input, readiness.values[input.key]),
        ),
    };
  }
  getIsReady() {
    return this.readiness().ready;
  }
  getMissingInputs() {
    return this.readiness().missingInputs;
  }
  getStatus() {
    return this.status;
  }
  currentLifetime() {
    return (
      this.source === this.owner.options.source &&
      this.epoch === this.owner.epoch &&
      !this.owner.disposed
    );
  }
  submit() {
    return this.currentLifetime()
      ? this.owner.submit(this.key, false)
      : Promise.resolve({ accepted: false as const, errorCode: "CLOSED" });
  }
  cancel() {
    return this.currentLifetime()
      ? this.owner.submit(this.key, true)
      : Promise.resolve({ accepted: false as const, errorCode: "CLOSED" });
  }
  reset() {
    if (this.currentLifetime()) this.owner.reset(this.key);
  }
  activate() {
    if (this.currentLifetime()) this.owner.activate(this.key);
  }
  getSubmitHandler() {
    return (event?: NativeEvent) => {
      event?.preventDefault();
      this.owner.handle(this.submit());
    };
  }
  getSubmitProps() {
    const disabled =
      !this.getIsAvailable() ||
      !this.getIsReady() ||
      this.status !== "open" ||
      !this.connected;
    return {
      ...data("submit", this.key),
      "data-seat": this.seat,
      type: "button" as const,
      disabled,
      "data-ready": this.getIsReady(),
      "data-disabled": disabled,
      onClick: this.getSubmitHandler(),
    };
  }
}
class InputObject {
  readonly key: string;
  readonly kind: string;
  constructor(
    readonly interaction: InteractionObject,
    readonly descriptor: InteractionInputDescriptor,
  ) {
    this.key = descriptor.key;
    this.kind = descriptor.kind;
  }
  get game() {
    return this.interaction.game;
  }
  getDomain() {
    return this.descriptor.domain;
  }
  getValue(): RuntimeJson | undefined {
    return (
      this.interaction.draft[this.key] ??
      (Object.hasOwn(this.interaction.draft, this.key)
        ? null
        : this.descriptor.defaultValue)
    );
  }
  setValue(value: RuntimeJson) {
    if (!this.interaction.currentLifetime()) return;
    this.interaction.owner.setInput(this.interaction.key, this.key, value);
  }
  clear() {
    if (!this.interaction.currentLifetime()) return;
    this.interaction.owner.clearInput(this.interaction.key, this.key);
  }
  getIsReady() {
    const descriptor = {
      ...this.interaction.descriptor,
      inputs: [this.descriptor],
    };
    return (
      getInteractionDraftReadiness(routeDescriptor(descriptor), {
        [this.key]: this.getValue(),
      }).ready && inDomain(this.descriptor, this.getValue())
    );
  }
  getEligibleTargets(): readonly RuntimeJson[] {
    const domain = this.descriptor.domain;
    if (Array.isArray(domain.eligibleTargets)) return domain.eligibleTargets;
    const choices = domain.choices;
    if (Array.isArray(choices))
      return choices
        .filter(
          (c) => c && typeof c === "object" && !Array.isArray(c) && !c.disabled,
        )
        .map((c) => (c as Record<string, RuntimeJson>).value);
    return [];
  }
  getIsEligible(value: RuntimeJson) {
    const input = this.descriptor;
    const selection = input.domain.selection;
    return (
      inDomain(
        { ...input, domain: { ...input.domain, selection: undefined } },
        value,
      ) &&
      (!selection ||
        selection.mode !== "many" ||
        isManyTargetSelectable(
          routeInput(input),
          this.getValue(),
          String(value),
        ))
    );
  }
  getIsSelected(value: RuntimeJson) {
    const current = this.getValue();
    return isManyInput(routeInput(this.descriptor)) && Array.isArray(current)
      ? current.some((item) => equalValue(item, value))
      : equalValue(current, value);
  }
  getSelectHandler(value: RuntimeJson) {
    return () => {
      if (this.interaction.currentLifetime())
        this.interaction.owner.select(this.interaction.key, this.key, value);
    };
  }
  getTargetProps(value: RuntimeJson) {
    const eligible = this.getIsEligible(value);
    const disabled =
      !eligible ||
      !this.interaction.getIsAvailable() ||
      this.interaction.status !== "open" ||
      !this.interaction.connected;
    return {
      ...data("select", this.interaction.key, this.key, value),
      "data-seat": this.interaction.seat,
      type: "button" as const,
      disabled,
      "data-eligible": eligible,
      "data-selected": this.getIsSelected(value),
      "data-disabled": disabled,
      onClick: () => this.getSelectHandler(value)(),
    };
  }
  getFieldProps() {
    const disabled =
      !this.interaction.getIsAvailable() ||
      this.interaction.status !== "open" ||
      !this.interaction.connected;
    return {
      ...data("option", this.interaction.key, this.key),
      "data-seat": this.interaction.seat,
      value: this.getValue() ?? "",
      disabled,
      "data-disabled": disabled,
      onChange: (event: FieldEvent) => {
        if (event.currentTarget.value === "") {
          this.clear();
          return;
        }
        this.setValue(
          this.descriptor.domain.type === "boundedNumber"
            ? Number(event.currentTarget.value)
            : event.currentTarget.value,
        );
      },
    };
  }
}
class CardObject {
  readonly epoch: number;
  readonly seat: number;
  readonly view: Readonly<Record<string, RuntimeJson>> | null;
  readonly hidden: boolean;
  constructor(
    readonly owner: Controller,
    readonly id: string,
    readonly zone: string,
    readonly index: number,
    encoded: string | undefined,
    readonly routes: readonly InteractionObject[],
  ) {
    this.epoch = owner.epoch;
    this.seat =
      owner.sourceState.snapshot?.players.findIndex(
        (player) => player.playerId === owner.sourceState.snapshot?.me,
      ) ?? -1;
    this.view = encoded
      ? immutableCopy(JSON.parse(encoded) as Record<string, RuntimeJson>)
      : null;
    this.hidden = this.view === null;
  }
  get game() {
    return this.owner.instance;
  }
  getInteractions() {
    return this.routes;
  }
  getIsEligible() {
    return this.routes.some((route) => route.getIsAvailable());
  }
  getIsSelected() {
    return this.routes.some((route) =>
      route
        .getInputs()
        .some(
          (input) =>
            input.descriptor.domain.type === "cardTarget" &&
            input.getIsSelected(this.id),
        ),
    );
  }
  getCanSelect() {
    return this.routes.some(
      (route) =>
        route.getIsAvailable() &&
        route.status === "open" &&
        route.connected &&
        route
          .getInputs()
          .some(
            (input) =>
              input.descriptor.domain.type === "cardTarget" &&
              input.getIsEligible(this.id),
          ),
    );
  }
  select(options?: { interaction?: string }) {
    if (this.epoch !== this.owner.epoch || this.owner.disposed) return;
    this.owner.selectCard(this.id, options?.interaction);
  }
  getSelectHandler(options?: { interaction?: string }) {
    return () => this.select(options);
  }
  getProps(options?: { interaction?: string }) {
    return {
      type: "button" as const,
      disabled: !this.getCanSelect(),
      "data-action": "select",
      "data-value": this.id,
      "data-interaction": options?.interaction,
      "data-eligible": this.getIsEligible(),
      "data-selected": this.getIsSelected(),
      "data-disabled": !this.getCanSelect(),
      "data-hidden": this.hidden,
      "data-seat": this.seat,
      onClick: this.getSelectHandler(options),
    };
  }
}
class ZoneObject {
  constructor(
    readonly owner: Controller,
    readonly id: string,
    readonly cards: readonly CardObject[],
  ) {}
  get game() {
    return this.owner.instance;
  }
  get count() {
    return this.cards.length;
  }
  getIsEmpty() {
    return this.count === 0;
  }
  getCard(id: string) {
    return this.cards.find((card) => card.id === id);
  }
  getCards(options?: { sort?: (a: CardObject, b: CardObject) => number }) {
    return options?.sort ? [...this.cards].sort(options.sort) : this.cards;
  }
}
class PlayerObject {
  readonly id: string;
  readonly name: string;
  readonly color?: string;
  constructor(
    readonly owner: Controller,
    summary: SourceSnapshot["players"][number],
    readonly index: number,
    readonly isMe: boolean,
    readonly active: boolean,
  ) {
    this.id = summary.playerId;
    this.name = summary.displayName;
    this.color = summary.color;
  }
  get game() {
    return this.owner.instance;
  }
}
class PhaseObject {
  constructor(readonly current: string | null) {}
  is(name: string) {
    return this.current === name;
  }
  switch<R>(routes: Record<string, () => R>): R | null {
    return this.current === null ? null : routes[this.current]();
  }
}

class Controller {
  epoch = 0;
  options: RuntimeOptions;
  localDrafts: DraftMap;
  localActive: string | null;
  disposed = false;
  readonly instance: CoreInstance<unknown>;
  readonly store: ReturnType<typeof createStore<ReadModel<unknown>>>;
  readonly prototypes = {
    interaction: Object.create(InteractionObject.prototype) as object,
    input: Object.create(InputObject.prototype) as object,
    card: Object.create(CardObject.prototype) as object,
    zone: Object.create(ZoneObject.prototype) as object,
    board: {},
  };
  subscription: { unsubscribe(): void } | undefined;
  sourceState: SourceState;
  pending: {
    source: GameSource;
    key: string;
    draft: Values;
    revision: number;
    version: number;
    epoch: number;
    accepted: boolean;
    cancel: boolean;
  } | null = null;
  building: ReadModel<unknown> | undefined;
  rootProperties = new Map<PropertyKey, PropertyDescriptor>();
  featureDisposals: (() => void)[] = [];
  warned = new Set<string>();
  invalidControlledState: RuntimeOptions["state"] | undefined;
  observed = new Set<string>();
  revisions = new Map<string, number>();
  lastDrafts: DraftMap = EMPTY_DRAFTS;
  lastInteractions: readonly InteractionObject[] = [];
  lastSnapshotDrafts: DraftMap | undefined;
  trackDrafts() {
    const drafts = this.drafts();
    for (const key of new Set([
      ...Object.keys(this.lastDrafts),
      ...Object.keys(drafts),
    ]))
      if (this.lastDrafts[key] !== drafts[key])
        this.revisions.set(key, (this.revisions.get(key) ?? 0) + 1);
    this.lastDrafts = drafts;
  }
  constructor(
    options: RuntimeOptions,
    features?: (
      core: CoreInstance<unknown>,
      context: FeatureContext<unknown>,
    ) => Features,
  ) {
    this.options = options;
    this.localDrafts =
      (options.initialState?.drafts as DraftMap) ?? EMPTY_DRAFTS;
    this.localActive = options.initialState?.activeInteraction ?? null;
    this.sourceState = options.source.store.get();
    const root = {
      getSnapshot: () => this.building ?? this.store.get(),
      getOptions: () => this.options,
      setOptions: (next: RuntimeOptions) => this.setOptions(next),
      subscribe: (listener: () => void) => {
        const sub = this.store.subscribe(listener);
        return () => sub.unsubscribe();
      },
      dispose: () => this.dispose(),
      assertCoverage: () => this.assertCoverage(),
      inspect: () => this.store.get(),
    };
    this.instance = root as CoreInstance<unknown>;
    for (const key of [
      "snapshot",
      "view",
      "version",
      "connection",
      "request",
      "state",
      "phase",
      "turn",
      "me",
      "players",
      "interactions",
      "inputs",
      "zones",
      "cards",
      "events",
    ] as const)
      Object.defineProperty(root, key, {
        get: () => (this.building ?? this.store.get())[key],
      });
    this.store = createStore(Object.freeze(this.build()));
    Object.defineProperty(root, "store", {
      value: {
        get: () => this.store.get(),
        subscribe: (listener: () => void) => this.store.subscribe(listener),
      },
    });
    if ("apply" in options.source)
      Object.defineProperty(root, "apply", {
        value: (action: unknown) =>
          (
            this.options.source as GameSource & {
              apply(action: unknown): unknown;
            }
          ).apply(action),
      });
    if ("explore" in options.source)
      Object.defineProperty(root, "explore", {
        value: (...args: unknown[]) =>
          (
            this.options.source as GameSource & {
              explore(...args: unknown[]): unknown;
            }
          ).explore(...args),
      });
    const context: FeatureContext<unknown> = {
      createBoard: (id, data) =>
        this.object("board", {
          id,
          data: immutableCopy(data),
          game: this.instance,
        }),
      routeTarget: (kind, id, options) =>
        this.routeTarget(kind, id, options?.interaction, options?.boardId),
      routeCardDrop: (cardId, target) => this.routeCardDrop(cardId, target),
      invalidate: () => {
        if (!this.disposed) this.refresh();
      },
    };
    for (const feature of Object.values(
      features?.(this.instance, context) ?? {},
    )) {
      if (feature.root)
        for (const key of Reflect.ownKeys(feature.root)) {
          if (key in root || this.rootProperties.has(key))
            throw new Error(`Overlapping feature property '${String(key)}'.`);
          this.rootProperties.set(
            key,
            Object.getOwnPropertyDescriptor(feature.root, key)!,
          );
          Object.defineProperty(root, key, {
            get: () => Reflect.get(this.building ?? this.store.get(), key),
          });
        }
      for (const hook of [
        "interaction",
        "input",
        "zone",
        "card",
        "board",
      ] as const)
        this.install(this.prototypes[hook], feature[hook]);
      if (feature.dispose) this.featureDisposals.push(feature.dispose);
    }
    this.refresh();
    this.subscribeSource();
  }
  install(target: object, extension: object | undefined) {
    if (!extension) return;
    for (const key of Reflect.ownKeys(extension)) {
      if (
        key in target ||
        [
          "game",
          "owner",
          "descriptor",
          "draft",
          "inputObjects",
          "status",
          "connected",
          "key",
          "id",
          "phase",
          "label",
          "help",
          "kind",
          "interaction",
          "view",
          "hidden",
          "zone",
          "index",
          "routes",
          "cards",
        ].includes(String(key))
      )
        throw new Error(`Overlapping feature property '${String(key)}'.`);
    }
    Object.defineProperties(
      target,
      Object.getOwnPropertyDescriptors(extension),
    );
  }
  object<T extends object>(hook: keyof Controller["prototypes"], value: T): T {
    return Object.freeze(Object.setPrototypeOf(value, this.prototypes[hook]));
  }
  drafts() {
    if (
      this.options.state &&
      this.options.state === this.invalidControlledState
    )
      return EMPTY_DRAFTS;
    return (this.options.state?.drafts as DraftMap) ?? this.localDrafts;
  }
  active() {
    if (
      this.options.state &&
      this.options.state === this.invalidControlledState
    )
      return null;
    return this.options.state?.activeInteraction !== undefined
      ? this.options.state.activeInteraction
      : this.localActive;
  }
  writeDrafts(next: DraftMap) {
    if (this.options.state?.drafts === undefined) this.localDrafts = next;
    this.options.onDraftsChange?.(next);
    this.refresh();
  }
  writeDraft(key: string, value: Values | undefined) {
    const drafts = this.drafts();
    const next = { ...drafts };
    if (value === undefined) delete next[key];
    else next[key] = immutableValues(value);
    this.writeDrafts(Object.freeze(next));
  }
  activate(key: string | null) {
    if (this.disposed || (key !== null && !this.current(key))) return;
    if (this.options.state?.activeInteraction === undefined)
      this.localActive = key;
    this.options.onActiveInteractionChange?.(key);
    this.refresh();
  }
  descriptorFor(base: InteractionDescriptor, draft: Values) {
    const zones = this.sourceState.snapshot?.frame.zones ?? {};
    for (const input of base.inputs) {
      const card = draft[input.key];
      if (input.domain.type !== "cardTarget" || typeof card !== "string")
        continue;
      for (const zone of Object.values(zones)) {
        const route = zone.playableByCardId[card]?.find(
          (value) => value.interactionKey === base.interactionKey,
        );
        if (route) return route;
      }
    }
    return base;
  }
  current(key: string) {
    return this.store.get().interactions.get(key) as unknown as
      | InteractionObject
      | undefined;
  }
  editable(key: string) {
    const interaction = this.current(key);
    return !this.disposed &&
      this.sourceState.connection === "ready" &&
      !this.sourceState.request &&
      interaction?.getIsAvailable()
      ? interaction
      : undefined;
  }
  setInput(key: string, inputKey: string, value: RuntimeJson) {
    const interaction = this.editable(key);
    if (!interaction?.getInput(inputKey)) return;
    this.writeDraft(key, { ...this.drafts()[key], [inputKey]: value });
  }
  clearInput(key: string, inputKey: string) {
    if (!this.editable(key)?.getInput(inputKey)) return;
    const value = { ...this.drafts()[key] };
    delete value[inputKey];
    this.writeDraft(key, value);
  }
  reset(key: string) {
    if (this.disposed) return;
    this.writeDraft(key, undefined);
    if (this.active() === key) this.activate(null);
  }
  select(
    key: string,
    inputKey: string,
    value: RuntimeJson,
    route?: InteractionObject,
  ) {
    const interaction = route ?? this.editable(key);
    if (
      route &&
      (!route.currentLifetime() ||
        !route.getIsAvailable() ||
        this.sourceState.connection !== "ready" ||
        this.sourceState.request ||
        this.pending)
    )
      return;
    const input = interaction?.getInput(inputKey);
    if (!interaction || !input?.getIsEligible(value)) return;
    if (
      typeof value === "string" &&
      (input.descriptor.domain.type === "cardTarget" ||
        input.descriptor.domain.type === "boardTarget")
    ) {
      let next: Record<string, unknown> = { ...this.drafts()[key] };
      routeInteractionTarget(
        {
          getDraft: () => next,
          setInput: (_key, k, v) => {
            next = { ...next, [k]: v };
          },
          clearInput: (_key, k) => {
            if (k) delete next[k];
          },
        },
        routeDescriptor(interaction.descriptor),
        { inputKey, value },
      );
      this.writeDraft(key, next as Values);
    } else this.setInput(key, inputKey, value);
    this.activate(key);
    const current = this.current(key);
    if (
      current &&
      Object.hasOwn(this.drafts()[key] ?? EMPTY, inputKey) &&
      shouldAutoSubmitInteraction(routeDescriptor(current.descriptor)) &&
      current.getIsReady()
    )
      this.handle(this.submit(key, false));
  }
  selectCard(id: string, explicit?: string) {
    const card = this.store.get().cards.get(id) as unknown as
      | CardObject
      | undefined;
    if (!card) return;
    let routes = card.routes.filter(
      (route) =>
        route.getIsAvailable() &&
        route.currentLifetime() &&
        !this.sourceState.request &&
        this.sourceState.connection === "ready" &&
        route
          .getInputs()
          .some(
            (input) =>
              input.descriptor.domain.type === "cardTarget" &&
              input.getIsEligible(id),
          ),
    );
    if (explicit) routes = routes.filter((route) => route.key === explicit);
    if (routes.length > 1) throw new AmbiguousTargetError(id);
    const route = routes[0];
    const input = route
      ?.getInputs()
      .find(
        (input) =>
          input.descriptor.domain.type === "cardTarget" &&
          input.getIsEligible(id),
      );
    if (route && input) this.select(route.key, input.key, id, route);
  }
  handle(promise: Promise<unknown>) {
    void promise.catch((error) => this.options.onError?.(error));
  }
  async submit(key: string, cancel: boolean): Promise<SubmitResult> {
    const source = this.options.source;
    const interaction = this.current(key);
    if (
      this.disposed ||
      this.sourceState.connection !== "ready" ||
      this.sourceState.request ||
      this.pending
    )
      return { accepted: false, errorCode: "BUSY" };
    if (!interaction) return { accepted: false, errorCode: "UNAVAILABLE" };
    if (
      cancel
        ? !interaction.getStep()?.canCancel
        : !interaction.getIsAvailable() || !interaction.getIsReady()
    )
      return { accepted: false, errorCode: "UNAVAILABLE" };
    if (!("submit" in source) || !("cancel" in source))
      return { accepted: false, errorCode: "READ_ONLY" };
    const commandSource = source as GameSource & {
      submit(id: string, params: RuntimeJson): Promise<SubmitResult>;
      cancel(id: string): Promise<SubmitResult>;
    };
    const operation = {
      source,
      key,
      draft: this.drafts()[key] ?? EMPTY,
      revision: this.revisions.get(key) ?? 0,
      version: this.sourceState.snapshot!.version,
      epoch: this.epoch,
      accepted: false,
      cancel,
    };
    this.pending = operation;
    try {
      const result = await (cancel
        ? commandSource.cancel(interaction.id)
        : commandSource.submit(
            interaction.id,
            interaction.readiness().values as RuntimeJson,
          ));
      if (this.pending !== operation) return result;
      if (!result.accepted) {
        this.pending = null;
        this.refresh();
        return result;
      }
      operation.accepted = true;
      this.finishBarrier();
      return result;
    } catch (error) {
      if (this.pending === operation) {
        this.pending = null;
        this.refresh();
      }
      throw error;
    }
  }
  finishBarrier() {
    const operation = this.pending;
    if (
      !operation?.accepted ||
      this.sourceState.request ||
      operation.source !== this.options.source ||
      operation.epoch !== this.epoch
    )
      return;
    if (this.sourceState.connection === "closed") {
      this.pending = null;
      this.refresh();
      return;
    }
    if (
      this.sourceState.connection !== "ready" ||
      (this.sourceState.snapshot?.version ?? -1) <= operation.version
    )
      return;
    this.pending = null;
    if ((this.revisions.get(operation.key) ?? 0) === operation.revision)
      this.reset(operation.key);
    else this.refresh();
  }
  subscribeSource() {
    const source = this.options.source;
    this.subscription = source.store.subscribe(() => {
      if (this.disposed || this.options.source !== source) return;
      const next = source.store.get();
      const previousSnapshot = this.sourceState.snapshot;
      this.sourceState = next;
      if (
        previousSnapshot &&
        next.snapshot &&
        previousSnapshot.me !== next.snapshot.me
      ) {
        this.epoch++;
        this.invalidControlledState = this.options.state;
        this.pending = null;
        this.localDrafts = EMPTY_DRAFTS;
        this.localActive = null;
        this.options.onDraftsChange?.({});
        this.options.onActiveInteractionChange?.(null);
      }
      this.reconcile();
      this.refresh();
      this.finishBarrier();
    });
  }
  setOptions(next: RuntimeOptions) {
    if (this.disposed) throw new Error("Game instance is disposed.");
    const changed = next.source !== this.options.source;
    if (changed) {
      this.epoch++;
      this.subscription?.unsubscribe();
      this.options.source.dispose();
      this.pending = null;
    }
    this.options = next;
    if (changed) {
      this.invalidControlledState = next.state;
      this.localDrafts = EMPTY_DRAFTS;
      this.localActive = null;
      this.sourceState = next.source.store.get();
      this.options.onDraftsChange?.({});
      this.options.onActiveInteractionChange?.(null);
      this.subscribeSource();
    }
    this.reconcile();
    this.refresh();
  }
  reconcile() {
    const snapshot = this.sourceState.snapshot;
    if (!snapshot) return;
    const drafts = this.drafts();
    let changed = false;
    const next: Record<string, Values | undefined> = { ...drafts };
    for (const [key, values] of Object.entries(drafts)) {
      if (!values) continue;
      const base = snapshot.frame.availableInteractions.find(
        (value) => value.interactionKey === key,
      );
      if (!base) {
        if (this.pending?.key !== key) {
          delete next[key];
          changed = true;
        }
        continue;
      }
      const descriptor = this.descriptorFor(base, values);
      const kept = { ...values };
      let fieldChanged = false;
      for (const [name, value] of Object.entries(values)) {
        const input = descriptor.inputs.find((input) => input.key === name);
        if (!input && this.pending?.key === key) continue;
        if (input?.domain.selection?.mode === "many" && Array.isArray(value)) {
          const eligible = value.filter((item) =>
            inputValueInDomain(input.domain as InputDomainDescriptor, item),
          );
          const max = input.domain.selection.max;
          const retained =
            max === undefined ? eligible : eligible.slice(0, max);
          if (retained.length !== value.length) {
            kept[name] = retained;
            changed = true;
            fieldChanged = true;
          }
          continue;
        }
        if (!input || !inDomain(input, value, true)) {
          delete kept[name];
          changed = true;
          fieldChanged = true;
        }
      }
      if (fieldChanged) next[key] = immutableValues(kept);
    }
    if (changed) this.writeDrafts(Object.freeze(next));
    const active = this.active();
    if (
      active &&
      !snapshot.frame.availableInteractions.some(
        (value) => value.interactionKey === active,
      )
    )
      this.activate(null);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.featureDisposals.forEach((dispose) => dispose());
    this.subscription?.unsubscribe();
    this.pending = null;
    this.options.source.dispose();
    this.sourceState = {
      ...this.sourceState,
      connection: "closed",
      request: null,
    };
    this.refresh();
  }
  assertCoverage() {
    const missing =
      this.sourceState.snapshot?.frame.availableInteractions
        .filter(
          (d) =>
            d.availability.status === "available" &&
            !this.observed.has(d.interactionKey),
        )
        .map((d) => d.interactionKey) ?? [];
    if (missing.length)
      throw new Error(`Interactions not read: ${missing.join(", ")}`);
  }
  routeTarget(kind: string, id: string, explicit?: string, boardId?: string) {
    if (kind === "card") {
      this.selectCard(id, explicit);
      return;
    }
    const candidates = this.lastInteractions.flatMap((interaction) =>
      interaction
        .getInputs()
        .filter(
          (input) =>
            input.descriptor.domain.type === "boardTarget" &&
            (input.descriptor.domain.targetKind === kind ||
              (kind === "space" &&
                input.descriptor.domain.targetKind === "tile")) &&
            (!boardId || input.descriptor.domain.boardId === boardId) &&
            input.getIsEligible(id) &&
            interaction.getIsAvailable() &&
            (!explicit || interaction.key === explicit),
        )
        .map((input) => ({ interaction, input })),
    );
    if (candidates.length > 1) throw new AmbiguousTargetError(id);
    const match = candidates[0];
    if (match) this.select(match.interaction.key, match.input.key, id);
  }
  routeCardDrop(
    cardId: string,
    target: {
      kind: string;
      id: string;
      boardId?: string;
      interaction?: string;
    },
  ) {
    if (
      this.disposed ||
      this.sourceState.request ||
      this.pending ||
      this.sourceState.connection !== "ready"
    )
      return;
    const card = this.store.get().cards.get(cardId) as unknown as
      | CardObject
      | undefined;
    if (!card) return;
    const candidates = card.routes.flatMap((interaction) => {
      if (
        !interaction.getIsAvailable() ||
        (target.interaction && interaction.key !== target.interaction)
      )
        return [];
      const cardInput = interaction
        .getInputs()
        .find(
          (input) =>
            input.descriptor.domain.type === "cardTarget" &&
            input.getIsEligible(cardId),
        );
      if (!cardInput) return [];
      return interaction
        .getInputs()
        .filter(
          (input) =>
            input.descriptor.domain.type === "boardTarget" &&
            (input.descriptor.domain.targetKind === target.kind ||
              (target.kind === "space" &&
                input.descriptor.domain.targetKind === "tile")) &&
            (!target.boardId ||
              input.descriptor.domain.boardId === target.boardId) &&
            input.getIsEligible(target.id),
        )
        .map((input) => ({ interaction, cardInput, input }));
    });
    if (candidates.length > 1) throw new AmbiguousTargetError(target.id);
    const candidate = candidates[0];
    if (!candidate) return;
    const { interaction, cardInput, input } = candidate;
    let next: Record<string, unknown> = { ...this.drafts()[interaction.key] };
    routeCardInputIntent(
      {
        getDraft: () => next,
        setInput: (_key, key, value) => {
          next = { ...next, [key]: value };
        },
        clearInput: (_key, key) => {
          if (key) delete next[key];
        },
      },
      routeDescriptor(interaction.descriptor),
      {
        cardId,
        cardInputKey: cardInput.key,
        dropTarget: { inputKey: input.key, value: target.id },
      },
    );
    this.writeDraft(interaction.key, next as Values);
    this.activate(interaction.key);
    const current = this.current(interaction.key);
    if (
      current &&
      shouldAutoSubmitInteraction(routeDescriptor(current.descriptor)) &&
      current.getIsReady()
    )
      this.handle(current.submit());
  }
  warnUnread() {
    const environment =
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV ??
      (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
        ?.NODE_ENV === "development";
    if (!(this.options.debug ?? environment)) return;
    queueMicrotask(() => {
      if (this.disposed) return;
      for (const descriptor of this.sourceState.snapshot?.frame
        .availableInteractions ?? []) {
        const key = descriptor.interactionKey;
        if (
          descriptor.availability.status === "available" &&
          !this.observed.has(key) &&
          !this.warned.has(key)
        ) {
          this.warned.add(key);
          console.warn(`Available interaction '${key}' has not been read.`);
        }
      }
    });
  }
  build(previous?: ReadModel<unknown>): ReadModel<unknown> {
    this.trackDrafts();
    const { snapshot, connection, request } = this.sourceState;
    const old = previous?.snapshot;
    const drafts = this.drafts();
    const active = this.active();
    const sameSnapshot = snapshot === old;
    const sameActors = sameSnapshot;
    const summaries = snapshot?.players ?? [];
    const activeIds = snapshot?.frame.flow.activePlayers ?? [];
    const playerObjects =
      sameActors && previous
        ? previous.players.getAll()
        : Object.freeze(
            summaries.map((player, index) =>
              Object.freeze(
                new PlayerObject(
                  this,
                  player,
                  index,
                  player.playerId === snapshot?.me,
                  activeIds.includes(player.playerId),
                ),
              ),
            ),
          );
    const players =
      sameActors && previous
        ? previous.players
        : {
            order: Object.freeze(playerObjects.map((p) => p.id)),
            get: (id: string) => playerObjects.find((p) => p.id === id),
            getAll: () => playerObjects,
            next: (id: string) => {
              const index = playerObjects.findIndex((p) => p.id === id);
              return index < 0
                ? undefined
                : playerObjects[(index + 1) % playerObjects.length];
            },
          };
    const me =
      sameActors && previous
        ? previous.me
        : snapshot
          ? {
              id: snapshot.me,
              player: players.get(snapshot.me)!,
              getCanAct: () =>
                snapshot.frame.availableInteractions.some(
                  (value) => value.availability.status === "available",
                ),
            }
          : null;
    const descriptors = snapshot?.frame.availableInteractions ?? [];
    const interactionObjects = descriptors.map((base) => {
      const key = base.interactionKey;
      const draft = drafts[key] ?? EMPTY;
      const descriptor = this.descriptorFor(base, draft);
      const status =
        request || this.pending
          ? request?.interactionId === descriptor.interactionId &&
            request.phase === "awaiting-frame"
            ? "submitted"
            : "submitting"
          : "open";
      const oldObject = this.lastInteractions.find(
        (value) => value.key === key,
      );
      return oldObject?.descriptor === descriptor &&
        oldObject.epoch === this.epoch &&
        oldObject.source === this.options.source &&
        oldObject.draftIdentity === draft &&
        oldObject.status === status &&
        oldObject.connected === (connection === "ready")
        ? oldObject
        : this.object(
            "interaction",
            new InteractionObject(
              this,
              descriptor,
              draft,
              status,
              connection === "ready",
            ),
          );
    });
    const interactionsSame =
      previous &&
      interactionObjects.length === this.lastInteractions.length &&
      interactionObjects.every(
        (value, index) => value === this.lastInteractions[index],
      );
    this.lastInteractions = Object.freeze(interactionObjects);
    const interactions = interactionsSame
      ? previous.interactions
      : {
          get: (key: string) => {
            this.observed.add(key);
            return interactionObjects.find((value) => value.key === key);
          },
          list: () => {
            interactionObjects.forEach((value) => this.observed.add(value.key));
            return Object.freeze(interactionObjects);
          },
          listAvailable: () => {
            const available = interactionObjects.filter((value) =>
              value.getIsAvailable(),
            );
            available.forEach((value) => this.observed.add(value.key));
            return Object.freeze(available);
          },
        };
    const inputs =
      interactionsSame && previous
        ? previous.inputs
        : {
            get: (key: string, name: string) =>
              interactions.get(key)?.getInput(name),
          };
    const zonesSame = sameSnapshot && interactionsSame && previous;
    const zones = zonesSame
      ? previous.zones
      : (() => {
          const objects = Object.entries(snapshot?.frame.zones ?? {}).map(
            ([id, zone]) =>
              this.object(
                "zone",
                new ZoneObject(
                  this,
                  id,
                  Object.freeze(
                    zone.cardIds.map((cardId, index) =>
                      this.object(
                        "card",
                        new CardObject(
                          this,
                          cardId,
                          id,
                          index,
                          zone.cardViewsById[cardId],
                          Object.freeze(
                            (zone.playableByCardId[cardId] ?? []).map(
                              (descriptor) =>
                                this.object(
                                  "interaction",
                                  new InteractionObject(
                                    this,
                                    descriptor,
                                    drafts[descriptor.interactionKey] ?? EMPTY,
                                    request || this.pending
                                      ? "submitting"
                                      : "open",
                                    connection === "ready",
                                  ),
                                ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          );
          return {
            get: (id: string) => objects.find((zone) => zone.id === id),
            getAll: () => Object.freeze(objects),
          };
        })();
    const cards = zonesSame
      ? previous.cards
      : {
          get: (id: string) =>
            zones
              .getAll()
              .map((zone) => zone.getCard(id))
              .find((card) => card !== undefined),
        };
    const capturedState =
      this.lastSnapshotDrafts === drafts &&
      previous?.state.activeInteraction === active
        ? previous.state
        : immutableCopy({ drafts, activeInteraction: active });
    this.lastSnapshotDrafts = drafts;
    for (const value of [players, me, interactions, inputs, zones, cards])
      if (value) Object.freeze(value);
    const model = {
      snapshot,
      view: snapshot?.frame.view ?? null,
      version: snapshot?.version ?? null,
      connection,
      request,
      state: capturedState,
      phase:
        sameSnapshot && previous
          ? previous.phase
          : Object.freeze(
              new PhaseObject(snapshot?.frame.flow.currentPhase ?? null),
            ),
      turn:
        sameSnapshot && previous
          ? previous.turn
          : Object.freeze({
              activePlayerIds: activeIds,
              currentPlayerId: activeIds.length === 1 ? activeIds[0] : null,
              order: players.order,
              isMine: snapshot ? activeIds.includes(snapshot.me) : false,
            }),
      me,
      players,
      interactions,
      inputs,
      zones,
      cards,
      events:
        sameSnapshot && previous
          ? previous.events
          : Object.freeze({
              recent: snapshot?.frame.events ?? Object.freeze([]),
            }),
    } as unknown as ReadModel<unknown>;
    this.building = model;
    try {
      for (const [key, descriptor] of this.rootProperties)
        Object.defineProperty(model, key, {
          value: descriptor.get
            ? descriptor.get.call(this.instance)
            : descriptor.value,
          enumerable: true,
        });
    } finally {
      this.building = undefined;
    }
    return model;
  }
  refresh() {
    if (!this.store) return;
    this.store.setState((previous) => Object.freeze(this.build(previous)));
    this.warnUnread();
  }
}
export function createGameInstance<G>() {
  return function <
    const F extends Features = Record<never, never>,
    S extends GameSource = GameSource,
  >(
    options: InstanceOptions<G, S> & {
      features?: (core: CoreInstance<G>, context: FeatureContext<G>) => F;
    },
  ): GameInstance<G, F, S> {
    const controller = new Controller(
      options as RuntimeOptions,
      options.features as
        | ((
            core: CoreInstance<unknown>,
            context: FeatureContext<unknown>,
          ) => Features)
        | undefined,
    );
    return controller.instance as unknown as GameInstance<G, F, S>;
  };
}
