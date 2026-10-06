import { BoardProjectionSchema } from "../shared/board-topology-schema.js";
import type { BoardTopology } from "../shared/board-topology.js";
import type { ViewCard } from "../shared/domain/cards.js";
import {
  runtimeFeatures,
  type RuntimeFeatureContext,
  type RuntimeCollection,
} from "./runtime-features.js";
import type { ReadonlyData } from "./model.js";
import { createInputControl } from "./input-control.js";
import { requireLookup } from "../shared/lookup.js";
import type {
  RuntimeBoardTarget,
  RuntimeSelectionTarget,
  RuntimeTargetOptions,
  RuntimeDropTarget,
} from "./targets.js";
import { immutableCopy } from "./sources/immutable.js";
import { createStore } from "@tanstack/store";
import {
  inputTargetInDomain,
  inputValueKey,
  inputValueInDomain,
} from "../shared/input-domain.js";
import {
  getInteractionDraftReadiness,
  routeInteractionTarget,
  routeCardInputIntent,
  shouldAutoSubmitInteraction,
} from "./interaction-router.js";
import {
  inputSelection,
  isManyInput,
  isManyTargetSelectable,
} from "./interaction-inputs.js";
import type { RuntimeJson } from "../shared/runtime-json.js";
import type {
  Features,
  FeatureContext,
  GameInstance,
  CoreInstance,
  InstanceOptions,
  GameSource,
  SourceState,
  SourceSnapshot,
  SubmitResult,
  InteractionDescriptor,
  InteractionInputDescriptor,
  NativeEvent,
} from "./model.js";

type Values = Readonly<Record<string, RuntimeJson>>;
type DraftMap = Readonly<Record<string, Values | undefined>>;
type RuntimeLocalState = { drafts: DraftMap; activeInteraction: string | null };
/** Concrete controller options; game-specific keys are bound by createGameInstance. */
type RuntimeOptions = {
  readonly source: GameSource;
  readonly initialState?: Partial<RuntimeLocalState>;
  readonly state?: Partial<RuntimeLocalState>;
  readonly onDraftsChange?: (drafts: DraftMap) => void;
  readonly onActiveInteractionChange?: (key: string | null) => void;
  readonly onError?: (error: unknown) => void;
  readonly coverage?: Readonly<Record<string, unknown>>;
  readonly debug?: boolean;
};
const EMPTY: Values = Object.freeze({});
const EMPTY_DRAFTS: DraftMap = Object.freeze({});
const equalValue = (a: unknown, b: unknown) =>
  Object.is(a, b) ||
  (typeof a === "object" &&
    typeof b === "object" &&
    inputValueKey(a) === inputValueKey(b));
function inDomain(
  input: InteractionInputDescriptor,
  value: unknown,
  partial = false,
) {
  return inputValueInDomain(input.domain, value, input.domain.selection, {
    ignoreMinimum: partial,
  });
}
function matchesBoardTarget(
  input: InteractionInputDescriptor,
  target: RuntimeBoardTarget,
) {
  const domain = input.domain;
  return (
    domain.type === "boardTarget" &&
    domain.valueKind === target.valueKind &&
    (domain.targetKind === target.kind ||
      (target.kind === "space" && domain.targetKind === "tile")) &&
    (domain.valueKind === "board-id" && target.valueKind === "board-id"
      ? domain.boardId === target.boardId
      : domain.valueKind === "board-space" &&
        target.valueKind === "board-space" &&
        domain.eligibleTargets.some(
          (candidate) => candidate.boardId === target.value.boardId,
        ))
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
      `Target '${id}' belongs to more than one eligible input. Choose an interaction and input explicitly.`,
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
    return requireLookup(
      this.findInput(key),
      `Input in interaction ${this.key}`,
      key,
    );
  }
  findInput(key: string) {
    return this.inputObjects.find((input) => input.key === key);
  }
  getInputs() {
    return this.inputObjects;
  }
  readiness() {
    return getInteractionDraftReadiness(this.descriptor, this.draft);
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
      this.owner.handle(() => this.submit());
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
  readonly kind: InteractionInputDescriptor["kind"];
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
  get domainType() {
    return this.descriptor.domain.type;
  }
  get selectionMode() {
    return isManyInput(this.descriptor) ? "many" : "single";
  }
  getTargetOptions() {
    const domain = this.getDomain();
    return this.getEligibleTargets().map((value) => ({
      value,
      label:
        (domain.type === "choice" || domain.type === "choiceList"
          ? domain.choices.find((choice) => Object.is(choice.value, value))
              ?.label
          : undefined) ??
        (value === null
          ? "None"
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value)),
      selected: this.getIsSelected(value),
      props: this.getTargetProps(value),
    }));
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
    return getInteractionDraftReadiness(descriptor, {
      [this.key]: this.getValue(),
    }).ready;
  }
  getEligibleTargets(): readonly RuntimeJson[] {
    const domain = this.descriptor.domain;
    if (domain.type === "cardTarget" || domain.type === "boardTarget")
      return domain.eligibleTargets;
    if (domain.type === "choice" || domain.type === "choiceList")
      return domain.choices
        .filter((choice) => !choice.disabled)
        .map((choice) => choice.value);
    return [];
  }
  getIsEligible(value: RuntimeJson) {
    const input = this.descriptor;
    return (
      inputTargetInDomain(input.domain, value) &&
      isManyTargetSelectable(input, this.getValue(), value)
    );
  }
  getIsSelected(value: RuntimeJson) {
    const current = this.getValue();
    return isManyInput(this.descriptor) && Array.isArray(current)
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
  getControl() {
    const disabled =
      !this.interaction.getIsAvailable() ||
      this.interaction.status !== "open" ||
      !this.interaction.connected;
    return createInputControl(this, {
      ...data("option", this.interaction.key, this.key),
      "data-seat": this.interaction.seat,
      disabled,
      "data-disabled": disabled,
    });
  }
}
class CardObject {
  readonly epoch: number;
  readonly seat: number;
  readonly view: ReadonlyData<ViewCard> | null;
  readonly hidden: boolean;
  readonly backImage: string | null;
  constructor(
    readonly owner: Controller,
    readonly id: string,
    readonly zone: string,
    readonly hostId: string,
    readonly index: number,
    view: ReadonlyData<ViewCard> | undefined,
    backImage: string | undefined,
    readonly routes: readonly InteractionObject[],
  ) {
    this.epoch = owner.epoch;
    this.seat =
      owner.sourceState.snapshot?.players.findIndex(
        (player) => player.playerId === owner.sourceState.snapshot?.me,
      ) ?? -1;
    this.view = view ?? null;
    this.hidden = this.view === null;
    this.backImage = backImage ?? null;
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
  getCanSelect(options?: RuntimeTargetOptions) {
    return this.routes.some(
      (route) =>
        route.getIsAvailable() &&
        (!options?.interaction || route.key === options.interaction) &&
        route.status === "open" &&
        route.connected &&
        route
          .getInputs()
          .some(
            (input) =>
              input.descriptor.domain.type === "cardTarget" &&
              (!options?.input || input.key === options.input) &&
              input.getIsEligible(this.id),
          ),
    );
  }
  select(options?: RuntimeTargetOptions) {
    if (this.epoch !== this.owner.epoch || this.owner.disposed) return;
    this.owner.selectCard(this.id, options);
  }
  getSelectHandler(options?: RuntimeTargetOptions) {
    return () => this.select(options);
  }
  getProps(options?: RuntimeTargetOptions) {
    return {
      type: "button" as const,
      disabled: !this.getCanSelect(options),
      "data-action": "select",
      "data-value": this.id,
      "data-interaction": options?.interaction,
      "data-input": options?.input,
      "data-eligible": this.getIsEligible(),
      "data-selected": this.getIsSelected(),
      "data-disabled": !this.getCanSelect(options),
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
    readonly hostId: string,
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
    return requireLookup(this.findCard(id), `Card in zone ${this.id}`, id);
  }
  findCard(id: string) {
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

interface RuntimeModel {
  readonly snapshot: SourceSnapshot | null;
  readonly view: SourceSnapshot["frame"]["view"] | null;
  readonly version: number | null;
  readonly connection: SourceState["connection"];
  readonly request: SourceState["request"];
  readonly failure: SourceState["failure"];
  readonly state: {
    readonly drafts: DraftMap;
    readonly activeInteraction: string | null;
  };
  readonly phase: PhaseObject;
  readonly turn: {
    readonly activePlayerIds: readonly string[];
    readonly currentPlayerId: string | null;
    readonly order: readonly string[];
    readonly isMine: boolean;
  };
  readonly me: {
    readonly id: string;
    readonly player: PlayerObject;
    getCanAct(): boolean;
  } | null;
  readonly players: RuntimeCollection<PlayerObject> & {
    readonly order: readonly string[];
    next(id: string): PlayerObject;
  };
  readonly interactions: {
    get(key: string): InteractionObject;
    find(key: string): InteractionObject | undefined;
    list(): readonly InteractionObject[];
    listAvailable(): readonly InteractionObject[];
  };
  readonly inputs: {
    get(key: string, name: string): InputObject;
    find(key: string, name: string): InputObject | undefined;
  };
  readonly zones: {
    get(id: string, hostId: string): ZoneObject;
    find(id: string, hostId: string): ZoneObject | undefined;
    getAll(): readonly ZoneObject[];
  };
  readonly cards: Pick<RuntimeCollection<CardObject>, "get" | "find">;
  readonly events: { readonly recent: SourceSnapshot["frame"]["events"] };
}
interface RuntimeCore extends RuntimeModel {
  readonly store: Pick<
    ReturnType<typeof createStore<RuntimeModel>>,
    "get" | "subscribe"
  >;
  getSnapshot(): RuntimeModel;
  getOptions(): RuntimeOptions;
  setOptions(options: RuntimeOptions): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
  assertCoverage(): void;
  inspect(): RuntimeModel;
}
interface RuntimeContext extends Omit<
  RuntimeFeatureContext,
  "game" | "getBoards"
> {
  readonly [runtimeFeatures]: RuntimeFeatureContext;
}

class Controller {
  epoch = 0;
  options: RuntimeOptions;
  localDrafts: DraftMap;
  localActive: string | null;
  disposed = false;
  readonly instance: RuntimeCore;
  readonly store: ReturnType<typeof createStore<RuntimeModel>>;
  readonly prototypes = {
    interaction: Object.create(InteractionObject.prototype) as object,
    input: Object.create(InputObject.prototype) as object,
    card: Object.create(CardObject.prototype) as object,
    zone: Object.create(ZoneObject.prototype) as object,
    board: {},
  };
  subscription: { unsubscribe(): void } | undefined;
  sourceState: SourceState;
  reportedFailures = new WeakMap<GameSource, Readonly<Error>>();
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
  building: RuntimeModel | undefined;
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
    features?: (core: RuntimeCore, context: RuntimeContext) => Features,
  ) {
    this.options = options;
    this.localDrafts = options.initialState?.drafts ?? EMPTY_DRAFTS;
    this.localActive = options.initialState?.activeInteraction ?? null;
    this.sourceState = options.source.store.get();
    const current = () => this.building ?? this.store.get();
    const root: RuntimeCore = {
      get snapshot() {
        return current().snapshot;
      },
      get view() {
        return current().view;
      },
      get version() {
        return current().version;
      },
      get connection() {
        return current().connection;
      },
      get failure() {
        return current().failure;
      },
      get request() {
        return current().request;
      },
      get state() {
        return current().state;
      },
      get phase() {
        return current().phase;
      },
      get turn() {
        return current().turn;
      },
      get me() {
        return current().me;
      },
      get players() {
        return current().players;
      },
      get interactions() {
        return current().interactions;
      },
      get inputs() {
        return current().inputs;
      },
      get zones() {
        return current().zones;
      },
      get cards() {
        return current().cards;
      },
      get events() {
        return current().events;
      },
      store: {
        get: () => this.store.get(),
        subscribe: (listener: () => void) => this.store.subscribe(listener),
      },
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
    // Keep live projections out of enumeration, spreads, and serialization.
    for (const [key, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(root),
    )) {
      if (descriptor.get) {
        Object.defineProperty(root, key, {
          enumerable: false,
          configurable: false,
        });
      }
    }
    Object.defineProperty(root, "store", {
      enumerable: false,
      configurable: false,
      writable: false,
    });
    this.instance = root;
    this.store = createStore(Object.freeze(this.build()));
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
    const boardProjections = new WeakMap<
      object,
      Readonly<Record<string, BoardTopology>>
    >();
    const runtime: RuntimeFeatureContext = {
      game: this.instance,
      getBoards: () => {
        const view = this.instance.view;
        if (view === null || typeof view !== "object" || Array.isArray(view))
          return {};
        const cached = boardProjections.get(view);
        if (cached) return cached;
        const payload: unknown = Reflect.get(view, "boards");
        const boards =
          payload === undefined
            ? {}
            : immutableCopy(BoardProjectionSchema.parse(payload));
        boardProjections.set(view, boards);
        return boards;
      },
      createBoard: (data: BoardTopology) =>
        this.object("board", {
          id: data.id,
          data: immutableCopy(data),
          game: this.instance,
        }),
      routeTarget: (target, options) => this.routeTarget(target, options),
      routeCardDrop: (cardId, target) => this.routeCardDrop(cardId, target),
      invalidate: () => {
        if (!this.disposed) this.refresh();
      },
    };
    const context: RuntimeContext = { ...runtime, [runtimeFeatures]: runtime };
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
            get: (): unknown =>
              Reflect.get(this.building ?? this.store.get(), key),
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
    this.reportSourceFailure();
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
    Object.setPrototypeOf(value, this.prototypes[hook]);
    return Object.freeze(value);
  }
  drafts() {
    if (
      this.options.state &&
      this.options.state === this.invalidControlledState
    )
      return EMPTY_DRAFTS;
    return this.options.state?.drafts ?? this.localDrafts;
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
      for (const zone of Object.values(zones).flatMap((hosts) =>
        Object.values(hosts),
      )) {
        const route = zone.playableByCardId[card]?.find(
          (value) => value.interactionKey === base.interactionKey,
        );
        if (route) return route;
      }
    }
    return base;
  }
  current(key: string) {
    return this.store.get().interactions.find(key);
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
    if (!interaction?.findInput(inputKey)) return;
    this.writeDraft(key, { ...this.drafts()[key], [inputKey]: value });
  }
  clearInput(key: string, inputKey: string) {
    if (!this.editable(key)?.findInput(inputKey)) return;
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
    const input = interaction?.findInput(inputKey);
    if (!interaction || !input?.getIsEligible(value)) return;
    if (
      isManyInput(input.descriptor) ||
      (typeof value === "string" &&
        (input.descriptor.domain.type === "cardTarget" ||
          input.descriptor.domain.type === "boardTarget"))
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
        interaction.descriptor,
        { inputKey, value },
      );
      this.writeDraft(key, next as Values);
    } else this.setInput(key, inputKey, value);
    this.activate(key);
    const current = this.current(key);
    if (
      current &&
      Object.hasOwn(this.drafts()[key] ?? EMPTY, inputKey) &&
      shouldAutoSubmitInteraction(current.descriptor) &&
      current.getIsReady()
    )
      this.handle(() => this.submit(key, false));
  }
  selectCard(id: string, options?: RuntimeTargetOptions) {
    const card = this.store.get().cards.find(id);
    if (
      !card ||
      this.sourceState.request ||
      this.sourceState.connection !== "ready"
    )
      return;
    const candidates = card.routes.flatMap((interaction) => {
      if (
        !interaction.getIsAvailable() ||
        !interaction.currentLifetime() ||
        (options?.interaction && interaction.key !== options.interaction)
      )
        return [];
      return interaction
        .getInputs()
        .filter(
          (input) =>
            input.descriptor.domain.type === "cardTarget" &&
            (!options?.input || input.key === options.input) &&
            input.getIsEligible(id),
        )
        .map((input) => ({ interaction, input }));
    });
    if (candidates.length > 1) throw new AmbiguousTargetError(id);
    const candidate = candidates[0];
    if (candidate)
      this.select(
        candidate.interaction.key,
        candidate.input.key,
        id,
        candidate.interaction,
      );
  }
  handle(submit: () => Promise<SubmitResult>) {
    const source = this.options.source;
    const active = () => !this.disposed && this.options.source === source;
    void submit().then(
      (result) => {
        if (active() && !result.accepted)
          this.options.onError?.(
            new Error(result.message ?? result.errorCode, { cause: result }),
          );
      },
      (error) => {
        if (!active()) return;
        const state = source.store.get();
        if (state.failure === error || state.connection === "closed") return;
        this.options.onError?.(error);
      },
    );
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
      version: this.sourceState.snapshot.version,
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
    if (
      this.sourceState.connection === "closed" ||
      this.sourceState.connection === "failed"
    ) {
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
  reportSourceFailure() {
    const failure = this.sourceState.failure;
    if (
      !failure ||
      !this.options.onError ||
      this.reportedFailures.get(this.options.source) === failure
    )
      return;
    this.reportedFailures.set(this.options.source, failure);
    this.options.onError?.(failure);
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
      this.reportSourceFailure();
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
    this.reportSourceFailure();
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
        const selection = input && inputSelection(input);
        if (input && selection?.mode === "many" && Array.isArray(value)) {
          const eligible = value.filter((item) =>
            inputTargetInDomain(input.domain, item),
          );
          const max = selection.max;
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
    this.sourceState = this.options.source.store.get();
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
  routeTarget(target: RuntimeSelectionTarget, options?: RuntimeTargetOptions) {
    if (target.kind === "card") {
      this.selectCard(target.value, options);
      return;
    }
    const candidates = this.lastInteractions.flatMap((interaction) =>
      interaction
        .getInputs()
        .filter(
          (input) =>
            matchesBoardTarget(input.descriptor, target) &&
            input.getIsEligible(target.value) &&
            interaction.getIsAvailable() &&
            (!options?.interaction ||
              interaction.key === options.interaction) &&
            (!options?.input || input.key === options.input),
        )
        .map((input) => ({ interaction, input })),
    );
    if (candidates.length > 1)
      throw new AmbiguousTargetError(JSON.stringify(target.value));
    const match = candidates[0];
    if (match)
      this.select(match.interaction.key, match.input.key, target.value);
  }
  routeCardDrop(cardId: string, target: RuntimeDropTarget) {
    if (
      this.disposed ||
      this.sourceState.request ||
      this.pending ||
      this.sourceState.connection !== "ready"
    )
      return;
    const card = this.store.get().cards.find(cardId);
    const interaction = card?.routes.find(
      (route) => route.key === target.interactionKey,
    );
    if (!interaction?.currentLifetime() || !interaction.getIsAvailable())
      return;
    const cardInput = interaction.findInput(target.cardInputKey);
    if (
      !cardInput ||
      cardInput.descriptor.domain.type !== "cardTarget" ||
      !cardInput.getIsEligible(cardId)
    )
      return;
    const input =
      target.kind === "interaction"
        ? undefined
        : interaction.findInput(target.inputKey);
    if (
      target.kind !== "interaction" &&
      (!input ||
        !matchesBoardTarget(input.descriptor, target) ||
        !input.getIsEligible(target.value))
    )
      return;
    let next: Record<string, unknown> = { ...this.drafts()[interaction.key] };
    const chosen = next[cardInput.key];
    // Dropping adds a card; it never toggles an already chosen card back out.
    if (
      !input &&
      isManyInput(cardInput.descriptor) &&
      Array.isArray(chosen) &&
      chosen.includes(cardId)
    ) {
      this.activate(interaction.key);
      return;
    }
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
      interaction.descriptor,
      {
        cardId,
        cardInputKey: cardInput.key,
        dropTarget:
          input && target.kind !== "interaction"
            ? { inputKey: input.key, value: target.value }
            : undefined,
      },
    );
    this.writeDraft(interaction.key, next as Values);
    this.activate(interaction.key);
    const current = this.current(interaction.key);
    if (
      current &&
      shouldAutoSubmitInteraction(current.descriptor) &&
      current.getIsReady()
    )
      this.handle(() => current.submit());
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
  build(previous?: RuntimeModel): RuntimeModel {
    this.trackDrafts();
    const { snapshot, connection, request, failure } = this.sourceState;
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
            get: (id: string) =>
              requireLookup(
                playerObjects.find((p) => p.id === id),
                "Player",
                id,
              ),
            find: (id: string) => playerObjects.find((p) => p.id === id),
            getAll: () => playerObjects,
            next: (id: string) => {
              const index = playerObjects.findIndex((p) => p.id === id);
              return requireLookup(
                index < 0
                  ? undefined
                  : playerObjects[(index + 1) % playerObjects.length],
                "Next player after",
                id,
              );
            },
          };
    const me =
      sameActors && previous
        ? previous.me
        : snapshot
          ? {
              id: snapshot.me,
              player: players.get(snapshot.me),
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
            return requireLookup(
              interactionObjects.find((value) => value.key === key),
              "Interaction",
              key,
            );
          },
          find: (key: string) => {
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
              requireLookup(
                interactions.find(key)?.findInput(name),
                `Input in interaction ${key}`,
                name,
              ),
            find: (key: string, name: string) =>
              interactions.find(key)?.findInput(name),
          };
    const zonesSame = sameSnapshot && interactionsSame && previous;
    const zones = zonesSame
      ? previous.zones
      : (() => {
          const objects = Object.entries(snapshot?.frame.zones ?? {}).flatMap(
            ([id, hosts]) =>
              Object.entries(hosts).map(([hostId, zone]) =>
                this.object(
                  "zone",
                  new ZoneObject(
                    this,
                    id,
                    hostId,
                    Object.freeze(
                      zone.cardIds.map((cardId, index) =>
                        this.object(
                          "card",
                          new CardObject(
                            this,
                            cardId,
                            id,
                            hostId,
                            index,
                            zone.cardViewsById[cardId],
                            zone.cardBacksById[cardId],
                            Object.freeze(
                              (zone.playableByCardId[cardId] ?? []).map(
                                (descriptor) =>
                                  this.object(
                                    "interaction",
                                    new InteractionObject(
                                      this,
                                      descriptor,
                                      drafts[descriptor.interactionKey] ??
                                        EMPTY,
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
              ),
          );
          const find = (id: string, hostId: string) =>
            objects.find((zone) => zone.id === id && zone.hostId === hostId);
          return {
            get: (id: string, hostId: string) =>
              requireLookup(find(id, hostId), "Zone", id),
            find,
            getAll: () => Object.freeze(objects),
          };
        })();
    const cards = zonesSame
      ? previous.cards
      : {
          get: (id: string) =>
            requireLookup(
              zones
                .getAll()
                .map((zone) => zone.findCard(id))
                .find((card) => card !== undefined),
              "Card",
              id,
            ),
          find: (id: string) =>
            zones
              .getAll()
              .map((zone) => zone.findCard(id))
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
    const model: RuntimeModel = {
      snapshot,
      view: snapshot?.frame.view ?? null,
      version: snapshot?.version ?? null,
      connection,
      request,
      failure,
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
    };
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
    // Composition boundary: callers bind this source and feature callbacks to G.
    // Runtime classes keep concrete descriptor contracts; only this facade exposes G/F.
    const controller = new Controller(
      options as RuntimeOptions,
      options.features as
        ((core: RuntimeCore, context: RuntimeContext) => Features) | undefined,
    );
    // eslint-disable-next-line no-restricted-syntax -- Controller construction binds this source and feature map to the public G/F/S facade.
    return controller.instance as unknown as GameInstance<G, F, S>;
  };
}
