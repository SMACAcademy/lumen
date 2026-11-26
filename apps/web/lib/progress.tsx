"use client";

import {
  ProgressStore,
  type Snapshot,
  browserAdapter,
  emptySnapshot,
  memoryAdapter,
} from "@ise/progress-store";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

/** Stable empty snapshot for server rendering and the first paint. */
const EMPTY = emptySnapshot();

interface ProgressContextValue {
  store: ProgressStore;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/**
 * Owns the one progress store for the session. Storage is read asynchronously,
 * so screens render an empty snapshot first and should wait for `loaded`
 * before showing anything personal.
 */
export function ProgressProvider({ children, store: provided }: { children: React.ReactNode; store?: ProgressStore }) {
  const [store] = useState(() => provided ?? new ProgressStore(browserAdapter(() => memoryAdapter())));

  // Opening the app counts as activity: it keeps a streak alive on a day spent browsing.
  useEffect(() => {
    void store.appendOncePerDay({ type: "day-active", payload: {} });
  }, [store]);

  return <ProgressContext.Provider value={{ store }}>{children}</ProgressContext.Provider>;
}

/**
 * Outside a provider (isolated component tests, a stray render) progress still
 * works — it just lives for the session instead of being saved.
 */
let sessionStore: ProgressStore | null = null;

export function useProgressStore(): ProgressStore {
  const value = useContext(ProgressContext);
  return value?.store ?? (sessionStore ??= new ProgressStore(memoryAdapter()));
}

export interface ProgressView {
  snapshot: Snapshot;
  /** False until stored progress has been read; screens show skeletons meanwhile. */
  loaded: boolean;
  store: ProgressStore;
}

export function useProgress(): ProgressView {
  const store = useProgressStore();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => EMPTY,
  );
  const loaded = useSyncExternalStore(
    store.subscribe,
    () => store.isLoaded(),
    () => false,
  );
  return { snapshot, loaded, store };
}
