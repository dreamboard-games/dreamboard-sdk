import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { useShallow } from "zustand/shallow";

type Draft = Readonly<Record<string, unknown>>;

const EMPTY_DRAFT: Draft = Object.freeze({});

function omitRecordKey<Value>(
  record: Readonly<Record<string, Value>>,
  key: string,
): Readonly<Record<string, Value>> {
  const next: Record<string, Value> = { ...record };
  delete next[key];
  return next;
}

interface DraftState {
  drafts: Readonly<Record<string, Draft>>;
  arms: Readonly<Record<string, string>>;
  submitting: Readonly<Record<string, true>>;
  pendingInteractionKey: string | null;
  pendingInteractionRevision: number;
}

/**
 * Imperative API exposed to interaction primitives.
 * Intentionally small; the vanilla zustand store underneath powers
 * fine-grained subscriptions via {@link useDraft} and {@link useArmed}.
 */
export interface InteractionUiStore {
  /** Read the current draft for an interaction id. Never undefined. */
  getDraft(interactionId: string): Draft;
  /** Merge a single input key into the draft. Creates the draft if needed. */
  setInput(interactionId: string, key: string, value: unknown): void;
  /** Clear a single input, or the whole draft if `key` is omitted. */
  clearInput(interactionId: string, key?: string): void;
  /** Clear every draft and arming state. */
  clearAll(): void;
  /** Which interaction (if any) is currently armed on the given surface. */
  getArmed(surface: string): string | null;
  /** Arm a specific interaction on a surface. Pass `null` to disarm. */
  arm(surface: string, interactionId: string | null): void;
  /** Which interaction draft currently needs route-owned remaining input UI. */
  getPendingInteraction(): string | null;
  /** Mark the interaction draft currently waiting for remaining input. */
  setPendingInteraction(interactionId: string | null): void;
  /** Monotonic revision bumped whenever a pending interaction is routed. */
  getPendingInteractionRevision(): number;
  /** True while a local submission is in flight before the host echo arrives. */
  isSubmitting(interactionId: string): boolean;
  /** Atomically mark a submission in flight. Returns false if already busy. */
  claimSubmitting(interactionId: string): boolean;
  /** Mark or clear a local submission in flight. */
  setSubmitting(interactionId: string, submitting: boolean): void;
}

/** Vanilla zustand store implementing {@link InteractionUiStore}. */
export type InteractionUiStoreApi = StoreApi<DraftState> & InteractionUiStore;

export function createInteractionUiStore(): InteractionUiStoreApi {
  const store = createStore<DraftState>()(() => ({
    drafts: {},
    arms: {},
    submitting: {},
    pendingInteractionKey: null,
    pendingInteractionRevision: 0,
  }));

  const api: InteractionUiStore = {
    getDraft(interactionId) {
      return store.getState().drafts[interactionId] ?? EMPTY_DRAFT;
    },
    setInput(interactionId, key, value) {
      store.setState((prev) => {
        const current = prev.drafts[interactionId];
        if (current && current[key] === value) return prev;
        return {
          ...prev,
          drafts: {
            ...prev.drafts,
            [interactionId]: { ...(current ?? {}), [key]: value },
          },
        };
      });
    },
    clearInput(interactionId, key) {
      store.setState((prev) => {
        const current = prev.drafts[interactionId];
        if (!current) return prev;
        if (key === undefined) {
          return { ...prev, drafts: omitRecordKey(prev.drafts, interactionId) };
        }
        if (!(key in current)) return prev;
        const remainingKeys = omitRecordKey(current, key);
        if (Object.keys(remainingKeys).length === 0) {
          return { ...prev, drafts: omitRecordKey(prev.drafts, interactionId) };
        }
        return {
          ...prev,
          drafts: { ...prev.drafts, [interactionId]: remainingKeys },
        };
      });
    },
    clearAll() {
      store.setState((prev) => {
        if (
          Object.keys(prev.drafts).length === 0 &&
          Object.keys(prev.arms).length === 0 &&
          Object.keys(prev.submitting).length === 0 &&
          prev.pendingInteractionKey === null
        ) {
          return prev;
        }
        return {
          drafts: {},
          arms: {},
          submitting: {},
          pendingInteractionKey: null,
          pendingInteractionRevision: prev.pendingInteractionRevision + 1,
        };
      });
    },
    getArmed(surface) {
      return store.getState().arms[surface] ?? null;
    },
    arm(surface, interactionId) {
      store.setState((prev) => {
        const current = prev.arms[surface] ?? null;
        if (current === interactionId) return prev;
        if (interactionId === null) {
          return { ...prev, arms: omitRecordKey(prev.arms, surface) };
        }
        return { ...prev, arms: { ...prev.arms, [surface]: interactionId } };
      });
    },
    getPendingInteraction() {
      return store.getState().pendingInteractionKey;
    },
    setPendingInteraction(interactionId) {
      store.setState((prev) => {
        if (prev.pendingInteractionKey === interactionId) {
          return interactionId === null
            ? prev
            : {
                ...prev,
                pendingInteractionRevision: prev.pendingInteractionRevision + 1,
              };
        }
        return {
          ...prev,
          pendingInteractionKey: interactionId,
          pendingInteractionRevision: prev.pendingInteractionRevision + 1,
        };
      });
    },
    getPendingInteractionRevision() {
      return store.getState().pendingInteractionRevision;
    },
    isSubmitting(interactionId) {
      return store.getState().submitting[interactionId] === true;
    },
    claimSubmitting(interactionId) {
      let claimed = false;
      store.setState((prev) => {
        if (prev.submitting[interactionId] === true) return prev;
        claimed = true;
        return {
          ...prev,
          submitting: { ...prev.submitting, [interactionId]: true },
        };
      });
      return claimed;
    },
    setSubmitting(interactionId, submitting) {
      store.setState((prev) => {
        const current = prev.submitting[interactionId] === true;
        if (current === submitting) return prev;
        if (!submitting) {
          return {
            ...prev,
            submitting: omitRecordKey(prev.submitting, interactionId),
          };
        }
        return {
          ...prev,
          submitting: { ...prev.submitting, [interactionId]: true },
        };
      });
    },
  };

  return Object.assign(store, api);
}

const InteractionUiCtx = createContext<InteractionUiStoreApi | null>(null);

/**
 * React provider that holds draft input state shared across every surface
 * inside the tree. Auto-installed by `<PluginRuntime>`; authors rarely
 * mount it directly. Mount manually when rendering surface components in
 * isolation (e.g., Storybook, snapshot tests).
 *
 * ```tsx
 * <InteractionUiProvider>
 *   <PanelSurface />
 *   <Board.Root>{...}</Board.Root>
 * </InteractionUiProvider>
 * ```
 */
export function InteractionUiProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: InteractionUiStoreApi;
}) {
  const ownedStore = useMemo(() => createInteractionUiStore(), []);
  return (
    <InteractionUiCtx.Provider value={store ?? ownedStore}>
      {children}
    </InteractionUiCtx.Provider>
  );
}

/**
 * Access the active draft store. Falls back to an inert in-memory store
 * when no provider is mounted, so surface hooks remain callable in bare
 * test harnesses without crashing — draft state simply isn't shared
 * across components in that case.
 */
export function useInteractionUiStore(): InteractionUiStoreApi {
  const ctx = useContext(InteractionUiCtx);
  const fallback = useMemo(() => createInteractionUiStore(), []);
  return ctx ?? fallback;
}

/**
 * Subscribe to the draft for a single interaction id with per-slice
 * re-renders. Returns a stable empty object when the draft is unset.
 */
export function useInteractionDraft(interactionId: string): Draft {
  const store = useInteractionUiStore();
  useStore(
    store,
    useShallow(
      (state: DraftState) => state.drafts[interactionId] ?? EMPTY_DRAFT,
    ),
  );
  return store.getDraft(interactionId);
}

/** Subscribe to the armed interaction id on a given surface. */
export function useArmedInteraction(surface: string): string | null {
  const store = useInteractionUiStore();
  return useStore(store, (state: DraftState) => state.arms[surface] ?? null);
}

/** Subscribe to the interaction draft currently waiting for pending input. */
export function usePendingInteractionKey(): string | null {
  const store = useInteractionUiStore();
  const subscribed = useStore(
    store,
    (state: DraftState) => state.pendingInteractionKey ?? null,
  );
  return store.getPendingInteraction() ?? subscribed;
}

/** Subscribe to pending interaction route attempts. */
export function usePendingInteractionRevision(): number {
  const store = useInteractionUiStore();
  const subscribed = useStore(
    store,
    (state: DraftState) => state.pendingInteractionRevision,
  );
  return Math.max(store.getPendingInteractionRevision(), subscribed);
}

/** Subscribe to local submitting status for a single interaction key. */
export function useInteractionSubmitting(interactionId: string): boolean {
  const store = useInteractionUiStore();
  return useStore(
    store,
    (state: DraftState) => state.submitting[interactionId] === true,
  );
}
